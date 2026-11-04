import { request } from './client';

export const authApi = {
  getMe: () => request<any>('/auth/me'),
  getStatus: () => request<any>('/auth/status'),
  getHealth: () => request<any>('/health'),
};
