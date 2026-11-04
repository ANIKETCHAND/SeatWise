/**
 * Dashboard Statistics Hook.
 * 
 * Separates data fetching, metrics transformation, and aggregation logic
 * from the Dashboard UI presentation.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { TOTAL_PROGRAMS_COUNT, TOTAL_BATCHES_COUNT } from '../data/universityData';

export interface DashboardMetrics {
  total_examinations: number;
  total_students: number;
  total_exam_halls: number;
  seating_plans_generated: number;
  upcoming_exams: number;
  occupied_seats: number;
  available_seats: number;
  unallocated_students: number;
  hall_utilization: number;
  programs: number;
  batches: number;
  students: number;
  rooms: number;
  exam_halls: number;
  timetable_entries: number;
}

export interface ChartsData {
  students_by_program: Array<{ program: string; count: number }>;
  students_by_semester: Array<{ semester: string; count: number }>;
  hall_utilization: Array<{ name: string; capacity: number; occupied: number }>;
  plans_by_status: Array<{ name: string; value: number }>;
}

const initialMetrics: DashboardMetrics = {
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
};

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardMetrics>(initialMetrics);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartsData, setChartsData] = useState<ChartsData>({
    students_by_program: [],
    students_by_semester: [],
    hall_utilization: [],
    plans_by_status: [],
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardStats();
      if (data) {
        setIsConnected(data.is_connected !== false);
        if (data.counts) {
          setStats({
            total_examinations:
              data.counts.total_examinations ??
              data.counts.examinations ??
              (data.upcoming_exams?.length || 0),
            total_students: data.counts.total_students ?? data.counts.students ?? 0,
            total_exam_halls: data.counts.total_exam_halls ?? data.counts.exam_halls ?? 0,
            seating_plans_generated:
              data.counts.seating_plans_generated ?? (data.recent_plans?.length || 0),
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
    } catch (err: any) {
      setIsConnected(false);
      setError(err?.message || 'Failed to fetch dashboard statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    upcomingExams,
    recentPlans,
    chartsData,
    isConnected,
    loading,
    error,
    refetch: fetchStats,
  };
}

export default useDashboardStats;
