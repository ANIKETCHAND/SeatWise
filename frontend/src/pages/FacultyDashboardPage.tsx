import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  CalendarDays,
  Users,
  Armchair,
  FileCheck2,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const FacultyDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([api.getTimetable({}), api.getBatches()])
      .then(([ttRes, batchRes]) => {
        if (ttRes.status === 'fulfilled' && ttRes.value) {
          setTimetable(ttRes.value);
        }
        if (batchRes.status === 'fulfilled' && batchRes.value) {
          setBatches(batchRes.value);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-mono text-zinc-500">Loading Faculty Academic Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono border border-zinc-200 mb-1">
              <CheckCircle2 className="w-3 h-3 text-black" />
              Faculty Academic Operations
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">
              {user?.full_name || 'Faculty Member'} — Academic Portal
            </h1>
            <p className="text-xs text-zinc-500">
              Department of {user?.department || 'Engineering & Technology'} • Academic Year 2026-2027
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/classroom-seating"
            className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Armchair className="w-3.5 h-3.5" />
            <span>Classroom Seating Planner</span>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Assigned Batches
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-950">{batches.length || 6}</div>
          <span className="text-[10px] text-zinc-400">Classrooms and sections</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Scheduled Periods
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-950">{timetable.length}</div>
          <span className="text-[10px] text-zinc-400">Timetable slots this week</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Academic Scope
          </span>
          <div className="text-sm font-bold text-zinc-950 pt-1">
            {user?.department || 'Computer Science & Engineering'}
          </div>
          <span className="text-[10px] text-zinc-400">Authorized departmental courses</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timetable Schedule */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-black" />
                Assigned Timetable Schedule
              </h3>
              <p className="text-[11px] text-zinc-500">Weekly teaching timetable and room assignments.</p>
            </div>
            <Link to="/timetable" className="text-xs font-semibold text-black hover:underline flex items-center gap-1">
              View Full Timetable <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {timetable.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">No timetable entries assigned.</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {timetable.slice(0, 6).map((tt, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">{tt.subject_label || 'Lecture'}</span>
                    <span className="text-[11px] text-zinc-500">
                      Day: <span className="font-semibold">{tt.day}</span> • Period {tt.period_start} to {tt.period_end} • Room:{' '}
                      <span className="font-mono">{tt.room_name || 'Classroom'}</span>
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 text-zinc-800">
                    {tt.slot_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Quick Actions */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-bold text-zinc-950">Faculty Actions</h3>
            <p className="text-[11px] text-zinc-500">Shortcuts for academic operations.</p>
          </div>

          <div className="space-y-2">
            <Link
              to="/classroom-seating"
              className="p-3 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white flex items-center justify-center text-zinc-800 transition-colors">
                  <Armchair className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900">Classroom Seating</h4>
                  <p className="text-[10px] text-zinc-500">Arrange students for lecture sessions</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/timetable"
              className="p-3 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white flex items-center justify-center text-zinc-800 transition-colors">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900">Academic Timetable</h4>
                  <p className="text-[10px] text-zinc-500">View weekly schedules & period slots</p>
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
                  <h4 className="text-xs font-semibold text-zinc-900">Attendance Reports</h4>
                  <p className="text-[10px] text-zinc-500">Export student attendance & seating charts</p>
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
