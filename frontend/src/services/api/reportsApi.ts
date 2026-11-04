import { request, getApiBase } from './client';

export const reportsApi = {
  getSeatingPlans: async (kind?: string) => {
    try {
      const q = kind && kind !== 'all' ? `?kind=${encodeURIComponent(kind)}` : '';
      const res = await request<any>(`/seating/plans${q}`);
      return Array.isArray(res) ? res : res?.plans || [];
    } catch {
      return [];
    }
  },
  getExamLocatorData: (examId: string) => request<any>(`/reports/exam/${examId}/locator`),
  getPlanCsvUrl: (planId: string) => `${getApiBase()}/reports/plan/${planId}/csv`,
  getPlanPdfUrl: (planId: string) => `${getApiBase()}/reports/plan/${planId}/pdf`,
  getExamLocatorPdfUrl: (examId: string) => `${getApiBase()}/reports/exam/${examId}/locator/pdf`,
  getExamCsvUrl: (examId: string) => `${getApiBase()}/reports/exam/${examId}/csv`,
};
