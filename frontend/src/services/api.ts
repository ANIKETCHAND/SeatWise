/**
 * Central API Service Layer (Unified Facade).
 * 
 * Provides unified access to all domain-specific API clients:
 * - authApi (Authentication, Roll Resolution & Status)
 * - adminApi (User Management, Password Resets & Audit Logs)
 * - studentApi (Personal Schedule & Desk Locator)
 * - dashboardApi (Dashboard Analytics)
 * - universityApi (Programs & Batches)
 * - timetableApi (Timetable Import & Query)
 * - studentsApi (Students Directory)
 * - facultyApi (Faculty Directory)
 * - roomsApi (Rooms & Layout Management)
 * - classroomApi (Classroom Mode A Seating)
 * - examsApi (Examination Mode B Seating)
 * - mathApi (Mathematical Discrete Optimization)
 * - reportsApi (Reports, Exports & Downloads)
 */

import {
  api as modularApi,
  ApiError,
  setAuthToken,
  getAuthToken,
  getApiBase,
  request,
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
} from './api/index';

export {
  ApiError,
  setAuthToken,
  getAuthToken,
  getApiBase,
  request,
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
  // Auth & Account Management
  getMe: authApi.getMe,
  getStatus: authApi.getStatus,
  getHealth: authApi.getHealth,
  resolveStudentRoll: authApi.resolveStudentRoll,
  changePassword: authApi.changePassword,
  bootstrapAdmin: authApi.bootstrapAdmin,

  // Admin User & Access Management
  getUsers: adminApi.getUsers,
  createUser: adminApi.createUser,
  updateUser: adminApi.updateUser,
  resetPassword: adminApi.resetPassword,
  deactivateUser: adminApi.deactivateUser,
  reactivateUser: adminApi.reactivateUser,
  getUserPermissions: adminApi.getUserPermissions,
  updateUserPermissions: adminApi.updateUserPermissions,
  getRolePermissionsMatrix: adminApi.getRolePermissionsMatrix,
  getAuditLogs: adminApi.getAuditLogs,

  // Student Personal Portal
  getStudentMe: studentApi.getStudentMe,
  getTodayExaminations: studentApi.getTodayExaminations,
  getUpcomingExaminations: studentApi.getUpcomingExaminations,
  lookupMySeat: studentApi.lookupMySeat,
  getHistory: studentApi.getHistory,

  // Dashboard
  getDashboardStats: dashboardApi.getDashboardStats,

  // University & Programs
  getPrograms: universityApi.getPrograms,
  getProgramTree: universityApi.getProgramTree,
  createProgram: universityApi.createProgram,
  getBatches: universityApi.getBatches,
  createBatch: universityApi.createBatch,

  // Timetable
  getTimetable: timetableApi.getTimetable,
  previewTimetable: timetableApi.previewTimetable,
  confirmTimetableImport: timetableApi.confirmTimetableImport,
  searchTimetable: timetableApi.searchTimetable,

  // Students
  getStudents: studentsApi.getStudents,
  createStudent: studentsApi.createStudent,
  importStudents: studentsApi.importStudents,

  // Faculty
  getFaculty: facultyApi.getFaculty,
  createFaculty: facultyApi.createFaculty,

  // Rooms & Halls
  getRooms: roomsApi.getRooms,
  getApprovedExamHalls: roomsApi.getApprovedExamHalls,
  createRoom: roomsApi.createRoom,
  updateRoomLayout: roomsApi.updateRoomLayout,

  // Classroom Seating (Mode A)
  generateClassroomSeating: classroomApi.generateClassroomSeating,
  saveClassroomSeating: classroomApi.saveClassroomSeating,
  getClassroomPlan: classroomApi.getClassroomPlan,
  updateAttendance: classroomApi.updateAttendance,

  // Examinations & Seating (Mode B)
  getExams: examsApi.getExams,
  getExam: examsApi.getExam,
  createExam: examsApi.createExam,
  updateExam: examsApi.updateExam,
  deleteExam: examsApi.deleteExam,
  archiveExam: examsApi.archiveExam,
  setExamBatches: examsApi.setExamBatches,
  setExamHalls: examsApi.setExamHalls,
  setExamSubjects: examsApi.setExamSubjects,
  getExamSubjects: examsApi.getExamSubjects,
  generateExamSeating: examsApi.generateExamSeating,
  validateExamAllocation: examsApi.validateExamAllocation,
  saveExamSeating: examsApi.saveExamSeating,
  getExamPlan: examsApi.getExamPlan,
  publishExamPlan: examsApi.publishExamPlan,
  manualExamMoves: examsApi.manualExamMoves,
  updateExamAttendance: examsApi.updateExamAttendance,
  lookupSeat: examsApi.lookupSeat,

  // Mathematics Analysis
  mathCapacity: mathApi.mathCapacity,
  mathCheckerboard: mathApi.mathCheckerboard,
  mathAdjacency: mathApi.mathAdjacency,
  mathSolve: mathApi.mathSolve,

  // Reports & History
  getSeatingPlans: reportsApi.getSeatingPlans,
  getExamLocatorData: reportsApi.getExamLocatorData,
  getPlanCsvUrl: reportsApi.getPlanCsvUrl,
  getPlanPdfUrl: reportsApi.getPlanPdfUrl,
  getExamLocatorPdfUrl: reportsApi.getExamLocatorPdfUrl,
  getExamCsvUrl: reportsApi.getExamCsvUrl,
};

export default api;
