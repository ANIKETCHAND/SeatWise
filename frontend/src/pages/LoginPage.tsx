import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  ClipboardCheck,
  GraduationCap,
  UserRound,
  Eye,
  EyeOff,
  ArrowLeft,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

interface RoleDefinition {
  role: UserRole;
  title: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  isStudent?: boolean;
}

const ROLES: RoleDefinition[] = [
  {
    role: 'admin',
    title: 'Administrator',
    badge: 'Executive & System Administration',
    icon: ShieldCheck,
    description: 'Complete access to SeatWise administration and management.',
    inputLabel: 'Administrator Email or Username',
    inputPlaceholder: 'admin@jainuniversity.ac.in',
  },
  {
    role: 'exam_staff',
    title: 'Exam Staff',
    badge: 'Examination Operations',
    icon: ClipboardCheck,
    description: 'Examination scheduling, hall allocation, seating arrangement, and examination operations.',
    inputLabel: 'Staff Email or Username',
    inputPlaceholder: 'exam.cell@jainuniversity.ac.in',
  },
  {
    role: 'faculty',
    title: 'Faculty',
    badge: 'Academic & Invigilation',
    icon: GraduationCap,
    description: 'Assigned academic information, examination seating, timetable, and permitted student operations.',
    inputLabel: 'Faculty University Email',
    inputPlaceholder: 'faculty.name@jainuniversity.ac.in',
  },
  {
    role: 'student',
    title: 'Student',
    badge: 'Student Portal & Desk Locator',
    icon: UserRound,
    description: 'View examination schedules and find assigned examination hall and seat information.',
    inputLabel: 'University Roll Number (USN) or Email',
    inputPlaceholder: 'e.g. 23JU0102 or student@jainuniversity.ac.in',
    isStudent: true,
  },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { role: urlRole } = useParams<{ role?: string }>();
  const { loginWithEmail, loginWithRollNumber, loginWithIdentifier, user, isAuthenticated } = useAuth();

  // If already logged in, redirect to correct role dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      redirectByRole(user.role);
    }
  }, [isAuthenticated, user]);

  const redirectByRole = (userRole: UserRole) => {
    switch (userRole) {
      case 'admin':
        navigate('/dashboard', { replace: true });
        break;
      case 'exam_staff':
        navigate('/exam-dashboard', { replace: true });
        break;
      case 'faculty':
        navigate('/faculty-dashboard', { replace: true });
        break;
      case 'student':
        navigate('/student-dashboard', { replace: true });
        break;
      default:
        navigate('/dashboard', { replace: true });
    }
  };

  // Map route param to role or show role selection
  const getInitialRole = (): UserRole | null => {
    if (urlRole) {
      const normalized = urlRole.replace('-', '_');
      const found = ROLES.find((r) => r.role === normalized);
      if (found) return found.role;
    }
    return null;
  };

  const [activeRole, setActiveRole] = useState<UserRole | null>(getInitialRole);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Mandatory password change state for first-time login
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const roleFromUrl = getInitialRole();
    setActiveRole(roleFromUrl);
  }, [urlRole]);

  const handleSelectRole = (role: UserRole) => {
    setActiveRole(role);
    setErrorMessage(null);
    setIdentifier('');
    setPassword('');
    navigate(`/login/${role.replace('_', '-')}`);
  };

  const handleBackToRoles = () => {
    setActiveRole(null);
    setErrorMessage(null);
    navigate('/login');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      setErrorMessage('Please enter both your identification and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let loggedProfile;
      // If identifier is not an email, resolve username or roll number
      if (!cleanId.includes('@')) {
        loggedProfile = await loginWithIdentifier(cleanId, password);
      } else {
        loggedProfile = await loginWithEmail(cleanId, password);
      }

      // Check for first login mandatory password update
      if (loggedProfile.must_change_password) {
        setRequirePasswordChange(true);
        return;
      }

      // Redirect to authorized dashboard
      redirectByRole(loggedProfile.role);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      if (supabase) {
        await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/login`,
        });
      }
      setForgotSent(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleMandatoryPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 12) {
      setErrorMessage('New password must be at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    setErrorMessage(null);
    try {
      await api.changePassword(undefined, newPassword);
      setRequirePasswordChange(false);
      if (user?.role) {
        redirectByRole(user.role);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const currentRoleDef = ROLES.find((r) => r.role === activeRole);

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

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Header Info */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-medium border border-zinc-200 font-mono">
              <CheckCircle2 className="w-3 h-3 text-black" />
              Jain University FET
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              Sign In to SeatWise
            </h1>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Smart examination seating, hall allocation, and student desk lookup.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Select Account Type (Four Cards) */}
          {!activeRole && !requirePasswordChange && (
            <div className="space-y-4 pt-1">
              <div className="text-center">
                <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Select Role
                </span>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Choose your university role to sign in.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {ROLES.map((roleDef) => {
                  const Icon = roleDef.icon;
                  return (
                    <button
                      key={roleDef.role}
                      type="button"
                      onClick={() => handleSelectRole(roleDef.role)}
                      className="p-4 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50/80 text-left transition-all duration-200 group flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-sm"
                    >
                      <div className="space-y-2">
                        <div className="w-9 h-9 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white flex items-center justify-center text-zinc-800 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-zinc-950 flex items-center justify-between">
                            {roleDef.title}
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-transform" />
                          </h3>
                          <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
                            {roleDef.badge}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 leading-relaxed pt-1">
                          {roleDef.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Role-Specific Login Form */}
          {activeRole && !requirePasswordChange && currentRoleDef && (
            <div className="space-y-5 pt-1">
              {/* Role Header Banner */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
                    <currentRoleDef.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                      Sign In
                    </span>
                    <h2 className="text-base font-bold text-zinc-950">
                      {currentRoleDef.title}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBackToRoles}
                  className="text-xs font-medium text-zinc-600 hover:text-black flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg border border-zinc-200 hover:border-zinc-400 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Change Role
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">
                    {currentRoleDef.inputLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={currentRoleDef.inputPlaceholder}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-black focus:border-black font-sans"
                  />
                  {currentRoleDef.isStudent && (
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Students can enter their University Roll Number (e.g. 23JU0102) or registered email.
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs font-medium text-zinc-600 hover:text-black underline underline-offset-2 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-black focus:border-black font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-zinc-300 text-black focus:ring-black w-3.5 h-3.5"
                    />
                    Remember this session
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In as {currentRoleDef.title}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: Mandatory First-Time Password Change */}
          {requirePasswordChange && (
            <div className="space-y-4 pt-1">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  Mandatory Password Setup
                </div>
                <p>
                  As a security precaution, you must change your temporary initial password before accessing your dashboard.
                </p>
              </div>

              <form onSubmit={handleMandatoryPasswordChange} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">
                    New Secure Password (Minimum 12 Characters)
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full py-2.5 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {changingPassword ? 'Updating Password...' : 'Save & Continue to Dashboard'}
                </button>
              </form>
            </div>
          )}

          {/* Modal: Forgot Password */}
          {showForgotPassword && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-zinc-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-black" />
                    Reset Account Password
                  </h3>
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotSent(false);
                    }}
                    className="text-xs text-zinc-400 hover:text-black font-semibold"
                  >
                    Close
                  </button>
                </div>

                {forgotSent ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Reset Link Dispatched
                    </div>
                    <p>
                      If an account exists for {forgotEmail}, a secure reset link has been dispatched to your email address.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                    <p className="text-xs text-zinc-500">
                      Enter your institutional email address to receive a secure password reset link.
                    </p>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@jainuniversity.ac.in"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
                    />
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-2 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      {forgotLoading ? 'Sending...' : 'Send Password Reset Link'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Security Banner Footer */}
          <div className="pt-2 text-center text-[10px] text-zinc-400 flex items-center justify-center gap-1.5 border-t border-zinc-100">
            <Lock className="w-3 h-3 text-zinc-400" />
            Protected by Supabase Auth, PostgreSQL Row-Level Security & Jain University Policies
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
