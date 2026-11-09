import { request } from './client';

export const timetableApi = {
  getTimetable: (params: { program_id?: string; semester?: number; section?: string; day?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.program_id) q.append('program_id', params.program_id);
    if (params.semester) q.append('semester', params.semester.toString());
    if (params.section) q.append('section', params.section);
    if (params.day) q.append('day', params.day);
    return request<any>(`/timetable?${q.toString()}`);
  },
  previewTimetable: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/timetable/import/preview', { method: 'POST', body: formData });
  },
  confirmTimetableImport: (data: any) => {
    if (data instanceof FormData) {
      return request<any>('/timetable/import/commit', { method: 'POST', body: data });
    }
    return request<any>('/timetable/import/commit', { method: 'POST', body: JSON.stringify(data) });
  },
  searchTimetable: (q: string) => request<any[]>(`/timetable/search?q=${encodeURIComponent(q)}`),
};
