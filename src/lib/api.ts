import type { AppConfig, Debate, PublicPaymentStatus } from '../types';

export class ApiFailure extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(init.headers || {}) }
    });
  } catch {
    throw new ApiFailure(0, 'network', 'Network problem. Check your connection and try again.');
  }
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  if (!res.ok) throw new ApiFailure(res.status, body?.error?.code || 'error', body?.error?.message || 'Something went wrong. Please try again.');
  return body as T;
}

export const api = {
  config: () => request<AppConfig>('/api/config'),
  debates: (fresh = false) => request<{ debates: Debate[]; generatedAt: string }>(`/api/debates${fresh ? `?t=${Date.now()}` : ''}`),
  initializePayment: (b: { matchupId: string; candidateId: string; quantity: number; email: string }) =>
    request<{ reference: string; authorizationUrl: string; amountKes: number; unitPriceKes: number; quantity: number }>('/api/payments/initialize', {
      method: 'POST',
      body: JSON.stringify(b)
    }),
  paymentStatus: (reference: string) => request<PublicPaymentStatus>(`/api/payments/${encodeURIComponent(reference)}/status`),
  freeVote: (b: { matchupId: string; candidateId: string }) => request<{ ok: true }>('/api/votes/free', { method: 'POST', body: JSON.stringify(b) })
};
