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
    // Elegant monochromatic grayscale spectrum
    const palette = ['#09090b', '#27272a', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'];
    if (chartsData.students_by_program && chartsData.students_by_program.length > 0) {
      return chartsData.students_by_program.slice(0, 5).map((p, idx) => ({
        name: p.program,
        value: p.count,
        color: palette[idx % palette.length],
      }));
    }
    return [
      { name: 'CSE-GEN', value: 24, color: '#09090b' },
      { name: 'AIML', value: 20, color: '#27272a' },
      { name: 'AIDE', value: 5, color: '#52525b' },
      { name: 'MTech', value: 6, color: '#71717a' },
      { name: 'Others (11 Progs)', value: 39, color: '#a1a1aa' },
    ];
  }, [chartsData]);

  const quickStats = [
    {
      title: 'Total Examinations',
      value: stats.total_examinations,
      subtitle: `${stats.upcoming_exams} upcoming sessions`,
      icon: FileCheck2,
      iconColor: 'text-zinc-950 bg-zinc-100 border-zinc-200',
    },
    {
      title: 'Total Enrolled Students',
      value: stats.total_students,
      subtitle: `${stats.unallocated_students} pending allocation`,
      icon: Users,
      iconColor: 'text-zinc-950 bg-zinc-100 border-zinc-200',
    },
    {
      title: 'Examination Halls',
      value: stats.total_exam_halls,
      subtitle: `${stats.hall_utilization}% overall utilization`,
      icon: DoorClosed,
      iconColor: 'text-zinc-950 bg-zinc-100 border-zinc-200',
    },
    {
      title: 'Plans Generated',
      value: stats.seating_plans_generated,
      subtitle: 'Validated seating schedules',
      icon: Activity,
      iconColor: 'text-zinc-950 bg-zinc-100 border-zinc-200',
    },
    {
      title: 'Occupied Desk Seats',
      value: stats.occupied_seats,
      subtitle: `${stats.available_seats} available exam desks`,
      icon: Armchair,
      iconColor: 'text-zinc-950 bg-zinc-100 border-zinc-200',
    },
    {
      title: 'Academic Batches',
      value: stats.batches || TOTAL_BATCHES_COUNT,
      subtitle: `${stats.programs || TOTAL_PROGRAMS_COUNT} degree programs`,
      icon: GraduationCap,
      iconColor: 'text-zinc-950 bg-zinc-100 border-zinc-200',
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
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 lg:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 text-zinc-300 text-xs font-semibold mb-3 border border-zinc-700/80 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            Jain University • FET Campus Seating Operations
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
            SeatWise Allocation Console
          </h1>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Smart Classroom & Examination Seating Management System. Powered by bipartite graph theory,
            checkerboard coloring partitions, and CP-SAT constraint satisfaction.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/exam-seating"
            className="px-4 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2 border border-white cursor-pointer"
          >
            <Armchair className="w-4 h-4 text-black" />
            Generate Exam Seating
          </Link>
          <Link
            to="/math-analysis"
            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg text-xs font-semibold border border-zinc-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            Mathematical Engine
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-zinc-100 border border-zinc-300 rounded-xl text-zinc-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-zinc-700 shrink-0" />
            <span>Using offline default metrics: {error}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 bg-black text-white font-medium rounded-lg hover:bg-zinc-800 transition"
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
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-950">Batches by Academic Program</h2>
              <p className="text-xs text-zinc-500">
                15 engineering programs mapped across 94 undergraduate & postgraduate batches
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-zinc-100 text-zinc-800 rounded-md border border-zinc-200 font-mono">
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
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', color: '#fff', fontSize: '12px', border: '1px solid #27272a' }}
                />
                <Bar dataKey="batches" fill="#18181b" radius={[4, 4, 0, 0]} name="Batches" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Program Distribution Pie Chart */}
        <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-950">Batch Share Distribution</h2>
            <p className="text-xs text-zinc-500 mb-4">
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
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', color: '#fff', fontSize: '12px', border: '1px solid #27272a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-zinc-100">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-zinc-600 font-medium">{item.name}</span>
                </div>
                <span className="font-semibold text-zinc-900">{item.value} batches</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Upcoming Examinations & Recent Seating Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-black" />
              Upcoming Examinations
            </h2>
            <Link to="/examinations" className="text-xs font-semibold text-zinc-900 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingExams.length > 0 ? (
              upcomingExams.map((exam, i) => (
                <div key={i} className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900">{exam.name}</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
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

        <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
              <Armchair className="w-4 h-4 text-black" />
              Classroom & Examination Allocations
            </h2>
            <Link to="/history" className="text-xs font-semibold text-zinc-900 hover:underline">
              Seating history
            </Link>
          </div>

          <div className="space-y-3">
            {recentPlans.length > 0 ? (
              recentPlans.map((plan, i) => (
                <div key={i} className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900">
                        {plan.kind === 'examination' ? (plan.examinations?.name || 'Exam Seating Plan') : 'Classroom Seating'}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-200 text-zinc-800 rounded">
                        {plan.id ? plan.id.slice(0, 8) : 'PLAN'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {plan.kind} • Date: {plan.plan_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-900 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-black" />
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
