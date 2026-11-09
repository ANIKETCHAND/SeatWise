import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
}) => {
  const { user, role, isLoading, isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-xs font-mono text-zinc-500">Verifying session credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role validation
  if (allowedRoles && allowedRoles.length > 0 && role) {
    if (!allowedRoles.includes(role)) {
      // Redirect to user's authorized home dashboard
      switch (role) {
        case 'admin':
          return <Navigate to="/dashboard" replace />;
        case 'exam_staff':
          return <Navigate to="/exam-dashboard" replace />;
        case 'faculty':
          return <Navigate to="/faculty-dashboard" replace />;
        case 'student':
          return <Navigate to="/student-dashboard" replace />;
        default:
          return <Navigate to="/" replace />;
      }
    }
  }

  // Permission validation
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-12 bg-white rounded-xl border border-red-200 text-center space-y-3 shadow-xs">
        <h2 className="text-sm font-bold text-red-700">Access Restricted (403 Forbidden)</h2>
        <p className="text-xs text-zinc-600">
          Your account does not hold the required permission: <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono text-[11px]">{requiredPermission}</code>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
