import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SeatingProvider } from './context/SeatingContext';
import { AppLayout } from './components/layout/AppLayout';

import { DashboardPage } from './pages/DashboardPage';
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

              {/* Authenticated Application Layout */}
              <Route element={<AppLayout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="examinations" element={<ExamManagementPage />} />
                <Route path="seating-planner" element={<ExamSeatingPage />} />
                <Route path="exam-seating" element={<ExamSeatingPage />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="students" element={<StudentPage />} />
                <Route path="university" element={<UniversityPage />} />
                <Route path="timetable" element={<TimetablePage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="seat-lookup" element={<StudentSeatLookupPage />} />
                <Route path="math-analysis" element={<MathAnalysisPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="faculty" element={<FacultyPage />} />
                <Route path="classroom-seating" element={<ClassroomSeatingPage />} />
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
