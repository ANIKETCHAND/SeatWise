import { request } from './client';

export const classroomApi = {
  generateClassroomSeating: (payload: any) =>
    request<any>('/seating/classroom/generate', { method: 'POST', body: JSON.stringify(payload) }),
  saveClassroomSeating: (payload: any) =>
    request<any>('/seating/classroom/save', { method: 'POST', body: JSON.stringify(payload) }),
  getClassroomPlan: (planId: string) => request<any>(`/seating/classroom/${planId}`),
  updateAttendance: (planId: string, absences: string[]) =>
    request<any>(`/seating/classroom/${planId}/attendance`, { method: 'POST', body: JSON.stringify({ absences }) }),
};
