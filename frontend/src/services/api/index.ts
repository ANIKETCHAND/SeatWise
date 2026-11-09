/**
 * Scalable API Client Structure Index.
 * 
 * Aggregates all domain API modules and exports a unified `api` object,
 * while maintaining granular exports for modular service consumption.
 */

import { request, ApiError, setAuthToken, getAuthToken, getApiBase } from './client';
import { authApi } from './authApi';
import { adminApi } from './adminApi';
import { studentApi } from './studentApi';
import { dashboardApi } from './dashboardApi';
import { universityApi } from './universityApi';
import { timetableApi } from './timetableApi';
import { studentsApi } from './studentsApi';
import { facultyApi } from './facultyApi';
import { roomsApi } from './roomsApi';
import { classroomApi } from './classroomApi';
import { examsApi } from './examsApi';
import { mathApi } from './mathApi';
import { reportsApi } from './reportsApi';

export {
  request,
  ApiError,
  setAuthToken,
  getAuthToken,
  getApiBase,
  authApi,
  adminApi,
  studentApi,
  dashboardApi,
  universityApi,
  timetableApi,
  studentsApi,
  facultyApi,
  roomsApi,
  classroomApi,
  examsApi,
  mathApi,
  reportsApi,
};

export const api = {
  // Auth
  ...authApi,

  // Admin & User Management
  ...adminApi,

  // Student Personal Portal
  ...studentApi,

  // Dashboard
  ...dashboardApi,

  // University & Programs
  ...universityApi,

  // Timetable
  ...timetableApi,

  // Students
  ...studentsApi,

  // Faculty
  ...facultyApi,

  // Rooms & Halls
  ...roomsApi,

  // Classroom Seating (Mode A)
  ...classroomApi,

  // Examinations & Seating (Mode B)
  ...examsApi,

  // Mathematics Analysis
  ...mathApi,

  // Reports & History
  ...reportsApi,
};

export default api;
