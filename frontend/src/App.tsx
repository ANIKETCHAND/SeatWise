import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SeatingProvider } from './context/SeatingContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

import { DashboardPage } from './pages/DashboardPage';
import { ExamDashboardPage } from './pages/ExamDashboardPage';
import { FacultyDashboardPage } from './pages/FacultyDashboardPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

import { UniversityPage } from './pages/UniversityPage';
import { TimetablePage } from './pages/TimetablePage';
import { StudentPage } from './pages/StudentPage';
import { FacultyPage } from './pages/FacultyPage';
import { RoomsPage } from './pages/RoomsPage';
import { ClassroomSeatingPage } from './pages/ClassroomSeatingPage';
import { ExamManagementPage } from './pages/ExamManagementPage';
import { ExamSeatingPage } from './pages/ExamSeatingPage';
import { MathAnalysisPage } from './pages/MathAnalysisPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentSeatLookupPage } from './pages/StudentSeatLookupPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SeatingProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/:role" element={<LoginPage />} />

              {/* Authenticated Application Layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* Administrator Routes */}
                <Route
                  path="dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <UserManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/audit-logs"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/settings"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="university"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <UniversityPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="math-analysis"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <MathAnalysisPage />
                    </ProtectedRoute>
                  }
                />

                {/* Exam Staff Routes */}
                <Route
                  path="exam-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'exam_staff']}>
                      <ExamDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="examinations"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'exam_staff']}>
                      <ExamManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="seating-planner"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'exam_staff']}>
                      <ExamSeatingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="exam-seating"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'exam_staff']}>
                      <ExamSeatingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="rooms"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'exam_staff']}>
                      <RoomsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="students"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'exam_staff']}>
                      <StudentPage />
                    </ProtectedRoute>
                  }
                />

                {/* Faculty Routes */}
                <Route
                  path="faculty-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'faculty']}>
                      <FacultyDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="classroom-seating"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'faculty']}>
                      <ClassroomSeatingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="faculty"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'faculty']}>
                      <FacultyPage />
                    </ProtectedRoute>
                  }
                />

                {/* Student Routes */}
                <Route
                  path="student-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'student']}>
                      <StudentDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="student/examinations"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'student']}>
                      <StudentDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="student/seat-lookup"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'student']}>
                      <StudentDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="student/history"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'student']}>
                      <StudentDashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* Operational Staff & Faculty Routes */}
                <Route
                  path="timetable"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'exam_staff', 'faculty']}>
                      <TimetablePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'exam_staff', 'faculty']}>
                      <ReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="seat-lookup"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'exam_staff']}>
                      <StudentSeatLookupPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="history"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'exam_staff']}>
                      <HistoryPage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SeatingProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
