import { request } from './client';

export const authApi = {
  getMe: () => request<any>('/auth/me'),
  getStatus: () => request<any>('/auth/status'),
  getHealth: () => request<any>('/health'),
  resolveStudentRoll: (roll_number: string) =>
    request<{ found: boolean; roll_number: string; full_name: string; email: string; masked_email: string }>(
      '/auth/resolve-roll',
      {
        method: 'POST',
        body: JSON.stringify({ roll_number }),
      }
    ),
  changePassword: (old_password: string | undefined, new_password: string) =>
    request<{ status: string; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password, new_password }),
    }),
  bootstrapAdmin: (payload: { bootstrap_secret: string; email: string; password: string; full_name?: string }) =>
    request<{ status: string; message: string; user_id?: string; email?: string; role?: string }>(
      '/auth/bootstrap-admin',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
};
