const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacHex(hash: 'SHA-256' | 'SHA-512', secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export async function sha256Hex(data: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(data)));
}

/** Constant-time string comparison (length is not secret for fixed-size hex digests). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Crockford base32 without ambiguous characters.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Cryptographically random token. ~5 bits of entropy per character. */
export function randomToken(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % 32];
  return out;
}
