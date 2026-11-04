import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  DoorClosed,
  FileCheck2,
  Armchair,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertCircle,
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
import { useDashboardStats } from '../hooks/useDashboardStats';
import { StatCard } from '../components/common/StatCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { INITIAL_PROGRAMS, TOTAL_BATCHES_COUNT, TOTAL_PROGRAMS_COUNT } from '../data/universityData';

export const DashboardPage: React.FC = () => {
  const { stats, upcomingExams, recentPlans, chartsData, loading, error, refetch } = useDashboardStats();

  const programChartData = useMemo(() => {
    if (chartsData.students_by_program && chartsData.students_by_program.length > 0) {
      return chartsData.students_by_program.map((p) => ({
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
      return chartsData.students_by_program.slice(0, 5).map((p, idx) => ({
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
    {
      title: 'Total Examinations',
      value: stats.total_examinations,
      subtitle: `${stats.upcoming_exams} upcoming sessions`,
      icon: FileCheck2,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      title: 'Total Enrolled Students',
      value: stats.total_students,
      subtitle: `${stats.unallocated_students} pending allocation`,
      icon: Users,
      iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Examination Halls',
      value: stats.total_exam_halls,
      subtitle: `${stats.hall_utilization}% overall utilization`,
      icon: DoorClosed,
      iconColor: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      title: 'Plans Generated',
      value: stats.seating_plans_generated,
      subtitle: 'Validated seating schedules',
      icon: Activity,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Occupied Desk Seats',
      value: stats.occupied_seats,
      subtitle: `${stats.available_seats} available exam desks`,
      icon: Armchair,
      iconColor: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      title: 'Academic Batches',
      value: stats.batches || TOTAL_BATCHES_COUNT,
      subtitle: `${stats.programs || TOTAL_PROGRAMS_COUNT} degree programs`,
      icon: GraduationCap,
      iconColor: 'text-rose-600 bg-rose-50 border-rose-100',
    },
  ];

  if (loading && stats.total_students === 0) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading SeatWise Dashboard Metrics..." />
      </div>
    );
  }

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

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Using offline default metrics: {error}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {quickStats.map((kpi, idx) => (
          <StatCard
            key={idx}
            title={kpi.title}
            value={kpi.value.toLocaleString()}
            subtitle={kpi.subtitle}
            icon={kpi.icon}
            iconColor={kpi.iconColor}
          />
        ))}
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
                  <StatusBadge status={exam.status || 'draft'} />
                </div>
              ))
            ) : (
              <EmptyState
                icon={FileCheck2}
                title="No scheduled examinations found"
                description="Use Examination Management to create upcoming exam sessions."
              />
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
                      <span className="text-xs font-bold text-slate-800">
                        {plan.kind === 'examination' ? (plan.examinations?.name || 'Exam Seating Plan') : 'Classroom Seating'}
                      </span>
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
              <EmptyState
                icon={Armchair}
                title="No seating plans generated yet"
                description="Generate seating via Classroom Seating (Mode A) or Exam Seating (Mode B)."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
