import { ApiFailure, request } from '../lib/api';

const H = { 'x-gw-csrf': '1' };

/** Admin calls: HttpOnly cookie session + CSRF header. On 401, try one silent refresh. */
export async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const run = () => request<T>(path, { ...init, headers: { ...H, ...(init.headers || {}) } });
  try {
    return await run();
  } catch (e) {
    if (e instanceof ApiFailure && e.status === 401 && !path.endsWith('/session') && !path.endsWith('/refresh')) {
      try {
        await request('/api/admin/session/refresh', { method: 'POST', headers: H });
        return await run();
      } catch {
        throw e;
      }
    }
    throw e;
  }
}

export const adminApi = {
  me: () => adminRequest<{ email: string }>('/api/admin/session'),
  login: (email: string, password: string) => adminRequest<{ email: string }>('/api/admin/session', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => adminRequest('/api/admin/session', { method: 'DELETE' }),
  overview: () => adminRequest<{ overview: Record<string, number>; recentEvents: AuditRow[] }>('/api/admin/overview'),
  debates: () => adminRequest<{ debates: any[] }>('/api/admin/debates'),
  createDebate: (b: object) => adminRequest<{ id: string }>('/api/admin/debates', { method: 'POST', body: JSON.stringify(b) }),
  updateDebate: (id: string, b: object) => adminRequest(`/api/admin/debates/${id}`, { method: 'PATCH', body: JSON.stringify(b) }),
  attach: (id: string, candidateId: string, displayOrder: number) => adminRequest(`/api/admin/debates/${id}/candidates`, { method: 'POST', body: JSON.stringify({ candidateId, displayOrder }) }),
  detach: (id: string, candidateId: string) => adminRequest(`/api/admin/debates/${id}/candidates/${candidateId}`, { method: 'DELETE' }),
  candidates: () => adminRequest<{ candidates: any[] }>('/api/admin/candidates'),
  createCandidate: (b: object) => adminRequest<{ id: string }>('/api/admin/candidates', { method: 'POST', body: JSON.stringify(b) }),
  updateCandidate: (id: string, b: object) => adminRequest(`/api/admin/candidates/${id}`, { method: 'PATCH', body: JSON.stringify(b) }),
  payments: (status?: string) => adminRequest<{ payments: any[] }>(`/api/admin/payments${status ? `?status=${status}` : ''}`),
  reconcile: (ref: string) => adminRequest<{ payment: { status: string }; failureReason: string | null }>(`/api/admin/payments/${ref}/reconcile`, { method: 'POST', body: '{}' }),
  audit: () => adminRequest<{ logs: AuditRow[] }>('/api/admin/audit')
};

export interface AuditRow { id: string; action: string; target: string; details: string; admin_user: string; timestamp: string }
