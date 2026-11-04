const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // response wasn't JSON
    }
    const err = errorData.error || errorData;
    throw new ApiError(
      response.status,
      err.code || 'HTTP_ERROR',
      err.message || response.statusText || 'Request failed',
      err.details
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text() as unknown as T;
}

export const api = {
  // Auth
  getMe: () => request<any>('/auth/me'),
  getStatus: () => request<any>('/auth/status'),
  getHealth: () => request<any>('/health'),

  // Dashboard
  getDashboardStats: () => request<any>('/dashboard/stats'),

  // University & Programs
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

  // Timetable
  getTimetable: (params: { program_id?: string; semester?: number; section?: string; day?: string }) => {
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

  // Students
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

  // Faculty
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

  // Rooms & Halls
  getRooms: async (type?: string) => {
    try {
      const q = type ? `?type=${encodeURIComponent(type)}` : '';
      const res = await request<any>(`/rooms${q}`);
      return Array.isArray(res) ? res : res?.rooms || [];
    } catch {
      return [];
    }
  },
  getApprovedExamHalls: () => request<any[]>('/rooms/halls/approved'),
  createRoom: (data: any) => request<any>('/rooms', { method: 'POST', body: JSON.stringify(data) }),
  updateRoomLayout: (roomId: string, layout: any) =>
    request<any>(`/rooms/${roomId}/layout`, { method: 'PUT', body: JSON.stringify(layout) }),

  // Classroom Seating (Mode A)
  generateClassroomSeating: (payload: any) =>
    request<any>('/seating/classroom/generate', { method: 'POST', body: JSON.stringify(payload) }),
  saveClassroomSeating: (payload: any) =>
    request<any>('/seating/classroom/save', { method: 'POST', body: JSON.stringify(payload) }),
  getClassroomPlan: (planId: string) => request<any>(`/seating/classroom/${planId}`),
  updateAttendance: (planId: string, absences: string[]) =>
    request<any>(`/seating/classroom/${planId}/attendance`, { method: 'POST', body: JSON.stringify({ absences }) }),

  // Examinations & Seating (Mode B)
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

  // Mathematics Analysis
  mathCapacity: (rows: number, columns: number, blocked: number[][]) =>
    request<any>('/math/capacity', { method: 'POST', body: JSON.stringify({ rows, columns, blocked }) }),
  mathCheckerboard: (rows: number, columns: number, class_a: number, class_b: number) =>
    request<any>('/math/checkerboard', { method: 'POST', body: JSON.stringify({ rows, columns, class_a, class_b }) }),
  mathAdjacency: (payload: any) =>
    request<any>('/math/adjacency', { method: 'POST', body: JSON.stringify(payload) }),
  mathSolve: (payload: any) =>
    request<any>('/math/solve', { method: 'POST', body: JSON.stringify(payload) }),

  // Reports & History
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
  getPlanCsvUrl: (planId: string) => `${API_BASE}/reports/plan/${planId}/csv`,
  getPlanPdfUrl: (planId: string) => `${API_BASE}/reports/plan/${planId}/pdf`,
  getExamLocatorPdfUrl: (examId: string) => `${API_BASE}/reports/exam/${examId}/locator/pdf`,
  getExamCsvUrl: (examId: string) => `${API_BASE}/reports/exam/${examId}/csv`,
};
