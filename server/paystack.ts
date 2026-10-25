import { hmacHex, timingSafeEqual } from './crypto';
import type { Env, FetchFn } from './types';

const API = 'https://api.paystack.co';

/** KES → Paystack subunits (cents). Integer maths only. */
export const kesToSubunits = (kes: number): number => Math.round(kes * 100);
export const subunitsToKes = (sub: number): number => sub / 100;

/**
 * Paystack signs the raw webhook body with your SECRET key using HMAC-SHA512 and sends the hex digest
 * in `x-paystack-signature`. (There is no separate "webhook secret".)
 */
export async function verifyWebhookSignature(rawBody: string, signature: string | null, secretKey: string): Promise<boolean> {
  if (!signature || !secretKey) return false;
  const expected = await hmacHex('SHA-512', secretKey, rawBody);
  return timingSafeEqual(expected, signature.trim().toLowerCase());
}

export interface InitializeParams {
  email: string;
  amountSubunits: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
  channels?: string[];
}

export interface InitializeResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface VerifyData {
  id?: number | string;
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  [k: string]: unknown;
}

export interface VerifyResult {
  /** Paystack API call itself succeeded (status:true). false e.g. when the reference is unknown to Paystack. */
  ok: boolean;
  message?: string;
  data?: VerifyData;
}

export interface PaystackLike {
  initialize(p: InitializeParams): Promise<InitializeResult>;
  verify(reference: string): Promise<VerifyResult>;
}

export class PaystackError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'PaystackError';
  }
}

export class PaystackClient implements PaystackLike {
  constructor(
    private readonly env: Pick<Env, 'PAYSTACK_SECRET_KEY'>,
    private readonly f: FetchFn = (...a) => fetch(...a)
  ) {}

  private headers() {
    return { authorization: `Bearer ${this.env.PAYSTACK_SECRET_KEY}`, 'content-type': 'application/json' };
  }

  async initialize(p: InitializeParams): Promise<InitializeResult> {
    const body: Record<string, unknown> = {
      email: p.email,
      amount: p.amountSubunits,
      currency: 'KES',
      reference: p.reference,
      callback_url: p.callbackUrl,
      metadata: p.metadata
    };
    if (p.channels && p.channels.length) body.channels = p.channels;

    const res = await this.f(`${API}/transaction/initialize`, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok || j?.status !== true || !j?.data?.authorization_url) {
      throw new PaystackError(j?.message || `Paystack initialize failed (${res.status})`, res.status);
    }
    return { authorizationUrl: j.data.authorization_url, accessCode: j.data.access_code, reference: j.data.reference };
  }

  async verify(reference: string): Promise<VerifyResult> {
    const res = await this.f(`${API}/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET', headers: this.headers() });
    const j: any = await res.json().catch(() => ({}));
    // 404 "Transaction reference not found" is a normal state for a checkout the user never opened.
    if (res.status === 404 || (res.ok && j?.status === false)) return { ok: false, message: j?.message };
    if (!res.ok) throw new PaystackError(j?.message || `Paystack verify failed (${res.status})`, res.status);
    return { ok: j?.status === true, message: j?.message, data: j?.data };
  }
}
