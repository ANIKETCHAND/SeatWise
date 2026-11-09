import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  UserCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { useAuth, ROLE_PROFILES } from '../context/AuthContext';
import { UserRole } from '../types';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, role: activeRole, switchRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(activeRole || 'admin');
  const [customEmail, setCustomEmail] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const handleQuickLogin = async (role: UserRole) => {
    setLoadingRole(role);
    setAuthError(null);
    try {
      switchRole(role);
      navigate('/dashboard');
    } catch (e: any) {
      setAuthError(e.message || 'Login failed');
    } finally {
      setLoadingRole(null);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;
    setAuthError(null);
    try {
      await login(customEmail, selectedRole);
      navigate('/dashboard');
    } catch (e: any) {
      setAuthError(e.message || 'Login failed');
    }
  };

  const roleOptions: Array<{
    role: UserRole;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    sampleProfile: typeof ROLE_PROFILES.admin;
  }> = [
    {
      role: 'admin',
      title: 'Administrator',
      description: 'Dean, Department Head, Academic Operations',
      icon: ShieldCheck,
      sampleProfile: ROLE_PROFILES.admin,
    },
    {
      role: 'faculty',
      title: 'Faculty / Professor',
      description: 'Course Instructors & Room Invigilators',
      icon: Briefcase,
      sampleProfile: ROLE_PROFILES.faculty,
    },
    {
      role: 'exam_staff',
      title: 'Examination Staff',
      description: 'Hall Superintendents & Floor Marshals',
      icon: UserCheck,
      sampleProfile: ROLE_PROFILES.exam_staff,
    },
    {
      role: 'student',
      title: 'Student Portal',
      description: 'Desk Locator, Schedule & Hall Ticket',
      icon: GraduationCap,
      sampleProfile: ROLE_PROFILES.student,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-between text-zinc-900 font-sans selection:bg-black selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-zinc-200 bg-white">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base font-bold text-black tracking-tight flex items-center gap-1.5">
              SeatWise
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-100 text-zinc-900 border border-zinc-300 font-semibold">
                JU
              </span>
            </span>
          </div>
        </Link>

        <Link
          to="/"
          className="text-xs font-semibold text-zinc-600 hover:text-black flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Overview
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Header Info */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-medium border border-zinc-200 font-mono">
              <CheckCircle2 className="w-3 h-3 text-black" />
              Jain University FET Seating Portal
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              Sign In to SeatWise
            </h1>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Access smart examination seating allocation, room layouts, and student desk lookup.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {authError}
            </div>
          )}

          {/* Section 1: Official Google Sign-In */}
          <div className="space-y-3 pt-1">
            <div className="text-left">
              <label className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wider block mb-1">
                Select Your Campus Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => setSelectedRole(opt.role)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                      selectedRole === opt.role
                        ? 'border-black bg-black text-white shadow-xs'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    <opt.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{opt.title.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col items-center">
              <GoogleSignInButton
                preferredRole={selectedRole}
                width={340}
                onSuccess={() => navigate('/dashboard')}
                onError={(err) => setAuthError(err.message)}
              />
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-medium text-zinc-400 uppercase tracking-wider shrink-0">
              or instant role pass
            </span>
            <div className="border-t border-zinc-200 w-full" />
          </div>

          {/* Section 2: Quick Institutional Personas */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wider block">
              1-Click Institutional Access
            </label>
            <div className="space-y-1.5">
              {roleOptions.map((opt) => (
                <button
                  key={opt.role}
                  type="button"
                  onClick={() => handleQuickLogin(opt.role)}
                  disabled={loadingRole !== null}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white flex items-center justify-center text-zinc-700 transition-colors">
                      <opt.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-zinc-900 leading-tight">
                        {opt.sampleProfile.full_name}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {opt.sampleProfile.email}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: University Email Sign-In */}
          <form onSubmit={handleEmailLogin} className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="name@jainuniversity.ac.in"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-black"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>

          {/* Footer security note */}
          <div className="pt-2 text-center text-[10px] text-zinc-400 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-zinc-400" />
            Protected by Google OAuth 2.0 & Jain University Security Policies
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="py-4 text-center text-xs text-zinc-500 border-t border-zinc-200 bg-white">
        © 2026 Jain (Deemed-to-be University) • SeatWise Examination Management
      </footer>
    </div>
  );
};
