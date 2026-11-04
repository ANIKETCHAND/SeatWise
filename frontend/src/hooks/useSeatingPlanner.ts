/**
 * Seating Planner Business Logic Hook.
 * 
 * Extracts allocation generation, seat movements, validation checks,
 * attendance toggling, and plan persistence from the ExamSeatingPage UI.
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { SeatingPolicy } from '../types';
import { checkAllocationConflicts } from '../utils/seatingMath';
import { CAMPUS_ROOMS } from '../data/campusFloorData';

export interface DeskCell {
  seat_label: string;
  row: number;
  col: number;
  is_blocked?: boolean;
  is_locked?: boolean;
  student_id?: string;
  roll_number?: string;
  student_name?: string;
  batch?: string;
  attendance?: 'present' | 'absent';
}

export interface ExamOption {
  id: string;
  name: string;
  exam_date?: string;
  session?: string;
  batches?: string[];
  halls?: string[];
}

export const INITIAL_EXAMS: ExamOption[] = [
  {
    id: 'EXAM-2026-1101',
    name: 'Mid-Term Examinations - Computer Science & AI',
    exam_date: '2026-11-20',
    session: 'morning',
    batches: ['AIML-S3A', 'CSE-GEN-S3B', 'AIDE-S3A'],
    halls: ['A-101', 'A-102', 'A-313'],
  },
  {
    id: 'EXAM-2026-1102',
    name: 'Semester End Theory Assessment - Cycle II',
    exam_date: '2026-11-25',
    session: 'afternoon',
    batches: ['CSE-GEN-S3B', 'AIDE-S3A'],
    halls: ['A-201', 'B-125-A'],
  },
  {
    id: 'EXAM-2026-1103',
    name: 'Postgraduate Masters Degree Assessment',
    exam_date: '2026-12-02',
    session: 'morning',
    batches: ['AIML-S3A'],
    halls: ['A-314', 'C-327'],
  },
];

export const INITIAL_HALLS_CONFIG: Record<string, { rows: number; cols: number; blocked: string[] }> = {
  'LH-101': { rows: 6, cols: 6, blocked: ['0-2', '2-4'] },
  'LH-102': { rows: 6, cols: 8, blocked: ['1-3', '3-5', '5-0'] },
  'EXAM-HALL-MAIN': { rows: 8, cols: 10, blocked: ['0-0', '0-9'] },
  'LH-201': { rows: 5, cols: 8, blocked: [] },
};

CAMPUS_ROOMS.forEach((r) => {
  INITIAL_HALLS_CONFIG[r.room_number] = {
    rows: r.rows || 6,
    cols: r.columns || 6,
    blocked: r.blocked_seats || [],
  };
});

export const INITIAL_BATCH_COUNTS: Record<string, number> = {
  'AIML-S3A': 20,
  'CSE-GEN-S3B': 18,
  'AIDE-S3A': 14,
};

export function generateInitialAssignments(
  hallName: string,
  hallsConfig: Record<string, { rows: number; cols: number; blocked: string[] }>,
  batchCounts: Record<string, number>
): Record<string, DeskCell> {
  const config = hallsConfig[hallName] || { rows: 6, cols: 6, blocked: [] };
  const grid: Record<string, DeskCell> = {};
  const batches = Object.keys(batchCounts);
  const studentCounters: Record<string, number> = {};
  batches.forEach((b) => (studentCounters[b] = 1));

  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.cols; c++) {
      const key = `${r}-${c}`;
      const rowLetter = String.fromCharCode(65 + r);
      const seatLabel = `${rowLetter}${c + 1}`;

      if (config.blocked.includes(key)) {
        grid[key] = {
          seat_label: seatLabel,
          row: r,
          col: c,
          is_blocked: true,
        };
        continue;
      }

      const batchIdx = (r + c) % batches.length;
      const bName = batches[batchIdx];
      const num = studentCounters[bName]++;
      grid[key] = {
        seat_label: seatLabel,
        row: r,
        col: c,
        is_blocked: false,
        is_locked: false,
        student_id: `23JU0${batchIdx + 1}${num.toString().padStart(2, '0')}`,
        batch: bName,
        roll_number: `23JU0${batchIdx + 1}${num.toString().padStart(2, '0')}`,
        student_name: `Candidate ${bName.split('-')[0]} #${num}`,
        attendance: 'present',
      };
    }
  }
  return grid;
}

export function useSeatingPlanner(initialExamId?: string | null, initialPlanId?: string | null) {
  const [availableExams, setAvailableExams] = useState<ExamOption[]>(INITIAL_EXAMS);
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || 'EXAM-2026-1101');
  const [selectedHalls, setSelectedHalls] = useState<string[]>(['A-101', 'A-102', 'A-313']);
  const [activeHall, setActiveHall] = useState('A-101');
  const [savedPlanId, setSavedPlanId] = useState<string | null>(initialPlanId || null);

  const [policy, setPolicy] = useState<SeatingPolicy>({
    block_same_batch_horizontal: true,
    block_same_batch_vertical: true,
    block_same_batch_diagonal: false,
    allow_empty_seats: true,
    allow_mixed_batches: true,
    separate_programs: true,
  });

  const [hallsConfig, setHallsConfig] = useState(INITIAL_HALLS_CONFIG);
  const [batchCounts, setBatchCounts] = useState(INITIAL_BATCH_COUNTS);

  const [allocationGrid, setAllocationGrid] = useState<Record<string, Record<string, DeskCell>>>({
    'A-101': generateInitialAssignments('A-101', INITIAL_HALLS_CONFIG, INITIAL_BATCH_COUNTS),
    'A-102': generateInitialAssignments('A-102', INITIAL_HALLS_CONFIG, INITIAL_BATCH_COUNTS),
    'A-313': generateInitialAssignments('A-313', INITIAL_HALLS_CONFIG, INITIAL_BATCH_COUNTS),
    'LH-101': generateInitialAssignments('LH-101', INITIAL_HALLS_CONFIG, INITIAL_BATCH_COUNTS),
    'LH-102': generateInitialAssignments('LH-102', INITIAL_HALLS_CONFIG, INITIAL_BATCH_COUNTS),
  });

  // Fetch available exams from backend
  useEffect(() => {
    api.getExams()
      .then((data) => {
        if (data && data.length > 0) {
          const mapped: ExamOption[] = data.map((e: any) => ({
            id: e.id,
            name: e.name,
            exam_date: e.exam_date,
            session: e.session,
            batches: e.batches && e.batches.length > 0 ? e.batches : ['AIML-S3A', 'CSE-GEN-S3B'],
            halls: (e.examination_halls && e.examination_halls.length > 0)
              ? e.examination_halls.map((h: any) => h.rooms?.code || h.rooms?.name || h.room_id)
              : (e.halls && e.halls.length > 0) ? e.halls : ['A-101', 'A-102', 'A-313'],
          }));
          setAvailableExams(mapped);
        }
      })
      .catch(() => {
        // Fallback already present
      });
  }, []);

  const toggleAttendance = useCallback((hall: string, key: string) => {
    setAllocationGrid((prev) => {
      const hallGrid = { ...(prev[hall] || {}) };
      const current = hallGrid[key];
      if (!current) return prev;
      const nextAtt = current.attendance === 'absent' ? 'present' : 'absent';
      hallGrid[key] = { ...current, attendance: nextAtt };
      return { ...prev, [hall]: hallGrid };
    });
  }, []);

  const toggleLock = useCallback((hall: string, key: string) => {
    setAllocationGrid((prev) => {
      const hallGrid = { ...(prev[hall] || {}) };
      const current = hallGrid[key];
      if (!current) return prev;
      hallGrid[key] = { ...current, is_locked: !current.is_locked };
      return { ...prev, [hall]: hallGrid };
    });
  }, []);

  const validateGrid = useCallback(
    (hall: string) => {
      const grid = allocationGrid[hall] || {};
      const config = hallsConfig[hall] || { rows: 6, cols: 6 };
      return checkAllocationConflicts(grid, config.rows, config.cols, policy);
    },
    [allocationGrid, hallsConfig, policy]
  );

  return {
    availableExams,
    selectedExamId,
    setSelectedExamId,
    selectedHalls,
    setSelectedHalls,
    activeHall,
    setActiveHall,
    savedPlanId,
    setSavedPlanId,
    policy,
    setPolicy,
    hallsConfig,
    setHallsConfig,
    batchCounts,
    setBatchCounts,
    allocationGrid,
    setAllocationGrid,
    toggleAttendance,
    toggleLock,
    validateGrid,
  };
}

export default useSeatingPlanner;
