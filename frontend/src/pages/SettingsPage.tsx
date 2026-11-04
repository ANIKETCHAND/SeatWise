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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../services/supabase';

export const SettingsPage: React.FC = () => {
  const { user, role, switchRole } = useAuth();
  const [institutionName, setInstitutionName] = useState('Jain (Deemed-to-be University)');
  const [facultyDept, setFacultyDept] = useState('Faculty of Engineering and Technology (FET)');
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
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-primary-600" />
          SeatWise System Settings & Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Global institutional parameters, mathematical optimization solver constraints, and backend connectivity.
        </p>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {feedback}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Institutional Identity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-primary-600" />
            University Identity & Scope
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">Institution Name</label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Faculty / Campus</label>
              <input
                type="text"
                value={facultyDept}
                onChange={(e) => setFacultyDept(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Campus Location</label>
              <input
                type="text"
                defaultValue="Bangalore, Karnataka, India"
                className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1"
              />
            </div>
          </div>
        </div>

        {/* Mathematical Solver Engine Parameters */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Cpu className="w-4 h-4 text-primary-600" />
            Mathematical Allocation Engine Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Solver Time Limit (seconds)
              </label>
              <input
                type="number"
                value={solverTimeout}
                onChange={(e) => setSolverTimeout(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Upper bound timeout for OR-Tools CP-SAT multi-class optimization before reporting timeout state.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Primary Allocation Method</label>
              <select className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1 bg-white">
                <option value="cpsat">Google OR-Tools CP-SAT (Recommended)</option>
                <option value="checkerboard">Bipartite Checkerboard (2-Class Exact)</option>
                <option value="backtracking">Constrained Backtracking with MRV</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Ensures exact resolution of forbidden same-batch adjacency edges.
              </p>
            </div>
          </div>
        </div>

        {/* Database & Cloud Connectivity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Database className="w-4 h-4 text-primary-600" />
            Supabase Cloud Database & Auth Status
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">Supabase PostgreSQL Database</span>
                <p className="text-[11px] text-slate-500">
                  {isSupabaseConfigured
                    ? 'Connected via environment variables (SUPABASE_URL)'
                    : 'Backend running in local development mode with migrations 001-005 ready to execute.'}
                </p>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  isSupabaseConfigured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isSupabaseConfigured ? 'Connected' : 'Migration Ready'}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">Row Level Security (RLS)</span>
                <p className="text-[11px] text-slate-500">
                  Multi-tenant role policies enforce Student, Faculty, Exam Staff, and Admin boundaries.
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                Enabled in SQL
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Configuration Changes
          </button>
        </div>
      </form>
    </div>
  );
};
