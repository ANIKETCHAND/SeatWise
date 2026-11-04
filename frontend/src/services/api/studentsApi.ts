import { request } from './client';

export const studentsApi = {
  getStudents: async (params: { program_id?: string; semester?: number; section?: string; q?: string } = {}) => {
    try {
      const q = new URLSearchParams();
      if (params.program_id) q.append('program_id', params.program_id);
      if (params.semester) q.append('semester', params.semester.toString());
      if (params.section) q.append('section', params.section);
      if (params.q) q.append('q', params.q);
      const res = await request<any>(`/students?${q.toString()}`);
      return Array.isArray(res) ? res : res?.students || [];
    } catch {
      return [];
    }
  },
  createStudent: (data: any) => request<any>('/students', { method: 'POST', body: JSON.stringify(data) }),
  importStudents: (students: any[]) =>
    request<any>('/students/import', { method: 'POST', body: JSON.stringify({ students }) }),
};
