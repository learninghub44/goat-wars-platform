import type { Env, FetchFn } from './types';

export class DbError extends Error {
  constructor(
    public readonly status: number,
    public readonly pgCode: string | undefined,
    message: string
  ) {
    super(message);
    this.name = 'DbError';
  }
}

/** Minimal PostgREST surface the app needs. Interface so tests can supply an in-memory fake. */
export interface DbLike {
  rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T>;
  select<T = Record<string, unknown>>(table: string, query: string): Promise<T[]>;
  insert<T = Record<string, unknown>>(table: string, row: Record<string, unknown>): Promise<T>;
  update<T = Record<string, unknown>>(table: string, filter: string, patch: Record<string, unknown>): Promise<T[]>;
  remove(table: string, filter: string): Promise<void>;
}

/** PostgREST filter helper: eq('id', x) → "id=eq.<encoded>" */
export const eq = (col: string, val: string | number | boolean) => `${col}=eq.${encodeURIComponent(String(val))}`;

export class SupabaseDb implements DbLike {
  private readonly base: string;
  constructor(
    env: Pick<Env, 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'>,
    private readonly key = env.SUPABASE_SERVICE_ROLE_KEY,
    private readonly f: FetchFn = (...a) => fetch(...a)
  ) {
    this.base = env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1';
  }

  private headers(extra: Record<string, string> = {}): HeadersInit {
    return { apikey: this.key, authorization: `Bearer ${this.key}`, 'content-type': 'application/json', ...extra };
  }

  private async run(url: string, init: RequestInit): Promise<unknown> {
    const res = await this.f(url, init);
    const text = await res.text();
    let body: any = undefined;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    if (!res.ok) {
      throw new DbError(res.status, body?.code, body?.message || `Database error (${res.status})`);
    }
    return body;
  }

  async rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    return (await this.run(`${this.base}/rpc/${fn}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(args) })) as T;
  }

  async select<T = Record<string, unknown>>(table: string, query: string): Promise<T[]> {
    return ((await this.run(`${this.base}/${table}?${query}`, { method: 'GET', headers: this.headers() })) as T[]) ?? [];
  }

  async insert<T = Record<string, unknown>>(table: string, row: Record<string, unknown>): Promise<T> {
    const rows = (await this.run(`${this.base}/${table}`, {
      method: 'POST',
      headers: this.headers({ prefer: 'return=representation' }),
      body: JSON.stringify(row)
    })) as T[];
    return rows[0];
  }

  async update<T = Record<string, unknown>>(table: string, filter: string, patch: Record<string, unknown>): Promise<T[]> {
    if (!filter) throw new Error('update() requires a filter');
    return (await this.run(`${this.base}/${table}?${filter}`, {
      method: 'PATCH',
      headers: this.headers({ prefer: 'return=representation' }),
      body: JSON.stringify(patch)
    })) as T[];
  }

  async remove(table: string, filter: string): Promise<void> {
    if (!filter) throw new Error('remove() requires a filter');
    await this.run(`${this.base}/${table}?${filter}`, { method: 'DELETE', headers: this.headers() });
  }
}
