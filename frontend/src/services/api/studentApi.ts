import { request } from './client';
import { StudentExam, StudentSeatInfo } from '../../types';

export const studentApi = {
  getStudentMe: () =>
    request<{
      student_id: string;
      full_name: string;
      roll_number: string;
      email?: string;
      program_code: string;
      program_name: string;
      semester: number;
      section: string;
    }>('/student/me'),

  getTodayExaminations: () =>
    request<{ today: string; examinations: StudentExam[] }>('/student/examinations/today'),

  getUpcomingExaminations: () =>
    request<{ examinations: StudentExam[] }>('/student/examinations/upcoming'),

  lookupMySeat: (roll_number?: string, exam_id?: string) => {
    const query = new URLSearchParams();
    if (roll_number) query.set('roll_number', roll_number);
    if (exam_id) query.set('examination_id', exam_id);
    const qs = query.toString();
    return request<{
      student: { name: string; roll_number: string };
      allocations: StudentSeatInfo[];
    }>(`/student/seat-lookup${qs ? `?${qs}` : ''}`);
  },

  getHistory: () =>
    request<{ history: Array<{ examination_name: string; exam_date: string; session: string; hall: string; seat_label: string }> }>(
      '/student/history'
    ),
};
