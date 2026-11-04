import { request } from './client';

export const dashboardApi = {
  getDashboardStats: () => request<any>('/dashboard/stats'),
};
