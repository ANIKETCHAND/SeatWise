import { request } from './client';
import { AdminUser, AuditLog } from '../../types';

export const adminApi = {
  getUsers: (params?: { role?: string; search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return request<{ users: AdminUser[]; counts: Record<string, number> }>(`/admin/users${qs ? `?${qs}` : ''}`);
  },

  createUser: (payload: {
    full_name: string;
    email: string;
    role: string;
    password: string;
    department?: string;
    roll_number?: string;
    semester?: number;
    section?: string;
    account_status?: string;
    must_change_password?: boolean;
  }) =>
    request<{ status: string; message: string; user: AdminUser }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUser: (id: string, patch: Partial<AdminUser>) =>
    request<{ status: string; user: AdminUser }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  resetPassword: (id: string, new_password: string, require_change_on_login = true) =>
    request<{ status: string; message: string }>(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password, require_change_on_login }),
    }),

  deactivateUser: (id: string) =>
    request<{ status: string; message: string }>(`/admin/users/${id}/deactivate`, {
      method: 'POST',
    }),

  reactivateUser: (id: string) =>
    request<{ status: string; message: string }>(`/admin/users/${id}/reactivate`, {
      method: 'POST',
    }),

  getUserPermissions: (id: string) =>
    request<{
      user_id: string;
      role: string;
      role_default_permissions: string[];
      custom_granted_permissions: string[];
      effective_permissions: string[];
    }>(`/admin/users/${id}/permissions`),

  updateUserPermissions: (id: string, permissions: string[]) =>
    request<{ status: string; message: string; permissions: string[] }>(`/admin/users/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),

  getRolePermissionsMatrix: () =>
    request<{ roles: Record<string, string[]> }>('/admin/roles/permissions'),

  getAuditLogs: (params?: { action?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ audit_logs: AuditLog[] }>(`/admin/audit-logs${qs ? `?${qs}` : ''}`);
  },
};
