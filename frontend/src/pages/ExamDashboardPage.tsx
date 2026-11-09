import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  CalendarDays,
  DoorClosed,
  Binary,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Users,
  ArrowRight,
  ClipboardCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ExamDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [exams, setExams] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([api.getExams(), api.getRooms(), api.getDashboardStats()])
      .then(([examRes, roomRes, dashRes]) => {
        if (examRes.status === 'fulfilled' && examRes.value) {
          setExams(examRes.value);
        }
        if (roomRes.status === 'fulfilled' && roomRes.value) {
          setRooms(roomRes.value);
        }
        if (dashRes.status === 'fulfilled' && dashRes.value) {
          setPlans(dashRes.value.recent_plans || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-mono text-zinc-500">Loading Exam Staff Operations Dashboard...</p>
      </div>
    );
  }

  const examApprovedRooms = rooms.filter((r) => r.is_exam_approved);
  const pendingValidationPlans = plans.filter((p) => p.status === 'draft' || p.validation_status === 'pending');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono border border-zinc-200 mb-1">
              <CheckCircle2 className="w-3 h-3 text-black" />
              Examination Staff Operations
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">
              Exam Cell Operations Dashboard
            </h1>
            <p className="text-xs text-zinc-500">
              Schedule examinations, allocate examination halls, generate seating plans, and validate arrangements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/seating-planner"
            className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Binary className="w-3.5 h-3.5" />
            <span>Open Seating Planner</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Active Examinations
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-950">{exams.length}</div>
          <span className="text-[10px] text-zinc-400">Scheduled in current cycle</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Approved Exam Halls
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-950">{examApprovedRooms.length}</div>
          <span className="text-[10px] text-zinc-400">Total capacity inspected & approved</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Plans Awaiting Validation
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-950">{pendingValidationPlans.length}</div>
          <span className="text-[10px] text-zinc-400">Drafts pending mathematical review</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Generated Plans
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-950">{plans.length}</div>
          <span className="text-[10px] text-zinc-400">Saved seating arrangements</span>
        </div>
      </div>

      {/* Main Grid: Scheduled Exams & Operational Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Scheduled Examinations */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-black" />
                Assigned Examinations & Sessions
              </h3>
              <p className="text-[11px] text-zinc-500">Upcoming examination dates and sessions.</p>
            </div>
            <Link
              to="/examinations"
              className="text-xs font-semibold text-black hover:underline flex items-center gap-1"
            >
              Manage All Exams <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {exams.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">No scheduled examinations found.</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {exams.slice(0, 5).map((ex) => (
                <div key={ex.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-zinc-900">{ex.name}</h4>
                    <p className="text-[11px] text-zinc-500">
                      Date: <span className="font-semibold">{ex.exam_date}</span> • Session:{' '}
                      <span className="font-mono">{ex.session}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 text-zinc-800 capitalize">
                      {ex.status}
                    </span>
                    <Link
                      to="/seating-planner"
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-black text-white text-[10px] font-semibold transition-colors"
                    >
                      Plan Seating
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Quick Operational Links */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-bold text-zinc-950">Staff Operational Modules</h3>
            <p className="text-[11px] text-zinc-500">Direct shortcuts to examination workflows.</p>
          </div>

          <div className="space-y-2">
            <Link
              to="/seating-planner"
              className="p-3 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white flex items-center justify-center text-zinc-800 transition-colors">
                  <Binary className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900">Seating Planner</h4>
                  <p className="text-[10px] text-zinc-500">Run mathematical seat optimization</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/rooms"
              className="p-3 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white flex items-center justify-center text-zinc-800 transition-colors">
                  <DoorClosed className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900">Examination Halls</h4>
                  <p className="text-[10px] text-zinc-500">Manage seating grids & blocked desks</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/reports"
              className="p-3 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white flex items-center justify-center text-zinc-800 transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900">Reports & Notices</h4>
                  <p className="text-[10px] text-zinc-500">Hall-wise attendance sheets & PDF exports</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/students"
              className="p-3 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white flex items-center justify-center text-zinc-800 transition-colors">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900">Student Directory</h4>
                  <p className="text-[10px] text-zinc-500">Import student lists & verify enrollments</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
