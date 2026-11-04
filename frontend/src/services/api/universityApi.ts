import { request } from './client';

export const universityApi = {
  getPrograms: async () => {
    try {
      const res = await request<any>('/university/programs');
      return Array.isArray(res) ? res : res?.programs || [];
    } catch {
      return [];
    }
  },
  getProgramTree: () => request<any[]>('/university/programs/tree'),
  createProgram: (data: any) => request<any>('/university/programs', { method: 'POST', body: JSON.stringify(data) }),
  getBatches: async (programId?: string, semester?: number) => {
    try {
      const params = new URLSearchParams();
      if (programId) params.append('program_id', programId);
      if (semester) params.append('semester', semester.toString());
      const res = await request<any>(`/university/batches?${params.toString()}`);
      return Array.isArray(res) ? res : res?.batches || [];
    } catch {
      return [];
    }
  },
  createBatch: (data: any) => request<any>('/university/batches', { method: 'POST', body: JSON.stringify(data) }),
};
