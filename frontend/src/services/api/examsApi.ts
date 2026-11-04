import { request } from './client';

export const examsApi = {
  getExams: async () => {
    try {
      const res = await request<any>('/examinations');
      return Array.isArray(res) ? res : res?.examinations || [];
    } catch {
      return [];
    }
  },
  getExam: (id: string) => request<any>(`/examinations/${id}`),
  createExam: (data: any) => request<any>('/examinations', { method: 'POST', body: JSON.stringify(data) }),
  updateExam: (id: string, data: any) => request<any>(`/examinations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteExam: (id: string, force: boolean = false) =>
    request<any>(`/examinations/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
  archiveExam: (id: string) => request<any>(`/examinations/${id}/archive`, { method: 'POST' }),
  setExamBatches: (id: string, batchIds: string[]) =>
    request<any>(`/examinations/${id}/batches`, { method: 'PUT', body: JSON.stringify({ batch_ids: batchIds }) }),
  setExamHalls: (id: string, roomIds: string[]) =>
    request<any>(`/examinations/${id}/halls`, { method: 'PUT', body: JSON.stringify({ room_ids: roomIds }) }),
  setExamSubjects: (id: string, subjects: any[]) =>
    request<any>(`/examinations/${id}/subjects`, { method: 'PUT', body: JSON.stringify({ subjects }) }),
  getExamSubjects: (id: string) => request<any>(`/examinations/${id}/subjects`),
  generateExamSeating: (payload: any) =>
    request<any>('/seating/examination/generate', { method: 'POST', body: JSON.stringify(payload) }),
  validateExamAllocation: (payload: any) =>
    request<any>('/seating/examination/validate', { method: 'POST', body: JSON.stringify(payload) }),
  saveExamSeating: (payload: any) =>
    request<any>('/seating/examination/save', { method: 'POST', body: JSON.stringify(payload) }),
  getExamPlan: (planId: string) => request<any>(`/seating/examination/${planId}`),
  publishExamPlan: (planId: string) =>
    request<any>(`/seating/examination/${planId}/publish`, { method: 'POST' }),
  manualExamMoves: (planId: string, moves: any[]) =>
    request<any>(`/seating/examination/${planId}/moves`, { method: 'POST', body: JSON.stringify({ moves }) }),
  updateExamAttendance: (planId: string, payload: any) =>
    request<any>(`/seating/examination/${planId}/attendance`, { method: 'POST', body: JSON.stringify(payload) }),
  lookupSeat: async (q: string, examId?: string) => {
    try {
      const p = new URLSearchParams({ q });
      if (examId) p.append('examination_id', examId);
      return await request<any>(`/seating/examination/lookup?${p.toString()}`);
    } catch {
      return { matches: [] };
    }
  },
};
