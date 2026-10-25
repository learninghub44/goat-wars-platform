export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_HEADERS: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff'
};

export function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  const headers = new Headers(BASE_HEADERS);
  new Headers(extraHeaders).forEach((v, k) => headers.append(k, v));
  return new Response(JSON.stringify(data), { status, headers });
}

export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

export function errorResponse(status: number, code: string, message: string, extraHeaders: HeadersInit = {}): Response {
  return json(errorBody(code, message), status, extraHeaders);
}

const MAX_BODY_BYTES = 32 * 1024;

export async function readRawBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<string> {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new ApiError(413, 'payload_too_large', 'Request body is too large.');
  const text = await request.text();
  if (text.length > maxBytes) throw new ApiError(413, 'payload_too_large', 'Request body is too large.');
  return text;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const ct = request.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    throw new ApiError(415, 'unsupported_media_type', 'Content-Type must be application/json.');
  }
  const text = await readRawBody(request);
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'invalid_json', 'Request body must be a JSON object.');
  }
}

/** Best-effort client IP. Cloudflare always sets cf-connecting-ip at the edge. */
export function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}
