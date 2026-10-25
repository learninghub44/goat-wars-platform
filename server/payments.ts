import { ApiError } from './http';
import { randomToken, hmacHex, sha256Hex } from './crypto';
import { eq, type DbLike } from './db';
import { kesToSubunits, subunitsToKes, type PaystackLike, type VerifyResult } from './paystack';
import type { Env } from './types';

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'abandoned' | 'reconciliation_required';

export interface PaymentRow {
  id: string;
  reference: string;
  matchup_id: string;
  candidate_id: string;
  amount_kes: number;
  unit_price_kes: number;
  quantity: number;
  currency: string;
  status: PaymentStatus;
  customer_email: string;
  failure_reason: string | null;
  created_at: string;
  verified_at: string | null;
}

interface MatchupRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  voting_type: 'free' | 'paid';
  price_per_vote_kes: number;
  max_votes_per_transaction: number;
  start_date: string | null;
  end_date: string | null;
}

export interface Deps {
  env: Env;
  db: DbLike;
  paystack: PaystackLike;
  now: () => Date;
}

export const siteUrl = (env: Env, request?: Request): string => {
  const configured = env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  if (request) return new URL(request.url).origin;
  throw new ApiError(500, 'misconfigured', 'PUBLIC_SITE_URL is not configured.');
};

export const minPriceKes = (env: Env) => Number(env.MIN_VOTE_PRICE_KES ?? 10);
export const maxPaymentKes = (env: Env) => Number(env.MAX_PAYMENT_KES ?? 150000);

export function newReference(now: Date): string {
  return `GW-${now.getTime().toString(36).toUpperCase()}-${randomToken(12)}`;
}

/* ------------------------------------------------------------------ */
/* Rate limiting (Postgres-backed so it is shared across edge isolates) */
/* ------------------------------------------------------------------ */

export async function rateLimit(deps: Pick<Deps, 'db' | 'env'>, bucket: string, subject: string, windowSeconds: number, max: number) {
  const salt = deps.env.VOTER_HASH_SALT || deps.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = `${bucket}:${await hmacHex('SHA-256', salt, subject)}`;
  const allowed = await deps.db.rpc<boolean>('rate_limit_hit', { p_key: key, p_window_seconds: windowSeconds, p_max: max });
  if (!allowed) throw new ApiError(429, 'rate_limited', 'Too many requests. Please wait a moment and try again.');
}

/* ------------------------------------------------------------------ */
/* Initialise a paid checkout                                           */
/* ------------------------------------------------------------------ */

export interface InitializeInput {
  matchupId: string;
  candidateId: string;
  quantity: number;
  email: string;
}

export async function initializePayment(deps: Deps, input: InitializeInput, request: Request) {
  const { db, env, paystack } = deps;
  const now = deps.now();

  const [matchup] = await db.select<MatchupRow>(
    'matchups',
    `select=id,slug,title,status,voting_type,price_per_vote_kes,max_votes_per_transaction,start_date,end_date&${eq('id', input.matchupId)}&is_public=eq.true`
  );
  if (!matchup) throw new ApiError(404, 'debate_not_found', 'That debate does not exist.');
  if (matchup.voting_type !== 'paid') throw new ApiError(400, 'not_paid_debate', 'This debate does not use paid voting.');
  if (matchup.status !== 'open') throw new ApiError(409, 'debate_not_open', 'Voting is not open for this debate.');
  if (matchup.start_date && now < new Date(matchup.start_date)) throw new ApiError(409, 'debate_not_started', 'Voting has not started yet.');
  if (matchup.end_date && now > new Date(matchup.end_date)) throw new ApiError(409, 'debate_closed', 'The voting deadline has passed.');

  const [member] = await db.select<{ candidate_id: string }>(
    'matchup_candidates',
    `select=candidate_id&${eq('matchup_id', matchup.id)}&${eq('candidate_id', input.candidateId)}`
  );
  if (!member) throw new ApiError(400, 'invalid_candidate', 'That candidate is not part of this debate.');

  if (input.quantity < 1 || input.quantity > matchup.max_votes_per_transaction) {
    throw new ApiError(400, 'invalid_quantity', `You can buy between 1 and ${matchup.max_votes_per_transaction} votes per payment.`);
  }

  // The price ALWAYS comes from the database. Anything the browser sent is ignored.
  const unitPriceKes = Number(matchup.price_per_vote_kes);
  if (!(unitPriceKes > 0) || unitPriceKes < minPriceKes(env)) {
    console.error('price_misconfigured', { matchup: matchup.slug, unitPriceKes, min: minPriceKes(env) });
    throw new ApiError(503, 'price_unavailable', 'Voting is temporarily unavailable for this debate.');
  }
  const unitSub = kesToSubunits(unitPriceKes);
  const totalSub = unitSub * input.quantity; // integer maths: no float drift
  const totalKes = subunitsToKes(totalSub);
  if (totalKes > maxPaymentKes(env)) throw new ApiError(400, 'amount_too_large', 'That total is above the maximum for a single payment.');

  const reference = newReference(now);
  const base = siteUrl(env, request);

  // 1. Persist a pending payment BEFORE talking to Paystack so the webhook can always find it.
  await db.insert('payments', {
    reference,
    matchup_id: matchup.id,
    candidate_id: input.candidateId,
    amount_kes: totalKes,
    unit_price_kes: unitPriceKes,
    quantity: input.quantity,
    currency: 'KES',
    status: 'pending',
    customer_email: input.email
  });

  // 2. Create the Paystack checkout.
  try {
    const channels = env.PAYSTACK_CHANNELS?.split(',').map((s) => s.trim()).filter(Boolean);
    const init = await paystack.initialize({
      email: input.email,
      amountSubunits: totalSub,
      reference,
      callbackUrl: `${base}/payment/return`,
      channels,
      metadata: { platform: 'goat-wars', matchup_id: matchup.id, candidate_id: input.candidateId, quantity: input.quantity }
    });
    await db.update('payments', eq('reference', reference), { paystack_access_code: init.accessCode });
    return { reference, authorizationUrl: init.authorizationUrl, amountKes: totalKes, unitPriceKes, quantity: input.quantity };
  } catch (err) {
    console.error('paystack_initialize_failed', (err as Error).message);
    await db.rpc('mark_payment_outcome', { p_reference: reference, p_status: 'failed', p_reason: 'paystack_initialize_failed', p_raw: null }).catch(() => {});
    throw new ApiError(502, 'payment_provider_error', 'We could not start the payment. Please try again.');
  }
}

/* ------------------------------------------------------------------ */
/* Verify + settle                                                      */
/* ------------------------------------------------------------------ */

export type Outcome =
  | { kind: 'credit'; providerReference: string; verifiedAmountKes: number; currency: string }
  | { kind: 'failed'; reason: string }
  | { kind: 'abandoned'; reason: string }
  | { kind: 'mismatch'; reason: string }
  | { kind: 'pending' };

/**
 * Pure decision function: given what we stored and what Paystack says, what should happen?
 * The amount and currency are compared in integer subunits. A redirect or webhook body is never trusted.
 */
export function classifyVerification(payment: Pick<PaymentRow, 'reference' | 'amount_kes' | 'currency'>, v: VerifyResult): Outcome {
  if (!v.ok || !v.data) return { kind: 'pending' };
  const d = v.data;
  if (d.reference !== payment.reference) return { kind: 'mismatch', reason: 'reference_mismatch' };

  switch (d.status) {
    case 'success': {
      if (d.currency !== payment.currency) return { kind: 'mismatch', reason: 'currency_mismatch' };
      if (typeof d.amount !== 'number' || d.amount !== kesToSubunits(Number(payment.amount_kes))) {
        return { kind: 'mismatch', reason: 'amount_mismatch' };
      }
      return {
        kind: 'credit',
        providerReference: String(d.id ?? payment.reference),
        verifiedAmountKes: subunitsToKes(d.amount),
        currency: d.currency
      };
    }
    case 'failed':
      return { kind: 'failed', reason: String((d as any).gateway_response || 'payment_failed').slice(0, 200) };
    case 'abandoned':
      return { kind: 'abandoned', reason: 'customer_did_not_complete' };
    default:
      // ongoing, pending, processing, queued, reversed…
      return { kind: 'pending' };
  }
}

export interface PublicPaymentStatus {
  reference: string;
  status: PaymentStatus;
  quantity: number;
  amountKes: number;
  candidate: { id: string; name: string } | null;
  debate: { id: string; slug: string; title: string } | null;
}

export async function loadPayment(db: DbLike, reference: string): Promise<PaymentRow | null> {
  const [p] = await db.select<PaymentRow>('payments', `select=*&${eq('reference', reference)}`);
  return p ?? null;
}

export async function toPublicStatus(db: DbLike, p: PaymentRow): Promise<PublicPaymentStatus> {
  const [m] = await db.select<{ id: string; slug: string; title: string }>('matchups', `select=id,slug,title&${eq('id', p.matchup_id)}`);
  const [c] = await db.select<{ id: string; name: string }>('candidates', `select=id,name&${eq('id', p.candidate_id)}`);
  return {
    reference: p.reference,
    status: p.status,
    quantity: p.quantity,
    amountKes: Number(p.amount_kes),
    candidate: c ?? null,
    debate: m ?? null
  };
}

/**
 * Independently verify with Paystack and apply the result. Safe to call any number of times
 * (return-page refresh, duplicate webhooks, admin reconcile): crediting is idempotent in the database.
 * Returns null if the reference is unknown to us.
 */
export async function settlePayment(deps: Deps, reference: string, opts: { force?: boolean } = {}): Promise<PaymentRow | null> {
  const { db, paystack } = deps;
  let payment = await loadPayment(db, reference);
  if (!payment) return null;
  if (payment.status === 'success') return payment;
  if (payment.status === 'reconciliation_required' && !opts.force) return payment;

  const verification = await paystack.verify(reference);
  const outcome = classifyVerification(payment, verification);
  const raw = verification.data ? { ...verification.data, authorization: undefined, customer: undefined, log: undefined } : null;

  switch (outcome.kind) {
    case 'credit':
      await db.rpc('credit_paid_votes_atomic', {
        p_reference: reference,
        p_provider_reference: outcome.providerReference,
        p_verified_amount_kes: outcome.verifiedAmountKes,
        p_currency: outcome.currency,
        p_raw: raw
      });
      break;
    case 'failed':
    case 'abandoned':
      await db.rpc('mark_payment_outcome', { p_reference: reference, p_status: outcome.kind, p_reason: outcome.reason, p_raw: raw });
      break;
    case 'mismatch':
      await db.rpc('mark_payment_outcome', { p_reference: reference, p_status: 'reconciliation_required', p_reason: outcome.reason, p_raw: raw });
      break;
    case 'pending':
      break;
  }

  payment = await loadPayment(db, reference);
  return payment;
}

/* ------------------------------------------------------------------ */
/* Free polls                                                           */
/* ------------------------------------------------------------------ */

export async function castFreeVote(deps: Deps, input: { matchupId: string; candidateId: string }, request: Request) {
  const salt = deps.env.VOTER_HASH_SALT;
  if (!salt) throw new ApiError(503, 'free_voting_unavailable', 'Free voting is not configured.');
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || '';

  // NOTE: this is abuse *reduction*, not proof of unique humans. Shared networks collide; VPNs evade.
  const voterHash = await hmacHex('SHA-256', salt, `${input.matchupId}|${ip}|${ua}`);
  const ipHash = await sha256Hex(`${salt}|${ip}`);

  const res = await deps.db.rpc<{ ok: boolean; status: string }>('cast_free_vote_atomic', {
    p_matchup_id: input.matchupId,
    p_candidate_id: input.candidateId,
    p_voter_hash: voterHash,
    p_ip_hash: ipHash
  });
  switch (res.status) {
    case 'recorded':
      return res;
    case 'already_voted':
      throw new ApiError(409, 'already_voted', 'A vote from this device or network has already been recorded for this debate.');
    case 'not_open':
      throw new ApiError(409, 'debate_not_open', 'Voting is not open for this debate.');
    case 'not_free':
      throw new ApiError(400, 'not_free_debate', 'This debate uses paid voting.');
    case 'invalid_candidate':
      throw new ApiError(400, 'invalid_candidate', 'That candidate is not part of this debate.');
    default:
      throw new ApiError(404, 'debate_not_found', 'That debate does not exist.');
  }
}
