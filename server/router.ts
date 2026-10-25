import { ApiError, json, errorResponse, readJson, readRawBody, clientIp, parseCookies } from './http';
import { DbError, SupabaseDb } from './db';
import { PaystackClient, verifyWebhookSignature } from './paystack';
import { SupabaseAuth, authenticateAdmin, isAdmin, sessionCookies, clearCookies, ACCESS_COOKIE, REFRESH_COOKIE, type AuthLike } from './auth';
import { adminHandlers, type AdminCtx } from './admin';
import { initializePayment, settlePayment, toPublicStatus, loadPayment, castFreeVote, rateLimit, siteUrl, type Deps } from './payments';
import * as v from './validate';
import type { Env, WaitUntilCtx } from './types';

export interface RouterDeps extends Deps {
  auth: AuthLike;
}

export function buildDeps(env: Env): RouterDeps {
  return {
    env,
    db: new SupabaseDb(env),
    paystack: new PaystackClient(env),
    auth: new SupabaseAuth(env),
    now: () => new Date()
  };
}

const REQUIRED_ENV: (keyof Env)[] = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'PAYSTACK_SECRET_KEY'];

interface RouteCtx {
  request: Request;
  url: URL;
  params: string[];
  deps: RouterDeps;
  wait?: WaitUntilCtx;
}
type Handler = (c: RouteCtx) => Promise<Response>;
interface Route {
  method: string;
  pattern: RegExp;
  handler: Handler;
}

/* ------------------------------ guards ------------------------------ */

/** Browsers always send Origin on cross-site writes. Reject anything not from our own site. */
function assertSameOrigin(request: Request, env: Env) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  if (!origin) return;
  const allowed = new Set<string>([new URL(request.url).origin]);
  if (env.PUBLIC_SITE_URL) {
    try {
      allowed.add(new URL(env.PUBLIC_SITE_URL).origin);
    } catch {
      /* ignore bad config */
    }
  }
  if (!allowed.has(origin)) throw new ApiError(403, 'bad_origin', 'Cross-site requests are not allowed.');
}

function assertCsrfHeader(request: Request) {
  if (['GET', 'HEAD'].includes(request.method)) return;
  if (request.headers.get('x-gw-csrf') !== '1') throw new ApiError(403, 'csrf', 'Missing CSRF header.');
}

/* --------------------------- public routes -------------------------- */

const publicRoutes: Route[] = [
  {
    method: 'GET',
    pattern: /^\/api\/health$/,
    handler: async () => json({ status: 'ok' })
  },
  {
    method: 'GET',
    pattern: /^\/api\/config$/,
    handler: async ({ deps, request }) =>
      json(
        { siteUrl: siteUrl(deps.env, request), supportEmail: deps.env.SUPPORT_EMAIL || null, currency: 'KES' },
        200,
        { 'cache-control': 'public, max-age=300' }
      )
  },
  {
    method: 'GET',
    pattern: /^\/api\/debates$/,
    handler: async ({ deps, url, wait }) => {
      const cache: Cache | undefined = (globalThis as any).caches?.default;
      const cacheable = cache && !url.search;
      const key = new Request(url.toString(), { method: 'GET' });
      if (cacheable) {
        const hit = await cache!.match(key);
        if (hit) return hit;
      }
      const debates = await deps.db.rpc('api_list_debates', { p_include_hidden: false });
      const res = json({ debates, generatedAt: deps.now().toISOString() }, 200, { 'cache-control': 'public, max-age=5, s-maxage=5' });
      if (cacheable) wait?.waitUntil?.(cache!.put(key, res.clone()));
      return res;
    }
  },
  {
    method: 'POST',
    pattern: /^\/api\/payments\/initialize$/,
    handler: async ({ deps, request }) => {
      const b = await readJson(request);
      const input = {
        matchupId: v.uuid(b.matchupId, 'matchupId'),
        candidateId: v.uuid(b.candidateId, 'candidateId'),
        quantity: v.intIn(b.quantity, 'quantity', 1, 1000),
        email: v.email(b.email)
      };
      // NOTE: any "amount"/"price" field in the body is deliberately never read.
      await rateLimit(deps, 'pay-init-ip', clientIp(request), 600, 20);
      await rateLimit(deps, 'pay-init-email', input.email, 600, 10);
      return json(await initializePayment(deps, input, request), 201);
    }
  },
  {
    method: 'GET',
    pattern: /^\/api\/payments\/([^/]+)\/status$/,
    handler: async ({ deps, request, params }) => {
      const reference = v.reference(params[0]);
      await rateLimit(deps, 'pay-status-ip', clientIp(request), 60, 40);
      const payment = await settlePayment(deps, reference);
      if (!payment) throw new ApiError(404, 'payment_not_found', 'We could not find that payment.');
      return json(await toPublicStatus(deps.db, payment));
    }
  },
  {
    method: 'POST',
    pattern: /^\/api\/votes\/free$/,
    handler: async ({ deps, request }) => {
      const b = await readJson(request);
      const input = { matchupId: v.uuid(b.matchupId, 'matchupId'), candidateId: v.uuid(b.candidateId, 'candidateId') };
      await rateLimit(deps, 'free-vote-ip', clientIp(request), 600, 30);
      await castFreeVote(deps, input, request);
      return json({ ok: true }, 201);
    }
  },
  {
    method: 'POST',
    pattern: /^\/api\/webhooks\/paystack$/,
    handler: async ({ deps, request }) => {
      const raw = await readRawBody(request, 256 * 1024);
      const ok = await verifyWebhookSignature(raw, request.headers.get('x-paystack-signature'), deps.env.PAYSTACK_SECRET_KEY);
      if (!ok) return errorResponse(401, 'invalid_signature', 'Invalid signature.');

      let event: any;
      try {
        event = JSON.parse(raw);
      } catch {
        return errorResponse(400, 'invalid_json', 'Invalid JSON.');
      }

      if (event?.event === 'charge.success' && typeof event?.data?.reference === 'string') {
        const ref = event.data.reference;
        if (!/^GW-[A-Z0-9]{1,12}-[A-Z0-9]{8,32}$/.test(ref)) return json({ received: true, ignored: 'foreign_reference' });
        // The webhook body is only a *hint*. We re-verify with Paystack before crediting anything.
        // Errors propagate as 5xx so Paystack retries.
        const p = await settlePayment(deps, ref);
        return json({ received: true, status: p?.status ?? 'unknown_reference' });
      }
      return json({ received: true, ignored: String(event?.event ?? 'unknown') });
    }
  }
];

/* ---------------------------- admin routes -------------------------- */

type AdminFn = (c: AdminCtx) => Promise<unknown>;
const adminRoute = (method: string, pattern: RegExp, fn: AdminFn, status = 200): Route => ({
  method,
  pattern,
  handler: async ({ request, url, params, deps }) => {
    assertCsrfHeader(request);
    const admin = await authenticateAdmin(request, deps);
    const ctx: AdminCtx = { deps, admin, ip: clientIp(request), request, body: () => readJson(request), params, query: url.searchParams };
    return json(await fn(ctx), status);
  }
});

const adminRoutes: Route[] = [
  // --- session -------------------------------------------------------
  {
    method: 'POST',
    pattern: /^\/api\/admin\/session$/,
    handler: async ({ request, deps }) => {
      assertCsrfHeader(request);
      const b = await readJson(request);
      const email = v.email(b.email);
      const password = v.reqStr(b.password, 'password', 1, 200);
      const ip = clientIp(request);
      await rateLimit(deps, 'admin-login-ip', ip, 900, 15);
      await rateLimit(deps, 'admin-login-email', email, 900, 6);

      const fail = async () => {
        await deps.db.insert('admin_audit_logs', { action: 'ADMIN_LOGIN_FAILED', target: 'admin', details: 'Failed sign-in attempt', admin_user: `anonymous:${email}`.slice(0, 100), ip_address: ip }).catch(() => {});
        // Same response whether the password is wrong or the account is not an admin: no account enumeration.
        return errorResponse(401, 'invalid_credentials', 'Email or password is incorrect.');
      };

      const session = await deps.auth.passwordLogin(email, password);
      if (!session) return fail();
      if (!(await isAdmin(deps.db, session.user.id))) {
        await deps.auth.logout(session.accessToken);
        return fail();
      }
      await deps.db.insert('admin_audit_logs', { action: 'ADMIN_LOGIN', target: 'admin', details: 'Signed in', admin_user: session.user.email, admin_user_id: session.user.id, ip_address: ip }).catch(() => {});
      const res = json({ email: session.user.email });
      for (const c of sessionCookies(session)) res.headers.append('set-cookie', c);
      return res;
    }
  },
  {
    method: 'POST',
    pattern: /^\/api\/admin\/session\/refresh$/,
    handler: async ({ request, deps }) => {
      assertCsrfHeader(request);
      const rt = parseCookies(request.headers.get('cookie'))[REFRESH_COOKIE];
      if (!rt) return errorResponse(401, 'unauthenticated', 'Sign in required.');
      const session = await deps.auth.refresh(rt);
      if (!session || !(await isAdmin(deps.db, session.user.id))) {
        const res = errorResponse(401, 'unauthenticated', 'Your session has expired. Sign in again.');
        for (const c of clearCookies()) res.headers.append('set-cookie', c);
        return res;
      }
      const res = json({ email: session.user.email });
      for (const c of sessionCookies(session)) res.headers.append('set-cookie', c);
      return res;
    }
  },
  {
    method: 'GET',
    pattern: /^\/api\/admin\/session$/,
    handler: async ({ request, deps }) => {
      const admin = await authenticateAdmin(request, deps);
      return json({ email: admin.email });
    }
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/admin\/session$/,
    handler: async ({ request, deps }) => {
      assertCsrfHeader(request);
      const token = parseCookies(request.headers.get('cookie'))[ACCESS_COOKIE];
      if (token) await deps.auth.logout(token);
      const res = json({ ok: true });
      for (const c of clearCookies()) res.headers.append('set-cookie', c);
      return res;
    }
  },

  // --- data ----------------------------------------------------------
  adminRoute('GET', /^\/api\/admin\/overview$/, adminHandlers.overview),
  adminRoute('GET', /^\/api\/admin\/debates$/, adminHandlers.listDebates),
  adminRoute('POST', /^\/api\/admin\/debates$/, adminHandlers.createDebate, 201),
  adminRoute('PATCH', /^\/api\/admin\/debates\/([^/]+)$/, adminHandlers.updateDebate),
  adminRoute('POST', /^\/api\/admin\/debates\/([^/]+)\/candidates$/, adminHandlers.attachCandidate, 201),
  adminRoute('DELETE', /^\/api\/admin\/debates\/([^/]+)\/candidates\/([^/]+)$/, adminHandlers.detachCandidate),
  adminRoute('GET', /^\/api\/admin\/candidates$/, adminHandlers.listCandidates),
  adminRoute('POST', /^\/api\/admin\/candidates$/, adminHandlers.createCandidate, 201),
  adminRoute('PATCH', /^\/api\/admin\/candidates\/([^/]+)$/, adminHandlers.updateCandidate),
  adminRoute('GET', /^\/api\/admin\/payments$/, adminHandlers.listPayments),
  adminRoute('POST', /^\/api\/admin\/payments\/([^/]+)\/reconcile$/, adminHandlers.reconcilePayment),
  adminRoute('GET', /^\/api\/admin\/audit$/, adminHandlers.listAudit)
];

const routes = [...publicRoutes, ...adminRoutes];

/* ------------------------------ entry ------------------------------ */

function mapError(e: unknown): Response {
  if (e instanceof ApiError) return errorResponse(e.status, e.code, e.message);
  if (e instanceof DbError) {
    console.error('db_error', e.status, e.pgCode, e.message);
    if (e.pgCode === '23505') return errorResponse(409, 'conflict', 'That already exists.');
    if (e.pgCode === '23503') return errorResponse(409, 'conflict', 'That change conflicts with related records.');
    if (e.pgCode === '23514' || e.pgCode === '22P02' || e.pgCode === '23502') return errorResponse(400, 'invalid_request', 'One of the values is not allowed.');
    return errorResponse(500, 'server_error', 'Something went wrong. Please try again.');
  }
  console.error('unhandled_error', (e as Error)?.stack || e);
  return errorResponse(500, 'server_error', 'Something went wrong. Please try again.');
}

export async function handleRequest(request: Request, env: Env, wait?: WaitUntilCtx, overrides?: Partial<RouterDeps>): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 }); // same-origin only: no CORS headers

    const missing = REQUIRED_ENV.filter((k) => !env[k]);
    if (missing.length && !overrides) {
      console.error('misconfigured: missing env', missing.join(','));
      return errorResponse(500, 'misconfigured', 'The server is not configured.');
    }

    const isWebhook = url.pathname === '/api/webhooks/paystack';
    if (!isWebhook) assertSameOrigin(request, env);

    const deps: RouterDeps = { ...buildDeps(env), ...overrides } as RouterDeps;

    for (const r of routes) {
      if (r.method !== request.method) continue;
      const m = url.pathname.match(r.pattern);
      if (!m) continue;
      return await r.handler({ request, url, params: m.slice(1).map(decodeURIComponent), deps, wait });
    }
    // Same path but wrong method?
    if (routes.some((r) => r.pattern.test(url.pathname))) return errorResponse(405, 'method_not_allowed', 'Method not allowed.');
    return errorResponse(404, 'not_found', 'Not found.');
  } catch (e) {
    return mapError(e);
  }
}

export { loadPayment };
