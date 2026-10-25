import { ApiError, parseCookies } from './http';
import { eq, type DbLike } from './db';
import type { Env, FetchFn } from './types';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; email: string };
}

export interface AuthLike {
  passwordLogin(email: string, password: string): Promise<AuthSession | null>;
  refresh(refreshToken: string): Promise<AuthSession | null>;
  getUser(accessToken: string): Promise<{ id: string; email: string } | null>;
  logout(accessToken: string): Promise<void>;
}

/** Thin wrapper over Supabase Auth (GoTrue) REST. The anon key stays on the server. */
export class SupabaseAuth implements AuthLike {
  private readonly base: string;
  constructor(
    private readonly env: Pick<Env, 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>,
    private readonly f: FetchFn = (...a) => fetch(...a)
  ) {
    this.base = env.SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1';
  }

  private h(token?: string): HeadersInit {
    return { apikey: this.env.SUPABASE_ANON_KEY, 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  }

  private toSession(j: any): AuthSession | null {
    if (!j?.access_token || !j?.refresh_token || !j?.user?.id) return null;
    return {
      accessToken: j.access_token,
      refreshToken: j.refresh_token,
      expiresIn: Number(j.expires_in) || 3600,
      user: { id: j.user.id, email: String(j.user.email || '') }
    };
  }

  async passwordLogin(email: string, password: string) {
    const res = await this.f(`${this.base}/token?grant_type=password`, { method: 'POST', headers: this.h(), body: JSON.stringify({ email, password }) });
    if (res.status >= 500) throw new ApiError(502, 'auth_unavailable', 'Sign-in is temporarily unavailable.');
    if (!res.ok) return null;
    return this.toSession(await res.json().catch(() => null));
  }

  async refresh(refreshToken: string) {
    const res = await this.f(`${this.base}/token?grant_type=refresh_token`, { method: 'POST', headers: this.h(), body: JSON.stringify({ refresh_token: refreshToken }) });
    if (res.status >= 500) throw new ApiError(502, 'auth_unavailable', 'Sign-in is temporarily unavailable.');
    if (!res.ok) return null;
    return this.toSession(await res.json().catch(() => null));
  }

  async getUser(accessToken: string) {
    const res = await this.f(`${this.base}/user`, { method: 'GET', headers: this.h(accessToken) });
    if (res.status >= 500) throw new ApiError(502, 'auth_unavailable', 'Sign-in is temporarily unavailable.');
    if (!res.ok) return null;
    const j: any = await res.json().catch(() => null);
    return j?.id ? { id: String(j.id), email: String(j.email || '') } : null;
  }

  async logout(accessToken: string) {
    await this.f(`${this.base}/logout`, { method: 'POST', headers: this.h(accessToken) }).catch(() => {});
  }
}

export const ACCESS_COOKIE = 'gw_admin';
export const REFRESH_COOKIE = 'gw_admin_rt';

function cookie(name: string, value: string, path: string, maxAge: number): string {
  // HttpOnly: unreadable by JS (XSS can't steal it). Secure: HTTPS only. SameSite=Strict: never sent cross-site.
  return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

export function sessionCookies(s: AuthSession): string[] {
  return [
    cookie(ACCESS_COOKIE, s.accessToken, '/api/admin', s.expiresIn),
    cookie(REFRESH_COOKIE, s.refreshToken, '/api/admin/session', 60 * 60 * 24 * 7)
  ];
}

export function clearCookies(): string[] {
  return [cookie(ACCESS_COOKIE, '', '/api/admin', 0), cookie(REFRESH_COOKIE, '', '/api/admin/session', 0)];
}

export interface AdminIdentity {
  userId: string;
  email: string;
}

/** Is this Supabase user on the admin allowlist? Backend-enforced; the UI is never trusted. */
export async function isAdmin(db: DbLike, userId: string): Promise<boolean> {
  const rows = await db.select<{ user_id: string }>('admin_users', `select=user_id&${eq('user_id', userId)}`);
  return rows.length > 0;
}

export async function authenticateAdmin(request: Request, deps: { auth: AuthLike; db: DbLike }): Promise<AdminIdentity> {
  const token = parseCookies(request.headers.get('cookie'))[ACCESS_COOKIE];
  if (!token) throw new ApiError(401, 'unauthenticated', 'Sign in required.');
  const user = await deps.auth.getUser(token);
  if (!user) throw new ApiError(401, 'unauthenticated', 'Your session has expired. Sign in again.');
  if (!(await isAdmin(deps.db, user.id))) throw new ApiError(403, 'forbidden', 'This account is not authorised.');
  return { userId: user.id, email: user.email };
}
