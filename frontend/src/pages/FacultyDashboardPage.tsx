import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  CalendarDays,
  DoorClosed,
  Armchair,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useDataSync } from '../services/syncService';

export const FacultyDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  const loadFacultyData = useCallback(() => {
    Promise.allSettled([api.getTimetable({}), api.getBatches(), api.getExams()])
      .then(([ttRes, batchRes, examRes]) => {
        if (ttRes.status === 'fulfilled' && ttRes.value) {
          setTimetable(ttRes.value);
        }
        if (batchRes.status === 'fulfilled' && batchRes.value) {
          setBatches(batchRes.value);
        }
        if (examRes.status === 'fulfilled' && examRes.value) {
          setExams(examRes.value);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useDataSync(loadFacultyData);

  useEffect(() => {
    setLoading(true);
    loadFacultyData();
  }, [loadFacultyData]);

  const publishedExams = exams.filter((e) => e.status === 'published');
  const allExamHalls = Array.from(
    new Set(publishedExams.flatMap((e) => e.halls || []))
  );

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
              Faculty
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">
              Faculty Dashboard
            </h1>
            <p className="text-xs text-zinc-500">
              {user?.full_name ? `${user.full_name} • ` : ''}Department of {user?.department || 'Engineering & Technology'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/classroom-seating"
            className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Armchair className="w-3.5 h-3.5" />
            <span>Classroom Seating</span>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
            Published Exams
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600">{publishedExams.length}</div>
          <span className="text-[10px] text-zinc-400">Seating charts active</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Assigned Exam Halls
          </span>
          <div className="text-2xl font-bold font-mono text-zinc-950">{allExamHalls.length}</div>
          <span className="text-[10px] text-zinc-400">Invigilation venues</span>
        </div>
      </div>

      {/* Published Examination Schedules & Assigned Halls */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              Published Examinations & Assigned Halls
            </h3>
            <p className="text-[11px] text-zinc-500">Live examination schedules, participating cohorts, and hall allocations.</p>
          </div>
          <Link to="/seat-lookup" className="text-xs font-semibold text-black hover:underline flex items-center gap-1">
            <Search className="w-3.5 h-3.5" /> Seat Lookup
          </Link>
        </div>

        {publishedExams.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No published examination seating plans at this moment. Published plans will automatically appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publishedExams.map((ex) => (
              <div key={ex.id} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">{ex.name}</h4>
                    <p className="text-[11px] text-zinc-500">
                      Date: <span className="font-semibold text-zinc-800">{ex.exam_date}</span> • Session:{' '}
                      <span className="font-mono uppercase font-semibold text-zinc-800">{ex.session}</span>
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 font-semibold uppercase">
                    Published
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-zinc-200/60 text-xs">
                  <div className="flex items-center gap-2 text-zinc-600">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Halls:</span>
                    <div className="flex flex-wrap gap-1">
                      {(ex.halls || []).length > 0 ? (
                        (ex.halls || []).map((h: string, hIdx: number) => (
                          <span
                            key={hIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-zinc-300 text-[10px] font-mono font-bold text-zinc-900 shadow-2xs"
                          >
                            <DoorClosed className="w-2.5 h-2.5 text-zinc-500" />
                            {h}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-mono">None specified</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-600">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Batches:</span>
                    <span className="text-[11px] text-zinc-700 font-mono">
                      {(ex.batches || []).join(', ') || 'General'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Link
                    to={`/seat-lookup?exam=${ex.id}`}
                    className="text-[11px] font-semibold text-black hover:underline flex items-center gap-1"
                  >
                    View Allocated Seats <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
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
            <h3 className="text-sm font-bold text-zinc-950">Quick Actions</h3>
            <p className="text-[11px] text-zinc-500">Common faculty tasks.</p>
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
                  <p className="text-[10px] text-zinc-500">Arrange student seating for lectures</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/seat-lookup"
              className="p-3 rounded-xl border border-zinc-200 hover:border-black bg-white hover:bg-zinc-50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 group-hover:bg-black group-hover:text-white flex items-center justify-center text-zinc-800 transition-colors">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900">Seat Lookup</h4>
                  <p className="text-[10px] text-zinc-500">Find candidate examination desks</p>
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
                  <h4 className="text-xs font-semibold text-zinc-900">Timetable</h4>
                  <p className="text-[10px] text-zinc-500">View weekly period schedule</p>
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
                  <h4 className="text-xs font-semibold text-zinc-900">Reports</h4>
                  <p className="text-[10px] text-zinc-500">View attendance and seating reports</p>
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
