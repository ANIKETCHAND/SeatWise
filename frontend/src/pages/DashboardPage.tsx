import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  DoorClosed,
  CalendarDays,
  FileCheck2,
  Armchair,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { INITIAL_PROGRAMS, TOTAL_BATCHES_COUNT, TOTAL_PROGRAMS_COUNT } from '../data/universityData';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>({
    total_examinations: 0,
    total_students: 0,
    total_exam_halls: 0,
    seating_plans_generated: 0,
    upcoming_exams: 0,
    occupied_seats: 0,
    available_seats: 0,
    unallocated_students: 0,
    hall_utilization: 0,
    programs: TOTAL_PROGRAMS_COUNT,
    batches: TOTAL_BATCHES_COUNT,
    students: 0,
    rooms: 0,
    exam_halls: 0,
    timetable_entries: 0,
  });
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartsData, setChartsData] = useState<any>({
    students_by_program: [],
    students_by_semester: [],
    hall_utilization: [],
    plans_by_status: [],
  });

  useEffect(() => {
    api.getDashboardStats()
      .then((data) => {
        if (data) {
          setIsConnected(data.is_connected !== false);
          if (data.counts) {
            setStats({
              total_examinations: data.counts.total_examinations ?? data.counts.examinations ?? (data.upcoming_exams?.length || 0),
              total_students: data.counts.total_students ?? data.counts.students ?? 0,
              total_exam_halls: data.counts.total_exam_halls ?? data.counts.exam_halls ?? 0,
              seating_plans_generated: data.counts.seating_plans_generated ?? (data.recent_plans?.length || 0),
              upcoming_exams: data.upcoming_exams?.length ?? 0,
              occupied_seats: data.counts.occupied_seats ?? 0,
              available_seats: data.counts.available_seats ?? 0,
              unallocated_students: data.counts.unallocated_students ?? 0,
              hall_utilization: data.counts.hall_utilization ?? 0,
              programs: data.counts.programs ?? 0,
              batches: data.counts.batches ?? 0,
              students: data.counts.students ?? 0,
              rooms: data.counts.classrooms ?? 0,
              exam_halls: data.counts.exam_halls ?? 0,
              timetable_entries: data.counts.timetable_entries ?? 0,
            });
          }
          if (data.upcoming_exams) setUpcomingExams(data.upcoming_exams);
          if (data.recent_plans) setRecentPlans(data.recent_plans);
          if (data.charts) setChartsData(data.charts);
        }
      })
      .catch(() => {
        setIsConnected(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const programChartData = useMemo(() => {
    if (chartsData.students_by_program && chartsData.students_by_program.length > 0) {
      return chartsData.students_by_program.map((p: any) => ({
        name: p.program,
        batches: p.count,
      }));
    }
    return INITIAL_PROGRAMS.map((p) => ({
      name: p.code,
      batches: p.batches.length,
    }));
  }, [chartsData]);

  const pieData = useMemo(() => {
    if (chartsData.students_by_program && chartsData.students_by_program.length > 0) {
      const palette = ['#3b82f6', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
      return chartsData.students_by_program.slice(0, 5).map((p: any, idx: number) => ({
        name: p.program,
        value: p.count,
        color: palette[idx % palette.length],
      }));
    }
    return [
      { name: 'CSE-GEN', value: 24, color: '#3b82f6' },
      { name: 'AIML', value: 20, color: '#6366f1' },
      { name: 'AIDE', value: 5, color: '#06b6d4' },
      { name: 'MTech', value: 6, color: '#10b981' },
      { name: 'Others (11 Progs)', value: 39, color: '#f59e0b' },
    ];
  }, [chartsData]);

  const quickStats = [
    { label: 'Total Examinations', value: stats.total_examinations, sub: `${stats.upcoming_exams} upcoming sessions`, icon: FileCheck2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Enrolled Students', value: stats.total_students, sub: `${stats.unallocated_students} pending allocation`, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Examination Halls', value: stats.total_exam_halls, sub: `${stats.hall_utilization}% overall utilization`, icon: DoorClosed, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Plans Generated', value: stats.seating_plans_generated, sub: 'Validated seating schedules', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Occupied Desk Seats', value: stats.occupied_seats, sub: `${stats.available_seats} available exam desks`, icon: Armchair, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Academic Batches', value: stats.batches || TOTAL_BATCHES_COUNT, sub: `${stats.programs || TOTAL_PROGRAMS_COUNT} degree programs`, icon: GraduationCap, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-primary-900 to-slate-800 rounded-2xl p-6 lg:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-xs font-semibold mb-3 border border-primary-400/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary-400" />
            Jain University • FET Campus Seating Operations
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            SeatWise Allocation Console
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
            Smart Classroom & Examination Seating Management System. Powered by bipartite graph theory,
            checkerboard coloring partitions, and CP-SAT constraint satisfaction.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/exam-seating"
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all flex items-center gap-2"
          >
            <Armchair className="w-4 h-4" />
            Generate Exam Seating
          </Link>
          <Link
            to="/math-analysis"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2"
          >
            Mathematical Engine
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {quickStats.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800 tracking-tight">
                {kpi.value.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches by Program Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Batches by Academic Program</h2>
              <p className="text-xs text-slate-500">
                15 engineering programs mapped across 94 undergraduate & postgraduate batches
              </p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md">
              94 Total Batches
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={programChartData} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="batches" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Batches" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Program Distribution Pie Chart */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Batch Share Distribution</h2>
            <p className="text-xs text-slate-500 mb-4">
              Breakdown of total academic sections by major departments
            </p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{item.value} batches</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Upcoming Examinations & Recent Seating Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-primary-600" />
              Upcoming Examinations
            </h2>
            <Link to="/examinations" className="text-xs font-semibold text-primary-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingExams.length > 0 ? (
              upcomingExams.map((exam, i) => (
                <div key={i} className="p-3.5 rounded-lg border border-slate-200/70 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">{exam.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {exam.exam_date} • Session: {exam.session}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${exam.status === 'allocated' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {exam.status || 'Draft'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                <FileCheck2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">No scheduled examinations found</p>
                <p className="mt-1 text-[11px]">Use Examination Management to create upcoming exam sessions.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Armchair className="w-4 h-4 text-primary-600" />
              Classroom & Examination Allocations
            </h2>
            <Link to="/history" className="text-xs font-semibold text-primary-600 hover:underline">
              Seating history
            </Link>
          </div>

          <div className="space-y-3">
            {recentPlans.length > 0 ? (
              recentPlans.map((plan, i) => (
                <div key={i} className="p-3.5 rounded-lg border border-slate-200/70 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{plan.kind === 'examination' ? (plan.examinations?.name || 'Exam Seating Plan') : 'Classroom Seating'}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                        {plan.id ? plan.id.slice(0, 8) : 'PLAN'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {plan.kind} • Date: {plan.plan_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {plan.validation_status || 'Validated'}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                <Armchair className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">No seating plans generated yet</p>
                <p className="mt-1 text-[11px]">Generate seating via Classroom Seating (Mode A) or Exam Seating (Mode B).</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
