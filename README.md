# GOAT Wars

Football debate and fan-poll platform (Messi vs Ronaldo, clubs, managers, title predictions).

**Stack:** React + Vite (static site) · Cloudflare Pages + Pages Functions (`/api/*`, same origin) · Supabase Postgres + Auth · Paystack (KES, M-Pesa/card).

```
Browser ──► Cloudflare Pages (static React app)
   │
   └─ /api/* ─► Pages Function (server/router.ts) ──► Supabase (service role, server-side only)
                         │  ▲                    
                         ▼  │ webhook (HMAC-SHA512) + verify API
                      Paystack
```

## Security model (short version)

| Concern | How it's handled |
|---|---|
| Price / amount | Read from the `matchups` table on the server. Anything the browser sends is ignored. |
| Counting votes | Only `credit_paid_votes_atomic()` (service role) inserts `vote_credits`, after Paystack's **verify API** confirms status, amount (integer cents) and currency. Redirects and webhook bodies are only hints. |
| Duplicates / replays | Row lock + `vote_credits.payment_id UNIQUE`. Webhook replay, refresh, and admin re-verify credit exactly once. |
| Webhook auth | `x-paystack-signature` = HMAC-SHA512(raw body, `PAYSTACK_SECRET_KEY`) checked in constant time. (Paystack has no separate webhook secret.) |
| Database access | RLS on every table with **no** anon/authenticated policies and all privileges revoked. Browsers never talk to Supabase; the browser bundle contains no Supabase key at all. |
| Admin | Supabase Auth password → server sets `HttpOnly; Secure; SameSite=Strict` cookies. Every admin request re-validates the token with Supabase **and** checks the `admin_users` allowlist. CSRF header + Origin check, login rate-limits, append-only audit log. No link to `/admin/` exists anywhere in the public site; it is `noindex`. |
| CORS | None. Same-origin only; cross-origin writes get 403. |

## 1. Supabase

1. Create a project.
2. SQL Editor → run `supabase/migrations/20261024_001_goat_wars_schema.sql`, then `supabase/seed.sql`.
   *(Use a fresh project. If you ran the old schema, reset the dev project first: `drop schema public cascade; create schema public;`.)*
3. **Authentication → Providers → Email:** turn **off** "Allow new users to sign up" (and enable "Confirm email" if you prefer).
4. **Authentication → Users → Add user** (your admin email + a long unique password).
5. Make that user an admin:
   ```sql
   insert into admin_users (user_id, email)
   select id, email from auth.users where email = 'you@yourdomain.com';
   ```
6. Copy **Project URL**, **anon** key and **service_role** key (Settings → API).

> Strongly recommended: enable MFA/Cloudflare Access in front of `/admin/*` (see Hardening).

## 2. Paystack

1. Dashboard → Settings → API Keys & Webhooks. Use **test** keys first.
2. Set the **Webhook URL** to `https://YOUR-DOMAIN/api/webhooks/paystack`.
3. Confirm KES and M-Pesa are enabled for your business, and **find your real minimum transaction** in test mode. The default price in the seed is KES 10 and `MIN_VOTE_PRICE_KES` defaults to 10; set both to what your account actually supports.

## 3. Cloudflare Pages

1. Push this repo to GitHub, then Cloudflare → Workers & Pages → Create → Pages → Connect to Git.
2. Build command `npm run build`, output directory `dist`. Add env var `NODE_VERSION=22`.
3. Settings → Environment variables (Production **and** Preview). Mark the first four as **Encrypted/secret**:

| Name | Notes |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | secret |
| `PAYSTACK_SECRET_KEY` | secret (`sk_test_…` until launch) |
| `SUPABASE_ANON_KEY` | used server-side for admin login only |
| `VOTER_HASH_SALT` | secret; `openssl rand -hex 32` |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `PUBLIC_SITE_URL` | canonical origin, e.g. `https://your-domain`, no trailing slash (used for Paystack callback and share links) |
| `VITE_PUBLIC_SITE_URL` | same value; used at **build** time for canonical/OG tags (optional) |
| `SUPPORT_EMAIL` | optional, shown on Support tab |
| `PAYSTACK_CHANNELS` | optional, e.g. `card,mobile_money` |
| `MIN_VOTE_PRICE_KES`, `MAX_PAYMENT_KES` | optional guards |

4. Deploy, then open `https://YOUR-DOMAIN/api/health` → `{"status":"ok"}`.
5. Admin dashboard: `https://YOUR-DOMAIN/admin/` (bookmark it; nothing links to it).

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars        # fill in test keys
npm run pages:dev                     # builds and serves site + /api on :8788
# or, with hot reload: run pages:dev in one terminal, `npm run dev` in another (proxies /api)
npm run typecheck && npm test
```
To test the webhook locally, expose :8788 (e.g. `cloudflared tunnel`) and set that URL in Paystack test mode.

## Images (important)

No photographs ship with this repo. The previous version used stock photos that were **not** the people named, with invented licence credits. Candidates now show a neutral monogram until you set an image.
To add a photo you have the right to use commercially: put it in `public/assets/candidates/` (or host it somewhere HTTPS), then in **Admin → Candidates** set Image URL, alt text, credit and licence. The API refuses an image without them. For the fan-card PNG to include a *remote* photo, the host must send CORS headers; same-origin `/assets/…` files always work.

## What the seed contains

Verified 24 Oct 2026: Messi vs Ronaldo (flagship), Palmer vs Bruno, Best PL Club, **2026/27** title prediction (20 clubs), Best PL Manager (Arteta, Emery, Maresca, Alonso). Removed as stale/wrong: Guardiola-at-City, the 2025/26 title poll (Arsenal won it), and unverifiable stats ("73.4% win rate", career-goal totals). Clubs and managers change: **re-check before launch** and edit in the dashboard. The title-prediction debate has no deadline; set one in Admin.

## Launch checklist

- [ ] Paystack **test mode** end-to-end: successful M-Pesa, successful card, cancelled payment, failed payment, closing the tab then returning, duplicate webhook (use Paystack "resend").
- [ ] Confirm the minimum KES amount on your account; adjust price + `MIN_VOTE_PRICE_KES`.
- [ ] Review the Terms/Privacy/About text in `LegalModal.tsx` (it is a draft of what the software does, **not legal advice**). Have counsel confirm Kenyan data-protection, consumer-protection, tax and any gaming/betting-regulation implications for paid fan polls.
- [ ] Add rights-cleared photos (or keep monograms).
- [ ] Swap to live keys; re-register the webhook if Paystack requires it for live mode.
- [ ] Set `PUBLIC_SITE_URL`, `SUPPORT_EMAIL`.
- [ ] Commit `package-lock.json` after first `npm install`, then change CI to `npm ci`.
- [ ] Add Cloudflare WAF rate-limiting rules for `/api/payments/*` and `/api/admin/session` (the app also rate-limits in Postgres).

## Hardening you may want next

- Put **Cloudflare Access** (Zero Trust) in front of `/admin/*` and `/api/admin/*` for a second factor.
- Supabase Auth TOTP MFA (the code does not yet enforce AAL2).
- Restrict webhook ingress to Paystack's published IPs at the Cloudflare firewall.
- Supabase Storage for uploaded photos (currently URL/asset-path only).
- Scheduled reconciliation: pending payments older than N minutes → Re-verify (button exists in Admin → Payments).

## Project layout

```
server/        all API logic (framework-free, unit-tested)
functions/api/ Cloudflare Pages entry: [[path]].ts → server/router.ts
src/           public React app          src/admin/  admin dashboard (separate bundle)
supabase/      migration + seed
tests/         node:test suite (npm test)
docs/          original product requirements
```
