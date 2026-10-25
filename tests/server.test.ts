import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../server/router';
import { verifyWebhookSignature, kesToSubunits } from '../server/paystack';
import { hmacHex } from '../server/crypto';
import { classifyVerification, initializePayment, settlePayment, newReference } from '../server/payments';
import { ApiError } from '../server/http';
import { env, makeDeps, signedWebhook, jsonReq, M1, C1, C2, C_OUT, ADMIN_ID } from './helpers';

const payment = { reference: 'GW-ABC-ABCDEFGHJKMN', amount_kes: 50, currency: 'KES' };
const ok = (over: object = {}) => ({ ok: true, data: { reference: payment.reference, status: 'success', amount: 5000, currency: 'KES', id: 99, ...over } });
const req = (b: object) => new Request('https://goat.example/api/payments/initialize', { method: 'POST', body: JSON.stringify(b), headers: { 'content-type': 'application/json' } });
const base = { matchupId: M1, candidateId: C1, quantity: 2, email: 'fan@example.com' };

describe('webhook signature (HMAC-SHA512 of raw body, secret key)', () => {
  test('accepts a correct signature', async () => {
    const sig = await hmacHex('SHA-512', 'sk', '{"a":1}');
    assert.equal(await verifyWebhookSignature('{"a":1}', sig, 'sk'), true);
  });
  test('rejects wrong secret, tampered body, missing header', async () => {
    const sig = await hmacHex('SHA-512', 'sk', '{"a":1}');
    assert.equal(await verifyWebhookSignature('{"a":1}', sig, 'other'), false);
    assert.equal(await verifyWebhookSignature('{"a":2}', sig, 'sk'), false);
    assert.equal(await verifyWebhookSignature('{"a":1}', null, 'sk'), false);
  });
});

describe('classifyVerification', () => {
  test('matching success → credit', () => assert.equal(classifyVerification(payment, ok()).kind, 'credit'));
  test('amount mismatch', () => assert.deepEqual(classifyVerification(payment, ok({ amount: 4000 })), { kind: 'mismatch', reason: 'amount_mismatch' }));
  test('currency mismatch', () => assert.equal((classifyVerification(payment, ok({ currency: 'USD' })) as any).reason, 'currency_mismatch'));
  test('reference mismatch', () => assert.equal((classifyVerification(payment, ok({ reference: 'GW-X-YYYYYYYYYY' })) as any).reason, 'reference_mismatch'));
  test('failed / abandoned / ongoing / unknown', () => {
    assert.equal(classifyVerification(payment, ok({ status: 'failed' })).kind, 'failed');
    assert.equal(classifyVerification(payment, ok({ status: 'abandoned' })).kind, 'abandoned');
    assert.equal(classifyVerification(payment, ok({ status: 'ongoing' })).kind, 'pending');
    assert.equal(classifyVerification(payment, { ok: false }).kind, 'pending');
  });
  test('KES→subunits has no float drift', () => assert.equal(kesToSubunits(10.1) * 3, 3030));
});

describe('initializePayment', () => {
  test('server sets the price; Paystack gets integer cents; pending row saved first', async () => {
    const { deps, db, paystack } = makeDeps();
    const res = await initializePayment(deps, base, req({}));
    assert.equal(res.amountKes, 20);
    assert.equal(paystack.initCalls[0].amountSubunits, 2000);
    assert.equal(paystack.initCalls[0].callbackUrl, 'https://goat.example/payment/return');
    assert.equal(db.tables.payments[0].status, 'pending');
    assert.equal(db.votesFor(C1), 0, 'no votes before verified payment');
  });
  test('browser-supplied amount/price is ignored end to end', async () => {
    const { deps, paystack } = makeDeps();
    const r = await handleRequest(req({ ...base, amount: 1, price: 0.01, amountKes: 1 }), env, undefined, deps);
    assert.equal(r.status, 201);
    assert.equal(paystack.initCalls[0].amountSubunits, 2000);
  });
  test('rejects closed debate, foreign candidate, bad quantity, low price', async () => {
    for (const [mut, code] of [
      [(d: any) => (d.tables.matchups[0].status = 'closed'), 'debate_not_open'],
      [(d: any) => (d.tables.matchups[0].end_date = '2026-01-02T00:00:00Z'), 'debate_closed'],
      [(d: any) => (d.tables.matchups[0].voting_type = 'free'), 'not_paid_debate'],
      [(d: any) => (d.tables.matchups[0].price_per_vote_kes = 1), 'price_unavailable']
    ] as const) {
      const { deps, db } = makeDeps(); mut(db);
      await assert.rejects(initializePayment(deps, base, req({})), (e: ApiError) => e.code === code);
    }
    const { deps } = makeDeps();
    await assert.rejects(initializePayment(deps, { ...base, candidateId: C_OUT }, req({})), (e: ApiError) => e.code === 'invalid_candidate');
    await assert.rejects(initializePayment(deps, { ...base, quantity: 101 }, req({})), (e: ApiError) => e.code === 'invalid_quantity');
  });
  test('Paystack outage marks the payment failed and returns 502', async () => {
    const { deps, db, paystack } = makeDeps(); paystack.failInit = true;
    await assert.rejects(initializePayment(deps, base, req({})), (e: ApiError) => e.status === 502);
    assert.equal(db.tables.payments[0].status, 'failed');
  });
  test('references are unique and unguessable-length', () => {
    const a = newReference(new Date()), b = newReference(new Date());
    assert.notEqual(a, b); assert.match(a, /^GW-[A-Z0-9]+-[A-Z0-9]{12}$/);
  });
});

describe('settle + webhook: votes are credited only after verified payment, exactly once', () => {
  async function pending() {
    const t = makeDeps();
    const r = await initializePayment(t.deps, { ...base, quantity: 5 }, req({}));
    return { ...t, ref: r.reference };
  }
  test('verified success credits once; repeated settles do not double-count', async () => {
    const { deps, db, paystack, ref } = await pending();
    paystack.verifyResult = ok({ amount: 5000 });
    await settlePayment(deps, ref); await settlePayment(deps, ref); await settlePayment(deps, ref);
    assert.equal(db.votesFor(C1), 5);
    assert.equal(db.tables.payments[0].status, 'success');
    assert.equal(paystack.verifyCalls, 1, 'no re-verification once final');
  });
  test('redirect with no paid transaction credits nothing', async () => {
    const { deps, db, paystack, ref } = await pending();
    paystack.verifyResult = { ok: false };
    const p = await settlePayment(deps, ref);
    assert.equal(p?.status, 'pending'); assert.equal(db.votesFor(C1), 0);
  });
  test('underpayment is parked for reconciliation, not credited', async () => {
    const { deps, db, paystack, ref } = await pending();
    paystack.verifyResult = ok({ amount: 1000 });
    await settlePayment(deps, ref);
    assert.equal(db.tables.payments[0].status, 'reconciliation_required'); assert.equal(db.votesFor(C1), 0);
  });
  test('failed and abandoned are recorded; a later success can still credit', async () => {
    const { deps, db, paystack, ref } = await pending();
    paystack.verifyResult = ok({ status: 'abandoned' }); await settlePayment(deps, ref);
    assert.equal(db.tables.payments[0].status, 'abandoned');
    paystack.verifyResult = ok({ amount: 5000 }); await settlePayment(deps, ref);
    assert.equal(db.votesFor(C1), 5);
  });
  test('a paid-then-poll-paused payment is parked, never silently dropped', async () => {
    const { deps, db, paystack, ref } = await pending();
    db.tables.matchups[0].status = 'paused'; paystack.verifyResult = ok({ amount: 5000 });
    await settlePayment(deps, ref);
    assert.equal(db.tables.payments[0].status, 'reconciliation_required'); assert.equal(db.votesFor(C1), 0);
  });
  test('webhook: bad signature → 401, no verify call, no votes', async () => {
    const { deps, db, paystack, ref } = await pending();
    const r = await handleRequest(await signedWebhook({ event: 'charge.success', data: { reference: ref } }, 'wrong'), env, undefined, deps);
    assert.equal(r.status, 401); assert.equal(paystack.verifyCalls, 0); assert.equal(db.votesFor(C1), 0);
  });
  test('webhook: valid signature but Paystack says not paid → nothing credited (body is only a hint)', async () => {
    const { deps, db, paystack, ref } = await pending();
    paystack.verifyResult = ok({ status: 'failed' });
    const r = await handleRequest(await signedWebhook({ event: 'charge.success', data: { reference: ref, amount: 5000, status: 'success' } }), env, undefined, deps);
    assert.equal(r.status, 200); assert.equal(db.votesFor(C1), 0);
  });
  test('webhook: replayed 3× credits exactly once', async () => {
    const { deps, db, paystack, ref } = await pending();
    paystack.verifyResult = ok({ amount: 5000 });
    for (let i = 0; i < 3; i++) assert.equal((await handleRequest(await signedWebhook({ event: 'charge.success', data: { reference: ref } }), env, undefined, deps)).status, 200);
    assert.equal(db.votesFor(C1), 5);
  });
  test('webhook: foreign reference and other events are acknowledged and ignored', async () => {
    const { deps, paystack } = await pending();
    assert.equal((await handleRequest(await signedWebhook({ event: 'charge.success', data: { reference: 'some-other-app' } }), env, undefined, deps)).status, 200);
    assert.equal((await handleRequest(await signedWebhook({ event: 'transfer.success', data: {} }), env, undefined, deps)).status, 200);
    assert.equal(paystack.verifyCalls, 0);
  });
  test('webhook: infrastructure failure → 5xx so Paystack retries', async () => {
    const { deps, paystack, ref } = await pending();
    paystack.verify = async () => { throw new Error('network'); };
    assert.equal((await handleRequest(await signedWebhook({ event: 'charge.success', data: { reference: ref } }), env, undefined, deps)).status, 500);
  });
  test('public status endpoint never leaks the email', async () => {
    const { deps, ref } = await pending();
    const r = await handleRequest(new Request(`https://goat.example/api/payments/${ref}/status`), env, undefined, deps);
    const text = await r.text();
    assert.equal(r.status, 200); assert.ok(!text.includes('fan@example.com'));
  });
});

describe('abuse + admin security', () => {
  test('rate limit → 429', async () => {
    const { deps, db } = makeDeps(); db.rateAllowed = false;
    assert.equal((await handleRequest(req(base), env, undefined, deps)).status, 429);
  });
  test('cross-origin POST is refused', async () => {
    const { deps } = makeDeps();
    const r = await handleRequest(jsonReq('/api/payments/initialize', base, { headers: { origin: 'https://evil.example' } }), env, undefined, deps);
    assert.equal(r.status, 403);
  });
  test('no CORS wildcard is ever sent', async () => {
    const { deps } = makeDeps();
    const r = await handleRequest(new Request('https://goat.example/api/debates'), env, undefined, deps);
    assert.equal(r.headers.get('access-control-allow-origin'), null);
  });
  test('admin API: anonymous → 401; non-admin Supabase user → 403', async () => {
    const { deps } = makeDeps();
    assert.equal((await handleRequest(new Request('https://goat.example/api/admin/overview'), env, undefined, deps)).status, 401);
    const r = await handleRequest(new Request('https://goat.example/api/admin/overview', { headers: { cookie: 'gw_admin=tok-d0000000-0000-4000-8000-000000000001' } }), env, undefined, deps);
    assert.equal(r.status, 403);
  });
  test('admin writes require the CSRF header even with a valid cookie', async () => {
    const { deps } = makeDeps();
    const r = await handleRequest(jsonReq('/api/admin/debates', {}, { headers: { cookie: `gw_admin=tok-${ADMIN_ID}` } }), env, undefined, deps);
    assert.equal(r.status, 403);
  });
  test('admin login: wrong password and non-admin get the same generic 401; success sets HttpOnly Secure SameSite=Strict cookies', async () => {
    const { deps } = makeDeps(); const h = { 'x-gw-csrf': '1' };
    const bad = await handleRequest(jsonReq('/api/admin/session', { email: 'admin@x.com', password: 'nope' }, { headers: h }), env, undefined, deps);
    const nonAdmin = await handleRequest(jsonReq('/api/admin/session', { email: 'user@x.com', password: 'pw' }, { headers: h }), env, undefined, deps);
    assert.equal(bad.status, 401); assert.equal(nonAdmin.status, 401);
    assert.equal(await bad.text(), await nonAdmin.text());
    const good = await handleRequest(jsonReq('/api/admin/session', { email: 'admin@x.com', password: 'correct horse' }, { headers: h }), env, undefined, deps);
    assert.equal(good.status, 200);
    const cookies = good.headers.getSetCookie();
    assert.ok(cookies.length === 2 && cookies.every((c) => /HttpOnly/.test(c) && /Secure/.test(c) && /SameSite=Strict/.test(c)));
  });
  test('admin can create a debate; invalid input and image-without-licence are refused; action is audited', async () => {
    const { deps, db } = makeDeps(); const h = { cookie: `gw_admin=tok-${ADMIN_ID}`, 'x-gw-csrf': '1' };
    const good = { title: 'New debate', slug: 'new-debate', category: 'clubs', categoryLabel: 'CLUB', question: 'Which one?', description: 'd', supportingText: 's', pricePerVoteKes: 10 };
    db.insert = async (t: string, r: any) => { (db.tables[t] ??= []).push({ id: 'new', ...r }); return { id: 'new', ...r } as any; };
    assert.equal((await handleRequest(jsonReq('/api/admin/debates', good, { headers: h }), env, undefined, deps)).status, 201);
    assert.ok(db.tables.admin_audit_logs.some((l) => l.action === 'CREATE_DEBATE'));
    assert.equal((await handleRequest(jsonReq('/api/admin/debates', { ...good, slug: 'Bad Slug!' }, { headers: h }), env, undefined, deps)).status, 400);
    assert.equal((await handleRequest(jsonReq('/api/admin/candidates', { name: 'X', imageUrl: 'https://img.example/x.jpg' }, { headers: h }), env, undefined, deps)).status, 400);
    assert.equal((await handleRequest(jsonReq('/api/admin/candidates', { name: 'X', imageUrl: 'javascript:alert(1)' }, { headers: h }), env, undefined, deps)).status, 400);
  });
});

test('free vote needs VOTER_HASH_SALT and calls the atomic function', async () => {
  const { deps, db } = makeDeps();
  (db as any).rpc = async (fn: string) => (fn === 'rate_limit_hit' ? true : { ok: true, status: 'recorded' });
  const r = await handleRequest(jsonReq('/api/votes/free', { matchupId: M1, candidateId: C2 }), env, undefined, deps);
  assert.equal(r.status, 201);
  const r2 = await handleRequest(jsonReq('/api/votes/free', { matchupId: M1, candidateId: C2 }), env, undefined, { ...deps, env: { ...env, VOTER_HASH_SALT: undefined } });
  assert.equal(r2.status, 503);
});
