import { request } from './client';

export const facultyApi = {
  getFaculty: async (dept?: string) => {
    try {
      const q = dept ? `?department=${encodeURIComponent(dept)}` : '';
      const res = await request<any>(`/faculty${q}`);
      return Array.isArray(res) ? res : res?.faculty || [];
    } catch {
      return [];
    }
  },
  createFaculty: (data: any) => request<any>('/faculty', { method: 'POST', body: JSON.stringify(data) }),
};
