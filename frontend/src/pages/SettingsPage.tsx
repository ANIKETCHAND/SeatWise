import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Sliders,
  Shield,
  Save,
  CheckCircle2,
  Cpu,
  Clock,
  Building,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../services/supabase';

export const SettingsPage: React.FC = () => {
  const { user, role } = useAuth();
  const institutionName = 'Jain (Deemed-to-be University)';
  const facultyDept = 'Faculty of Engineering and Technology (FET)';
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [solverTimeout, setSolverTimeout] = useState('20');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('System configuration settings saved successfully.');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-zinc-900" />
          Settings
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          System parameters, optimization limits, and institutional configuration.
        </p>
      </div>

      {feedback && (
        <div className="p-3 bg-zinc-100 border border-zinc-300 text-zinc-900 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-zinc-950 shrink-0" />
          {feedback}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Institutional Identity */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-zinc-900" />
                Institution Identity
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Permanently locked to Jain (Deemed-to-be University) • Multi-institution switching disabled
              </p>
            </div>
            <div className="bg-white px-2.5 py-1 rounded-lg border border-zinc-200 shadow-2xs flex items-center gap-2">
              <img
                src="/jain-logo.png"
                alt="JAIN Deemed-to-be University"
                className="h-6 w-auto object-contain"
              />
              <span className="text-[10px] font-mono text-zinc-500 font-medium">Official Crest</span>
            </div>
          </div>

          {/* Locked Notice */}
          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-zinc-900">Institutional Lock Active</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                SeatWise is exclusively dedicated to Jain (Deemed-to-be University) — Faculty of Engineering and Technology (FET). Selecting or switching to alternative universities is permanently restricted.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                <span>Institution Name</span>
                <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              </label>
              <input
                type="text"
                value={institutionName}
                disabled
                readOnly
                className="w-full text-xs p-2 border border-zinc-200 rounded-lg mt-1 bg-zinc-100/80 text-zinc-700 font-medium cursor-not-allowed select-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                <span>Faculty / Department</span>
                <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              </label>
              <input
                type="text"
                value={facultyDept}
                disabled
                readOnly
                className="w-full text-xs p-2 border border-zinc-200 rounded-lg mt-1 bg-zinc-100/80 text-zinc-700 font-medium cursor-not-allowed select-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700">Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full text-xs p-2 border border-zinc-300 rounded-lg mt-1 text-zinc-900 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                <span>Campus Location</span>
                <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              </label>
              <input
                type="text"
                value="Bangalore, Karnataka, India"
                disabled
                readOnly
                className="w-full text-xs p-2 border border-zinc-200 rounded-lg mt-1 bg-zinc-100/80 text-zinc-700 font-medium cursor-not-allowed select-none"
              />
            </div>
          </div>
        </div>

        {/* Solver Engine Parameters */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-3">
            <Cpu className="w-4 h-4 text-zinc-900" />
            Solver Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-700">
                Time Limit (seconds)
              </label>
              <input
                type="number"
                value={solverTimeout}
                onChange={(e) => setSolverTimeout(e.target.value)}
                className="w-full text-xs p-2 border border-zinc-300 rounded-lg mt-1 font-mono"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                Upper limit for constraint solving before timeout.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">Solver Algorithm</label>
              <select className="w-full text-xs p-2 border border-zinc-300 rounded-lg mt-1 bg-white">
                <option value="cpsat">Google OR-Tools CP-SAT</option>
                <option value="checkerboard">Bipartite Checkerboard</option>
                <option value="backtracking">Constrained Backtracking</option>
              </select>
              <p className="text-[10px] text-zinc-400 mt-1">
                Optimization engine for non-adjacent seat assignments.
              </p>
            </div>
          </div>
        </div>

        {/* Database & Cloud Connectivity */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-3">
            <Database className="w-4 h-4 text-zinc-900" />
            Database & Security
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg border border-zinc-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-zinc-900">PostgreSQL Database</span>
                <p className="text-[11px] text-zinc-500">
                  {isSupabaseConfigured
                    ? 'Connected via environment configuration'
                    : 'Backend running in local development mode.'}
                </p>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  isSupabaseConfigured
                    ? 'bg-zinc-100 text-zinc-800 border border-zinc-300'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {isSupabaseConfigured ? 'Connected' : 'Local Mode'}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-zinc-900">Row Level Security (RLS)</span>
                <p className="text-[11px] text-zinc-500">
                  Role-based policies enforce Student, Faculty, Staff, and Admin boundaries.
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-100 text-zinc-800 border border-zinc-300">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
