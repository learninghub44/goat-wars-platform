import { ApiError } from './http';

const bad = (msg: string) => new ApiError(400, 'invalid_request', msg);

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const REFERENCE_RE = /^GW-[A-Z0-9]{1,12}-[A-Z0-9]{8,32}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function str(v: unknown, field: string, o: { min?: number; max?: number; optional?: boolean } = {}): string | undefined {
  if (v === undefined || v === null || v === '') {
    if (o.optional) return undefined;
    throw bad(`${field} is required.`);
  }
  if (typeof v !== 'string') throw bad(`${field} must be a string.`);
  const s = v.trim();
  if (o.min !== undefined && s.length < o.min) throw bad(`${field} is too short.`);
  if (o.max !== undefined && s.length > o.max) throw bad(`${field} is too long.`);
  return s;
}

export const reqStr = (v: unknown, field: string, min = 1, max = 500): string => str(v, field, { min, max }) as string;

export function uuid(v: unknown, field: string): string {
  if (typeof v !== 'string' || !UUID_RE.test(v)) throw bad(`${field} must be a valid id.`);
  return v.toLowerCase();
}

export function intIn(v: unknown, field: string, min: number, max: number): number {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) {
    throw bad(`${field} must be a whole number between ${min} and ${max}.`);
  }
  return n;
}

export function numIn(v: unknown, field: string, min: number, max: number): number {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) {
    throw bad(`${field} must be a number between ${min} and ${max}.`);
  }
  return n;
}

export function oneOf<T extends string>(v: unknown, field: string, allowed: readonly T[]): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw bad(`${field} must be one of: ${allowed.join(', ')}.`);
  }
  return v as T;
}

export function email(v: unknown): string {
  const s = reqStr(v, 'email', 3, 320).toLowerCase();
  if (!EMAIL_RE.test(s)) throw bad('Enter a valid email address.');
  return s;
}

export function slug(v: unknown): string {
  const s = reqStr(v, 'slug', 2, 120).toLowerCase();
  if (!SLUG_RE.test(s)) throw bad('slug may only contain lowercase letters, numbers and single hyphens.');
  return s;
}

export function reference(v: unknown): string {
  if (typeof v !== 'string' || !REFERENCE_RE.test(v)) throw bad('Invalid payment reference.');
  return v;
}

/** Image URLs must be https:// or a same-site /assets/ path. No data:, javascript:, http:. */
export function imageUrl(v: unknown, field = 'imageUrl'): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || v.length > 2000) throw bad(`${field} is invalid.`);
  const s = v.trim();
  if (s.startsWith('/assets/') && !s.includes('..') && !s.includes('//')) return s;
  try {
    const u = new URL(s);
    if (u.protocol === 'https:') return u.toString();
  } catch {
    /* fallthrough */
  }
  throw bad(`${field} must be an https:// URL or a /assets/… path.`);
}

export function hexColor(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' || !HEX_COLOR_RE.test(v)) throw bad('highlightColor must be a #RRGGBB hex colour.');
  return v;
}

export function isoDate(v: unknown, field: string): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) throw bad(`${field} must be an ISO date-time.`);
  return new Date(v).toISOString();
}

export function stringArray(v: unknown, field: string, maxItems = 20, maxLen = 300): string[] {
  if (!Array.isArray(v)) throw bad(`${field} must be a list.`);
  if (v.length > maxItems) throw bad(`${field} has too many items.`);
  return v.map((x, i) => reqStr(x, `${field}[${i}]`, 1, maxLen));
}

export function stats(v: unknown): { label: string; value: string }[] {
  if (!Array.isArray(v)) throw bad('stats must be a list.');
  if (v.length > 8) throw bad('stats has too many items.');
  return v.map((x, i) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return { label: reqStr(o.label, `stats[${i}].label`, 1, 40), value: reqStr(o.value, `stats[${i}].value`, 1, 60) };
  });
}
