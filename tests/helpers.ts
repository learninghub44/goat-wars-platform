import { hmacHex } from '../server/crypto';
import type { DbLike } from '../server/db';
import type { Env } from '../server/types';
import type { PaystackLike, VerifyResult, InitializeParams } from '../server/paystack';
import type { AuthLike } from '../server/auth';
import type { RouterDeps } from '../server/router';

export const M1 = 'b0000000-0000-4000-8000-000000000001';
export const C1 = 'a0000000-0000-4000-8000-000000000001';
export const C2 = 'a0000000-0000-4000-8000-000000000002';
export const C_OUT = 'a0000000-0000-4000-8000-0000000000ff';
export const ADMIN_ID = 'c0000000-0000-4000-8000-000000000001';

export const env: Env = {
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
  SUPABASE_ANON_KEY: 'anon',
  PAYSTACK_SECRET_KEY: 'sk_test_secret',
  PUBLIC_SITE_URL: 'https://goat.example',
  VOTER_HASH_SALT: 'salt'
};

type Row = Record<string, any>;

/** In-memory PostgREST stand-in that mirrors the SQL functions' rules. */
export class FakeDb implements DbLike {
  tables: Record<string, Row[]> = {
    matchups: [{ id: M1, slug: 'messi-vs-ronaldo', title: 'GOAT', status: 'open', voting_type: 'paid', price_per_vote_kes: 10, max_votes_per_transaction: 100, start_date: '2026-01-01T00:00:00Z', end_date: null, is_public: true }],
    candidates: [{ id: C1, name: 'Lionel Messi' }, { id: C2, name: 'Cristiano Ronaldo' }],
    matchup_candidates: [{ matchup_id: M1, candidate_id: C1 }, { matchup_id: M1, candidate_id: C2 }],
    payments: [], vote_credits: [], free_votes: [], admin_audit_logs: [],
    admin_users: [{ user_id: ADMIN_ID }]
  };
  rateAllowed = true;
  calls: string[] = [];

  private filter(table: string, q: string): Row[] {
    const conds = q.split('&').map((p) => p.match(/^([a-z_]+)=(eq|neq)\.(.*)$/)).filter(Boolean) as RegExpMatchArray[];
    return (this.tables[table] ?? []).filter((r) => conds.every(([, c, op, val]) => (op === 'eq' ? String(r[c]) === decodeURIComponent(val) : String(r[c]) !== decodeURIComponent(val))));
  }
  async select<T>(table: string, q: string) { return this.filter(table, q) as T[]; }
  async insert<T>(table: string, row: Row) { const r = { id: `id-${this.tables[table].length + 1}`, created_at: new Date().toISOString(), ...row }; this.tables[table].push(r); return r as T; }
  async update<T>(table: string, q: string, patch: Row) { const rows = this.filter(table, q); rows.forEach((r) => Object.assign(r, patch)); return rows as T[]; }
  async remove(table: string, q: string) { const del = new Set(this.filter(table, q)); this.tables[table] = this.tables[table].filter((r) => !del.has(r)); }

  async rpc<T>(fn: string, a: Row = {}): Promise<T> {
    this.calls.push(fn);
    if (fn === 'rate_limit_hit') return this.rateAllowed as T;
    if (fn === 'api_list_debates') return [] as T;
    if (fn === 'credit_paid_votes_atomic') {
      const p = this.tables.payments.find((x) => x.reference === a.p_reference);
      if (!p) return { ok: false, status: 'not_found' } as T;
      if (p.status === 'success') return { ok: true, status: 'success', alreadyProcessed: true } as T;
      if (a.p_currency !== p.currency || a.p_verified_amount_kes !== p.amount_kes) { p.status = 'reconciliation_required'; return { ok: false, status: 'reconciliation_required' } as T; }
      const m = this.tables.matchups.find((x) => x.id === p.matchup_id)!;
      if (m.status !== 'open') { p.status = 'reconciliation_required'; p.failure_reason = 'poll_not_open_at_settlement'; return { ok: false } as T; }
      p.status = 'success';
      this.tables.vote_credits.push({ payment_id: p.id, matchup_id: p.matchup_id, candidate_id: p.candidate_id, quantity: p.quantity });
      return { ok: true, status: 'success' } as T;
    }
    if (fn === 'mark_payment_outcome') {
      const p = this.tables.payments.find((x) => x.reference === a.p_reference);
      if (p && p.status !== 'success') { p.status = a.p_status; p.failure_reason = a.p_reason; }
      return { ok: true } as T;
    }
    throw new Error('unexpected rpc ' + fn);
  }
  votesFor(candidate: string) { return this.tables.vote_credits.filter((v) => v.candidate_id === candidate).reduce((s, v) => s + v.quantity, 0); }
}

export class FakePaystack implements PaystackLike {
  initCalls: InitializeParams[] = [];
  failInit = false;
  verifyResult: VerifyResult = { ok: false };
  verifyCalls = 0;
  async initialize(p: InitializeParams) {
    if (this.failInit) throw new Error('boom');
    this.initCalls.push(p);
    return { authorizationUrl: 'https://checkout.paystack.com/abc', accessCode: 'abc', reference: p.reference };
  }
  async verify(ref: string) {
    this.verifyCalls++;
    return this.verifyResult.data ? { ...this.verifyResult, data: { ...this.verifyResult.data, reference: ref } } : this.verifyResult;
  }
}

export class FakeAuth implements AuthLike {
  users: Record<string, { id: string; email: string; password: string }> = {
    admin: { id: ADMIN_ID, email: 'admin@x.com', password: 'correct horse' },
    other: { id: 'd0000000-0000-4000-8000-000000000001', email: 'user@x.com', password: 'pw' }
  };
  private sess = (u: { id: string; email: string }) => ({ accessToken: 'tok-' + u.id, refreshToken: 'rt-' + u.id, expiresIn: 3600, user: { id: u.id, email: u.email } });
  async passwordLogin(email: string, password: string) { const u = Object.values(this.users).find((x) => x.email === email && x.password === password); return u ? this.sess(u) : null; }
  async refresh() { return null; }
  async getUser(t: string) { const u = Object.values(this.users).find((x) => 'tok-' + x.id === t); return u ? { id: u.id, email: u.email } : null; }
  async logout() {}
}

export function makeDeps() {
  const db = new FakeDb(); const paystack = new FakePaystack(); const auth = new FakeAuth();
  const deps: RouterDeps = { env, db, paystack, auth, now: () => new Date('2026-10-24T12:00:00Z') };
  return { db, paystack, auth, deps };
}

export async function signedWebhook(body: object, secret = env.PAYSTACK_SECRET_KEY) {
  const raw = JSON.stringify(body);
  const sig = await hmacHex('SHA-512', secret, raw);
  return new Request('https://goat.example/api/webhooks/paystack', { method: 'POST', body: raw, headers: { 'x-paystack-signature': sig, 'content-type': 'application/json' } });
}

export const jsonReq = (path: string, body: object, init: RequestInit & { headers?: Record<string, string> } = {}) =>
  new Request('https://goat.example' + path, { method: 'POST', body: JSON.stringify(body), ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
