/** Runtime configuration. Everything here is server-only (Cloudflare Pages Functions env / secrets). */
export interface Env {
  /** https://<project>.supabase.co */
  SUPABASE_URL: string;
  /** Service-role key. SECRET. Bypasses RLS. Never ship to the browser. */
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Public (anon / publishable) key. Used server-side only, for the admin password grant. */
  SUPABASE_ANON_KEY: string;
  /** Paystack secret key (sk_test_… / sk_live_…). SECRET. Also signs webhooks. */
  PAYSTACK_SECRET_KEY: string;
  /** Canonical public origin, e.g. https://example.com (no trailing slash). */
  PUBLIC_SITE_URL?: string;
  /** Shown to supporters on the support tab. Optional. */
  SUPPORT_EMAIL?: string;
  /** Optional comma list: card,mobile_money,bank_transfer. Omit to use the channels enabled on your Paystack account. */
  PAYSTACK_CHANNELS?: string;
  /** Refuse to charge when a debate price is below this (KES). Default 10. Set after testing your account's real minimum. */
  MIN_VOTE_PRICE_KES?: string;
  /** Hard ceiling for a single payment (KES). Default 150000 (M-Pesa per-transaction cap). */
  MAX_PAYMENT_KES?: string;
  /** Random secret used to hash voters for free polls and rate limits. Required for free polls. */
  VOTER_HASH_SALT?: string;
}

export interface WaitUntilCtx {
  waitUntil?(promise: Promise<unknown>): void;
}

export type FetchFn = typeof fetch;
