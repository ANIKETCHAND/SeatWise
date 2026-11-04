import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { api } from '../../services/api';
import { Database, Server, UserCheck, Shield, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [dbConfigured, setDbConfigured] = useState<boolean>(false);

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    api.getHealth()
      .then((res) => {
        setBackendStatus('connected');
        setDbConfigured(Boolean(res.database_configured));
      })
      .catch(() => {
        setBackendStatus('disconnected');
      });
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shadow-xs sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800 tracking-tight">
            Jain (Deemed-to-be University)
          </h1>
          <p className="text-xs text-slate-500 font-normal">
            Faculty of Engineering and Technology (FET) Seating Portal
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection status badges */}
        <div className="hidden sm:flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
              backendStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <Server className="w-3 h-3" />
            Backend: {backendStatus}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
              dbConfigured
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <Database className="w-3 h-3" />
            Supabase: {dbConfigured ? 'Ready' : 'Dev / Migration Ready'}
          </span>
        </div>

        {/* Role Switcher for instant workflow evaluation */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <Shield className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
          <span className="text-xs font-semibold text-slate-600 hidden md:inline">Role:</span>
          <select
            value={role}
            onChange={(e) => switchRole(e.target.value as UserRole)}
            className="text-xs font-medium bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-primary-500 cursor-pointer"
          >
            <option value="admin">Administrator</option>
            <option value="exam_staff">Examination Staff</option>
            <option value="faculty">Faculty</option>
            <option value="student">Student</option>
          </select>
        </div>

        {/* User preview & Sign Out Action */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-medium text-slate-700 leading-tight truncate max-w-[140px]">
                {user?.full_name?.split(' ')[0]}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">{role.replace('_', ' ')}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
            title="Sign out of SeatWise"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
