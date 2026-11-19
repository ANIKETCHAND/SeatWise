import { request, getApiBase, getAuthToken } from './client';

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
  
  getPlanCsvUrl: (planId: string) => {
    const token = getAuthToken();
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${getApiBase()}/reports/plan/${planId}/csv${query}`;
  },
  getPlanPdfUrl: (planId: string) => {
    const token = getAuthToken();
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${getApiBase()}/reports/plan/${planId}/pdf${query}`;
  },
  getExamLocatorPdfUrl: (examId: string) => {
    const token = getAuthToken();
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${getApiBase()}/reports/exam/${examId}/locator/pdf${query}`;
  },
  getExamAttendancePdfUrl: (examId: string, hall?: string) => {
    const token = getAuthToken();
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (hall) params.set('hall', hall);
    const q = params.toString() ? `?${params.toString()}` : '';
    return `${getApiBase()}/reports/exam/${examId}/attendance/pdf${q}`;
  },
  getHallChartPdfUrl: (examId: string, hall?: string) => {
    const token = getAuthToken();
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (hall) params.set('hall', hall);
    const q = params.toString() ? `?${params.toString()}` : '';
    return `${getApiBase()}/reports/exam/${examId}/hall-chart/pdf${q}`;
  },
  getExamCsvUrl: (examId: string) => {
    const token = getAuthToken();
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${getApiBase()}/reports/exam/${examId}/csv${query}`;
  },

  downloadExamLocatorPdf: async (examId: string, examName?: string) => {
    const token = getAuthToken();
    const headers: Record<string, string> = { Accept: 'application/pdf' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    const res = await fetch(`${getApiBase()}/reports/exam/${examId}/locator/pdf${query}`, { headers });
    if (!res.ok) {
      let msg = 'Failed to download PDF';
      try {
        const err = await res.json();
        if (err && err.detail) msg = err.detail;
      } catch {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    const safeName = (examName || examId || 'exam').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `JAIN_FET_Seat_Locator_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(blobUrl);
    link.remove();
  },

  downloadExamAttendancePdf: async (examId: string, hall?: string, examName?: string) => {
    const token = getAuthToken();
    const headers: Record<string, string> = { Accept: 'application/pdf' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (hall) params.set('hall', hall);
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${getApiBase()}/reports/exam/${examId}/attendance/pdf${q}`, { headers });
    if (!res.ok) {
      let msg = 'Failed to download attendance sheet';
      try {
        const err = await res.json();
        if (err && err.detail) msg = err.detail;
      } catch {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    const safeName = (examName || examId || 'exam').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeHall = hall ? `_${hall.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    link.download = `JAIN_FET_Attendance_Sheet_${safeName}${safeHall}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(blobUrl);
    link.remove();
  },

  downloadHallChartPdf: async (examId: string, hall?: string, examName?: string) => {
    const token = getAuthToken();
    const headers: Record<string, string> = { Accept: 'application/pdf' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (hall) params.set('hall', hall);
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${getApiBase()}/reports/exam/${examId}/hall-chart/pdf${q}`, { headers });
    if (!res.ok) {
      let msg = 'Failed to download hall seating chart';
      try {
        const err = await res.json();
        if (err && err.detail) msg = err.detail;
      } catch {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    const safeName = (examName || examId || 'exam').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeHall = hall ? `_${hall.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    link.download = `JAIN_FET_Hall_Door_Chart_${safeName}${safeHall}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(blobUrl);
    link.remove();
  },

  downloadPlanPdf: async (planId: string, title?: string) => {
    const token = getAuthToken();
    const headers: Record<string, string> = { Accept: 'application/pdf' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    const res = await fetch(`${getApiBase()}/reports/plan/${planId}/pdf${query}`, { headers });
    if (!res.ok) {
      let msg = 'Failed to download PDF';
      try {
        const err = await res.json();
        if (err && err.detail) msg = err.detail;
      } catch {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    const safeName = (title || planId || 'seating_plan').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `JAIN_FET_Seating_Report_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(blobUrl);
    link.remove();
  },
};
