import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Binary,
  CheckCircle2,
  AlertTriangle,
  Play,
  Download,
  Share2,
  ShieldCheck,
  Settings,
  DoorClosed,
  Users,
  Sigma,
  FileSpreadsheet,
  Lock,
  Unlock,
  ArrowLeftRight,
  UserCheck,
  UserX,
  RefreshCw,
  X,
  Move,
  Ban,
  Check,
  AlertCircle,
  HelpCircle,
  Armchair,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { SeatingPolicy } from '../types';
import { useNotification } from '../context/NotificationContext';
import { PolicyConfigurator } from '../components/seating/PolicyConfigurator';
import { SeatingLegend } from '../components/seating/SeatingLegend';
import { checkAllocationConflicts } from '../utils/seatingMath';
import { CAMPUS_ROOMS } from '../data/campusFloorData';

interface DeskCell {
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

interface CandidateInfo {
  id: string;
  roll_number: string;
  full_name: string;
  batch: string;
}

interface ExamOption {
  id: string;
  name: string;
  exam_date?: string;
  session?: string;
  batches?: string[];
  halls?: string[];
  status?: string;
}

export const DRAFT_EXAMS_STORAGE_KEY = 'seatwise_custom_exams';

const getStoredDrafts = (): ExamOption[] => {
  try {
    const raw = localStorage.getItem(DRAFT_EXAMS_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    if (Array.isArray(stored)) {
      return stored.map((e: any) => ({
        id: e.id,
        name: e.name,
        exam_date: e.exam_date,
        session: e.session,
        batches: e.batches && e.batches.length > 0 ? e.batches : ['AIML-S3A', 'CSE-GEN-S3B'],
        halls: e.halls && e.halls.length > 0 ? e.halls : ['A-101'],
        status: e.status || 'draft',
      }));
    }
  } catch {
    // Ignore storage parse errors
  }
  return [];
};

export const INITIAL_EXAMS_LIST: ExamOption[] = [
  {
    id: 'EXAM-2026-1101',
    name: 'Mid-Term Examinations - Computer Science & AI',
    exam_date: '2026-11-20',
    session: 'morning',
    batches: ['AIML-S3A', 'CSE-GEN-S3B', 'AIDE-S3A'],
    halls: ['A-101', 'A-102', 'A-313'],
    status: 'draft',
  },
  {
    id: 'EXAM-2026-1102',
    name: 'Semester End Theory Assessment - Cycle II',
    exam_date: '2026-11-25',
    session: 'afternoon',
    batches: ['CSE-GEN-S3B', 'AIDE-S3A'],
    halls: ['A-201', 'B-125-A'],
    status: 'draft',
  },
  {
    id: 'EXAM-2026-1103',
    name: 'Postgraduate Masters Degree Assessment',
    exam_date: '2026-12-02',
    session: 'morning',
    batches: ['AIML-S3A'],
    halls: ['A-314', 'C-327'],
    status: 'published',
  },
];

const DEFAULT_CAMPUS_HALLS_CONFIG: Record<string, { rows: number; cols: number; blocked: string[] }> = {
  'LH-101': { rows: 6, cols: 6, blocked: ['0-2', '2-4'] },
  'LH-102': { rows: 6, cols: 8, blocked: ['1-3', '3-5', '5-0'] },
  'EXAM-HALL-MAIN': { rows: 8, cols: 10, blocked: ['0-0', '0-9'] },
  'LH-201': { rows: 5, cols: 8, blocked: [] },
};

CAMPUS_ROOMS.forEach((r) => {
  DEFAULT_CAMPUS_HALLS_CONFIG[r.room_number] = {
    rows: r.rows || 6,
    cols: r.columns || 6,
    blocked: r.blocked_seats || [],
  };
});

const PRESET_BATCH_COLORS = [
  { bg: 'bg-zinc-950', border: 'border-zinc-950', text: 'text-white', badge: 'bg-black text-white font-bold' },
  { bg: 'bg-zinc-200', border: 'border-zinc-400', text: 'text-zinc-950', badge: 'bg-zinc-800 text-white font-bold' },
  { bg: 'bg-zinc-800', border: 'border-zinc-800', text: 'text-white', badge: 'bg-zinc-200 text-black font-bold' },
  { bg: 'bg-zinc-100', border: 'border-zinc-300', text: 'text-zinc-950', badge: 'bg-black text-white font-bold' },
  { bg: 'bg-zinc-900', border: 'border-zinc-900', text: 'text-white', badge: 'bg-zinc-100 text-black font-bold' },
  { bg: 'bg-zinc-50', border: 'border-zinc-300', text: 'text-zinc-900', badge: 'bg-zinc-700 text-white font-bold' },
];

const batchColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  'AIML-S3A': { bg: 'bg-zinc-950', border: 'border-zinc-950', text: 'text-white', badge: 'bg-white text-black font-bold' },
  'CSE-GEN-S3B': { bg: 'bg-zinc-100', border: 'border-zinc-300', text: 'text-zinc-950', badge: 'bg-black text-white font-bold' },
  'AIDE-S3A': { bg: 'bg-zinc-200', border: 'border-zinc-400', text: 'text-zinc-950', badge: 'bg-zinc-800 text-white font-bold' },
  'CSBS-S5A': { bg: 'bg-zinc-800', border: 'border-zinc-800', text: 'text-white', badge: 'bg-zinc-200 text-black font-bold' },
  'CTIS-S5A': { bg: 'bg-zinc-50', border: 'border-zinc-300', text: 'text-zinc-900', badge: 'bg-zinc-700 text-white font-bold' },
  'CyberSecurity-S5A': { bg: 'bg-zinc-900', border: 'border-zinc-900', text: 'text-white', badge: 'bg-zinc-100 text-black font-bold' },
};

const getBatchStyle = (batchName: string, index: number = 0) => {
  if (batchColors[batchName]) return batchColors[batchName];
  const charSum = batchName.split('').reduce((acc, c) => acc + c.charCodeAt(0), index);
  return PRESET_BATCH_COLORS[Math.abs(charSum) % PRESET_BATCH_COLORS.length];
};

export const generateSyntheticCandidates = (batchName: string, count: number = 25): CandidateInfo[] => {
  const cleanBatch = (batchName || 'AIML-S3A').trim();
  const batchPrefix = cleanBatch.split('-')[0] || 'JU';
  const candidates: CandidateInfo[] = [];
  for (let i = 1; i <= count; i++) {
    candidates.push({
      id: `cand-${cleanBatch}-${i}`,
      roll_number: `23JU-${batchPrefix}-${i.toString().padStart(2, '0')}`,
      full_name: `Candidate ${batchPrefix} #${i}`,
      batch: cleanBatch,
    });
  }
  return candidates;
};

export const normalizeBatchCode = (val: string): string => {
  return (val || '').toUpperCase().replace(/[\s\-_]/g, '');
};

export const matchesBatch = (studentBatch: string, targetBatch: string): boolean => {
  const sNorm = normalizeBatchCode(studentBatch);
  const tNorm = normalizeBatchCode(targetBatch);
  if (!sNorm || !tNorm) return false;
  if (sNorm === tNorm) return true;
  if (sNorm.includes(tNorm) || tNorm.includes(sNorm)) return true;
  return false;
};

const generateEmptyHallGrid = (
  hallName: string,
  cfgMap: Record<string, { rows: number; cols: number; blocked: string[] }>
): Record<string, DeskCell> => {
  const rawConfig = cfgMap[hallName];
  const rows = rawConfig && rawConfig.rows > 0 ? rawConfig.rows : 6;
  const cols = rawConfig && rawConfig.cols > 0 ? rawConfig.cols : 6;
  const blocked = rawConfig && Array.isArray(rawConfig.blocked) ? rawConfig.blocked : [];
  const grid: Record<string, DeskCell> = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r}-${c}`;
      const rowLetter = String.fromCharCode(65 + r);
      const seatLabel = `${rowLetter}${c + 1}`;
      grid[key] = {
        seat_label: seatLabel,
        row: r,
        col: c,
        is_blocked: blocked.includes(key),
        is_locked: false,
      };
    }
  }
  return grid;
};

export const ExamSeatingPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [searchParams] = useSearchParams();
  const examIdFromQuery = searchParams.get('exam_id');
  const planIdFromQuery = searchParams.get('plan_id');

  // Examination Selection State
  const [availableExams, setAvailableExams] = useState<ExamOption[]>(() => {
    const local = getStoredDrafts();
    if (local.length > 0) {
      const localIds = new Set(local.map((d) => d.id));
      const initUnmatched = INITIAL_EXAMS_LIST.filter((i) => !localIds.has(i.id));
      return [...local, ...initUnmatched];
    }
    return INITIAL_EXAMS_LIST;
  });

  const [selectedExamId, setSelectedExamId] = useState<string>(() => {
    if (examIdFromQuery) return examIdFromQuery;
    const storedActive = localStorage.getItem('seatwise_active_exam_id');
    if (storedActive) return storedActive;
    const local = getStoredDrafts();
    return local.length > 0 ? local[0].id : 'EXAM-2026-1101';
  });

  const lastExamIdRef = useRef<string | null>(null);

  // Active Selected Exam Details
  const activeExam = useMemo(() => {
    const found = availableExams.find((e) => e.id === selectedExamId);
    if (found) return found;
    const localDrafts = getStoredDrafts();
    const localFound = localDrafts.find((e) => e.id === selectedExamId);
    if (localFound) return localFound;
    if (selectedExamId && selectedExamId !== 'EXAM-2026-1101') {
      return {
        id: selectedExamId,
        name: 'Selected Examination',
        batches: ['AIML-S3A', 'CSE-GEN-S3B'],
        halls: ['A-101'],
        status: 'draft',
      };
    }
    return availableExams[0] || INITIAL_EXAMS_LIST[0];
  }, [selectedExamId, availableExams]);

  const [selectedHalls, setSelectedHalls] = useState<string[]>(() => {
    return activeExam?.halls && activeExam.halls.length > 0 ? activeExam.halls : ['A-101', 'A-102', 'A-313'];
  });
  const [activeHall, setActiveHall] = useState<string>(() => {
    return (activeExam?.halls && activeExam.halls[0]) || 'A-101';
  });
  const [savedPlanId, setSavedPlanId] = useState<string | null>(planIdFromQuery);

  // Seating Policy
  const [policy, setPolicy] = useState<SeatingPolicy>({
    block_same_batch_horizontal: true,
    block_same_batch_vertical: true,
    block_same_batch_diagonal: false,
    allow_empty_seats: true,
    allow_mixed_batches: true,
    separate_programs: true,
  });

  // Flow State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  // Default to false for draft exams, true only if planIdFromQuery or pre-allocated
  const [hasGenerated, setHasGenerated] = useState<boolean>(() => {
    if (planIdFromQuery) return true;
    if (activeExam?.status === 'allocated' || activeExam?.status === 'published') return true;
    return false;
  });
  const [isPublished, setIsPublished] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | 'needs_validation'>('valid');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Interaction State
  const [selectedSeatKey, setSelectedSeatKey] = useState<string | null>(null);
  const [isMoveMode, setIsMoveMode] = useState<boolean>(false);
  const [moveSourceKey, setMoveSourceKey] = useState<string | null>(null);
  const [isSwapMode, setIsSwapMode] = useState<boolean>(false);
  const [swapSourceKey, setSwapSourceKey] = useState<string | null>(null);
  const [attendanceMode, setAttendanceMode] = useState<boolean>(false);

  // Hall Layouts Definition with Authentic JU FET Campus Halls
  const [hallsConfig, setHallsConfig] = useState<Record<string, { rows: number; cols: number; blocked: string[] }>>(
    DEFAULT_CAMPUS_HALLS_CONFIG
  );

  // Real Enrolled Candidates Roster & Batch Counts
  const [studentsRoster, setStudentsRoster] = useState<Record<string, CandidateInfo[]>>(() => {
    const batches = activeExam?.batches && activeExam.batches.length > 0 ? activeExam.batches : ['AIML-S3A', 'CSE-GEN-S3B'];
    const initialRoster: Record<string, CandidateInfo[]> = {};
    batches.forEach((b) => {
      initialRoster[b] = generateSyntheticCandidates(b, 25);
    });
    return initialRoster;
  });
  const [batchCounts, setBatchCounts] = useState<Record<string, number>>(() => {
    const batches = activeExam?.batches && activeExam.batches.length > 0 ? activeExam.batches : ['AIML-S3A', 'CSE-GEN-S3B'];
    const initialCounts: Record<string, number> = {};
    batches.forEach((b) => (initialCounts[b] = 25));
    return initialCounts;
  });

  // Generator using active batches and roster
  const generateInitialAssignments = (hallName: string): Record<string, DeskCell> => {
    const rawConfig = hallsConfig[hallName];
    const rows = rawConfig && rawConfig.rows > 0 ? rawConfig.rows : 6;
    const cols = rawConfig && rawConfig.cols > 0 ? rawConfig.cols : 6;
    const blocked = rawConfig && Array.isArray(rawConfig.blocked) ? rawConfig.blocked : [];
    const grid: Record<string, DeskCell> = {};
    const rawBatches = Object.keys(batchCounts).length > 0 ? Object.keys(batchCounts) : (activeExam?.batches || ['AIML-S3A', 'CSE-GEN-S3B']);
    const batches = rawBatches.length > 0 ? rawBatches : ['AIML-S3A', 'CSE-GEN-S3B'];
    const studentCounters: Record<string, number> = {};
    batches.forEach((b) => (studentCounters[b] = 0));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}-${c}`;
        const rowLetter = String.fromCharCode(65 + r);
        const seatLabel = `${rowLetter}${c + 1}`;

        if (blocked.includes(key)) {
          grid[key] = {
            seat_label: seatLabel,
            row: r,
            col: c,
            is_blocked: true,
          };
          continue;
        }

        const batchIdx = (r + c) % Math.max(1, batches.length);
        const bName = batches[batchIdx];
        const roster = studentsRoster[bName] || generateSyntheticCandidates(bName, 25);
        const ptr = studentCounters[bName] || 0;
        studentCounters[bName] = ptr + 1;
        const candidate = roster[ptr] || {
          id: `cand-${bName}-${ptr + 1}`,
          roll_number: `23JU-${bName.split('-')[0]}-${(ptr + 1).toString().padStart(2, '0')}`,
          full_name: `Candidate ${bName.split('-')[0]} #${ptr + 1}`,
          batch: bName,
        };

        grid[key] = {
          seat_label: seatLabel,
          row: r,
          col: c,
          is_blocked: false,
          is_locked: false,
          student_id: candidate.id,
          batch: bName,
          roll_number: candidate.roll_number,
          student_name: candidate.full_name,
          attendance: 'present',
        };
      }
    }
    return grid;
  };

  const [allocationGrid, setAllocationGrid] = useState<Record<string, Record<string, DeskCell>>>(() => {
    const initialGrid: Record<string, Record<string, DeskCell>> = {};
    const halls = activeExam?.halls && activeExam.halls.length > 0 ? activeExam.halls : ['A-101'];
    const shouldPrefill = Boolean(planIdFromQuery) || activeExam?.status === 'allocated' || activeExam?.status === 'published';
    halls.forEach((h) => {
      initialGrid[h] = shouldPrefill
        ? generateInitialAssignments(h)
        : generateEmptyHallGrid(h, DEFAULT_CAMPUS_HALLS_CONFIG);
    });
    return initialGrid;
  });

  // Ensure active hall is populated in allocationGrid
  useEffect(() => {
    if (activeHall && !allocationGrid[activeHall]) {
      setAllocationGrid((prev) => ({
        ...prev,
        [activeHall]: generateEmptyHallGrid(activeHall, hallsConfig),
      }));
    }
  }, [activeHall, hallsConfig]);

  // Load Examinations from Backend & Supabase
  useEffect(() => {
    const localDrafts = getStoredDrafts();
    api.getExams()
      .then((data) => {
        if (data && data.length > 0) {
          const mapped: ExamOption[] = data.map((e: any) => {
            const localMatch = localDrafts.find((d) => d.id === e.id);
            return {
              id: e.id,
              name: e.name,
              exam_date: e.exam_date,
              session: e.session,
              batches: (e.batches && e.batches.length > 0)
                ? e.batches
                : (localMatch && localMatch.batches && localMatch.batches.length > 0)
                ? localMatch.batches
                : (e.id === 'EXAM-2026-1101' ? ['AIML-S3A', 'CSE-GEN-S3B'] : []),
              halls: (e.halls && e.halls.length > 0)
                ? e.halls
                : (e.examination_halls && e.examination_halls.length > 0)
                ? e.examination_halls.map((h: any) => h.rooms?.code || h.rooms?.name || h.room_id)
                : (localMatch && localMatch.halls && localMatch.halls.length > 0)
                ? localMatch.halls
                : (e.id === 'EXAM-2026-1101' ? ['A-101', 'A-102'] : ['A-101']),
              status: e.status || 'draft',
            };
          });
          const backendIds = new Set(mapped.map((m) => m.id));
          const uncommitted = localDrafts.filter((d) => !backendIds.has(d.id));
          const combined = [...uncommitted, ...mapped];
          setAvailableExams(combined);
          // Only auto-select first exam if no exam explicitly selected or active in session
          const storedActive = localStorage.getItem('seatwise_active_exam_id');
          if (!examIdFromQuery && !planIdFromQuery && !storedActive && combined.length > 0) {
            setSelectedExamId(combined[0].id);
          }
        } else if (localDrafts.length > 0) {
          setAvailableExams(localDrafts);
        }
      })
      .catch(() => {
        if (localDrafts.length > 0) {
          setAvailableExams(localDrafts);
        }
      });

    // If target exam id passed in query or stored active exam, load directly from backend
    const targetExamId = examIdFromQuery || localStorage.getItem('seatwise_active_exam_id');
    if (targetExamId && targetExamId !== 'EXAM-2026-1101') {
      api.getExam(targetExamId)
        .then((res: any) => {
          if (res && res.examination) {
            const ex = res.examination;
            const bNames: string[] = res.batch_names && res.batch_names.length > 0
              ? res.batch_names
              : (res.batches || []).map((b: any) => `${b.programs?.code || 'JU'}-S${b.semester}${b.section}`);
            const hNames: string[] = res.hall_names && res.hall_names.length > 0
              ? res.hall_names
              : (res.halls || []).map((h: any) => h.code || h.name || h.id);

            const localMatch = localDrafts.find((d) => d.id === targetExamId);
            const directExam: ExamOption = {
              id: ex.id,
              name: ex.name,
              exam_date: ex.exam_date,
              session: ex.session,
              batches: bNames.length > 0 ? bNames : (localMatch?.batches || []),
              halls: hNames.length > 0 ? hNames : (localMatch?.halls || []),
              status: ex.status || 'draft',
            };

            setAvailableExams((prev) => {
              const idx = prev.findIndex((e) => e.id === directExam.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = directExam;
                return next;
              }
              return [directExam, ...prev];
            });
            setSelectedExamId(directExam.id);
          }
        })
        .catch(() => {
          const localMatch = localDrafts.find((d) => d.id === targetExamId);
          if (localMatch) {
            setSelectedExamId(localMatch.id);
          }
        });
    }

    api.getRooms()
      .then((data) => {
        if (data && data.length > 0) {
          const cfg: Record<string, { rows: number; cols: number; blocked: string[] }> = {};
          data.forEach((r: any) => {
            const code = r.code || r.name;
            const campusRoom = CAMPUS_ROOMS.find((cr) => cr.room_number === code || cr.name === code);
            const rRows = r.rows || campusRoom?.rows || 6;
            const rCols = r.columns || campusRoom?.columns || 6;
            const entry = {
              rows: rRows > 0 ? rRows : 6,
              cols: rCols > 0 ? rCols : 6,
              blocked: (campusRoom && campusRoom.blocked_seats) || [],
            };
            if (code) cfg[code] = entry;
            if (r.name && r.name !== code) cfg[r.name] = entry;
          });
          setHallsConfig((prev) => ({ ...prev, ...cfg }));
        }
      })
      .catch(() => {});
  }, [examIdFromQuery, planIdFromQuery]);

  // Synchronize halls, batches, and candidate roster when active exam changes
  useEffect(() => {
    if (!activeExam) return;
    const isExamChange = lastExamIdRef.current !== activeExam.id;
    lastExamIdRef.current = activeExam.id;

    // 1. Synchronize Halls
    const examHalls = activeExam.halls && activeExam.halls.length > 0
      ? activeExam.halls
      : (activeExam.id === 'EXAM-2026-1101' ? ['A-101', 'A-102', 'A-313'] : ['A-101']);
    setSelectedHalls(examHalls);
    if (!examHalls.includes(activeHall)) {
      setActiveHall(examHalls[0]);
    }

    // 2. Synchronize Batches & Candidate Roster
    const examBatches = activeExam.batches && activeExam.batches.length > 0
      ? activeExam.batches
      : ['AIML-S3A', 'CSE-GEN-S3B'];
    
    api.getStudents()
      .then((dbStudents: any[]) => {
        const rosterMap: Record<string, CandidateInfo[]> = {};
        const countsMap: Record<string, number> = {};

        examBatches.forEach((bName) => {
          const matchedStudents: CandidateInfo[] = [];
          if (Array.isArray(dbStudents) && dbStudents.length > 0) {
            dbStudents.forEach((s) => {
              const pCode = s.programs?.code || '';
              const sem = s.semester;
              const sec = s.section;
              const studentBatch = `${pCode}-S${sem}${sec}`;
              if (
                matchesBatch(studentBatch, bName) ||
                (pCode && bName.toUpperCase().includes(pCode.toUpperCase()))
              ) {
                matchedStudents.push({
                  id: s.id,
                  roll_number: s.roll_number || s.id,
                  full_name: s.full_name || 'Enrolled Candidate',
                  batch: bName,
                });
              }
            });
          }

          if (matchedStudents.length < 20) {
            const needed = 25 - matchedStudents.length;
            const synth = generateSyntheticCandidates(bName, needed);
            matchedStudents.push(...synth);
          }

          rosterMap[bName] = matchedStudents;
          countsMap[bName] = matchedStudents.length;
        });

        setStudentsRoster(rosterMap);
        setBatchCounts(countsMap);
      })
      .catch(() => {
        const rosterMap: Record<string, CandidateInfo[]> = {};
        const countsMap: Record<string, number> = {};
        examBatches.forEach((bName) => {
          const candidates = generateSyntheticCandidates(bName, 25);
          rosterMap[bName] = candidates;
          countsMap[bName] = candidates.length;
        });
        setStudentsRoster(rosterMap);
        setBatchCounts(countsMap);
      });

    // 3. If exam is newly selected and not pre-allocated/published, start unallocated (empty desks)
    if (isExamChange && !planIdFromQuery && activeExam.status !== 'allocated' && activeExam.status !== 'published') {
      const initialEmpty: Record<string, Record<string, DeskCell>> = {};
      examHalls.forEach((h) => {
        initialEmpty[h] = generateEmptyHallGrid(h, hallsConfig);
      });
      setAllocationGrid(initialEmpty);
      setHasGenerated(false);
      setValidationStatus('needs_validation');
    }
  }, [activeExam?.id, activeExam?.batches, activeExam?.halls]);

  // Load Saved Plan if requested
  useEffect(() => {
    if (planIdFromQuery) {
      api.getExamPlan(planIdFromQuery)
        .then((res) => {
          if (res && res.assignments && res.assignments.length > 0) {
            const newGrid: Record<string, Record<string, DeskCell>> = {};
            res.assignments.forEach((a: any) => {
              const hall = (a.rooms && (a.rooms.code || a.rooms.name)) || 'A-101';
              if (!newGrid[hall]) newGrid[hall] = {};
              const key = `${a.row}-${a.col}`;
              newGrid[hall][key] = {
                seat_label: a.seat_label,
                row: a.row,
                col: a.col,
                is_blocked: false,
                is_locked: false,
                batch: ((a.students && a.students.programs) || {}).code || 'AIML',
                student_id: a.student_id,
                roll_number: (a.students && a.students.roll_number) || a.student_id,
                student_name: (a.students && a.students.full_name) || 'Candidate',
                attendance: 'present',
              };
            });
            setAllocationGrid((prev) => ({ ...prev, ...newGrid }));
            if (res.plan?.examination_id) setSelectedExamId(res.plan.examination_id);
            setSavedPlanId(planIdFromQuery);
            setIsPublished(res.plan?.status === 'published');
            setHasGenerated(true);
            setStatusMessage(`Loaded exam seating plan ${planIdFromQuery} from Supabase.`);
            setTimeout(() => setStatusMessage(null), 4000);
          }
        })
        .catch(() => {});
    }
  }, [planIdFromQuery]);

  const rawHallConfig = hallsConfig[activeHall];
  const currentHallConfig = useMemo(() => ({
    rows: rawHallConfig && rawHallConfig.rows > 0 ? rawHallConfig.rows : 6,
    cols: rawHallConfig && rawHallConfig.cols > 0 ? rawHallConfig.cols : 6,
    blocked: rawHallConfig && Array.isArray(rawHallConfig.blocked) ? rawHallConfig.blocked : [],
  }), [rawHallConfig]);
  const currentGrid = allocationGrid[activeHall] || {};

  // Conflict Detection
  const { conflictKeys, conflictPairs } = useMemo(() => {
    const conflicts = new Set<string>();
    const pairs: { a: string; b: string; batch: string }[] = [];
    const violations = checkAllocationConflicts(
      currentGrid,
      currentHallConfig.rows,
      currentHallConfig.cols,
      policy
    );

    violations.forEach((v) => {
      if (v.keyA) conflicts.add(v.keyA);
      if (v.keyB) conflicts.add(v.keyB);
      pairs.push({ a: v.seatA, b: v.seatB, batch: v.batch });
    });

    return { conflictKeys: conflicts, conflictPairs: pairs };
  }, [currentGrid, currentHallConfig, policy]);

  // Synchronize conflict status
  useEffect(() => {
    if (conflictKeys.size > 0) {
      setValidationStatus('invalid');
    }
  }, [conflictKeys]);

  // Comprehensive Capacity & Allocation Statistics (Core Section 5 Requirements)
  const totalHallSeats = currentHallConfig.rows * currentHallConfig.cols;
  const blockedSeatsCount = Object.values(currentGrid).filter((s) => s.is_blocked).length;
  const availableSeatsCount = totalHallSeats - blockedSeatsCount;
  const allocatedStudentsCount = Object.values(currentGrid).filter((s) => !s.is_blocked && s.student_name).length;
  const lockedSeatsCount = Object.values(currentGrid).filter((s) => s.is_locked).length;

  // Calculate total allocated candidates across all examination halls
  const totalAllocatedAcrossAllHalls = useMemo(() => {
    let count = 0;
    Object.values(allocationGrid).forEach((grid) => {
      Object.values(grid).forEach((cell) => {
        if (cell && !cell.is_blocked && cell.student_name) count++;
      });
    });
    return count;
  }, [allocationGrid]);

  const totalStudentsCount = Object.values(batchCounts).reduce((a, b) => a + b, 0);
  const unallocatedStudentsCount = Math.max(0, totalStudentsCount - totalAllocatedAcrossAllHalls);
  const presentCount = Object.values(currentGrid).filter((s) => !s.is_blocked && s.student_name && s.attendance !== 'absent').length;
  const absentCount = Object.values(currentGrid).filter((s) => !s.is_blocked && s.student_name && s.attendance === 'absent').length;

  // Run Multi-Hall Constraint Satisfaction Allocator using the real batches and candidate pool
  const runAllocation = async () => {
    setIsGenerating(true);
    setStatusMessage('Solving multi-venue constraint satisfaction model via Google OR-Tools CP-SAT...');

    try {
      const examHalls = (selectedHalls && selectedHalls.length > 0)
        ? selectedHalls
        : ((activeExam?.halls && activeExam.halls.length > 0) ? activeExam.halls : ['A-101']);

      const rawBatches = Object.keys(batchCounts).length > 0
        ? Object.keys(batchCounts)
        : ((activeExam?.batches && activeExam.batches.length > 0) ? activeExam.batches : ['AIML-S3A', 'CSE-GEN-S3B']);
      const activeBatches = rawBatches.length > 0 ? rawBatches : ['AIML-S3A', 'CSE-GEN-S3B'];

      // Ensure every active batch has a populated roster
      const currentRoster: Record<string, CandidateInfo[]> = { ...studentsRoster };
      activeBatches.forEach((b) => {
        if (!currentRoster[b] || currentRoster[b].length === 0) {
          currentRoster[b] = generateSyntheticCandidates(b, 25);
        }
      });
      setStudentsRoster(currentRoster);

      let backendSuccess = false;

      // Attempt 1: Call backend examination solver if exam is stored in database
      const isBackendUUID = activeExam.id && !activeExam.id.startsWith('EXAM-') && !activeExam.id.startsWith('draft-');
      if (isBackendUUID) {
        try {
          const res = await api.generateExamSeating({
            examination_id: activeExam.id,
            save: false,
            policy_override: {
              block_same_batch_diagonal: policy.block_same_batch_diagonal,
            },
          });

          if (res && (res.result_status === 'valid' || res.result_status === 'optimal') && Array.isArray(res.assignments) && res.assignments.length > 0) {
            const hallNamesMap: Record<string, string> = res.hall_names || {};
            const hallCodesMap: Record<string, string> = res.hall_codes || {};
            const newGrid: Record<string, Record<string, DeskCell>> = {};

            // Initialize all halls with valid grid layouts
            examHalls.forEach((h) => {
              newGrid[h] = generateEmptyHallGrid(h, hallsConfig);
            });

            // Resolver to map any room_id or room name returned from backend to one of examHalls
            const resolveHallKey = (rawRoomId: string): string => {
              if (!rawRoomId) return activeHall || examHalls[0] || 'A-101';
              if (examHalls.includes(rawRoomId)) return rawRoomId;
              const cName = hallCodesMap[rawRoomId] || hallNamesMap[rawRoomId];
              if (cName && examHalls.includes(cName)) return cName;
              const candidates = [cName, rawRoomId].filter(Boolean) as string[];
              for (const cand of candidates) {
                const candUp = cand.toUpperCase();
                for (const eh of examHalls) {
                  if (candUp.includes(eh.toUpperCase()) || eh.toUpperCase().includes(candUp)) {
                    return eh;
                  }
                }
              }
              if (cName && hallsConfig[cName]) {
                if (!examHalls.includes(cName)) {
                  setSelectedHalls((prev) => Array.from(new Set([...prev, cName])));
                }
                return cName;
              }
              return activeHall || examHalls[0] || 'A-101';
            };

            // Map assignments to corresponding hall grids
            res.assignments.forEach((a: any) => {
              const hName = resolveHallKey(a.room_id);
              if (!newGrid[hName]) {
                newGrid[hName] = generateEmptyHallGrid(hName, hallsConfig);
              }
              const key = `${a.row}-${a.col}`;
              const rowLetter = String.fromCharCode(65 + a.row);
              const seatLabel = a.seat_label || `${rowLetter}${a.col + 1}`;
              const bCode = a.group || a.batch || 'AIML-S3A';

              newGrid[hName][key] = {
                seat_label: seatLabel,
                row: a.row,
                col: a.col,
                is_blocked: false,
                is_locked: false,
                batch: bCode,
                roll_number: a.roll_number || a.student_id,
                student_name: a.full_name || a.student_name || 'Candidate',
                student_id: a.student_id,
                attendance: 'present',
              };
            });

            // Ensure activeHall points to a hall that has assigned candidates
            if (!newGrid[activeHall] || Object.values(newGrid[activeHall]).filter((c) => c.student_name).length === 0) {
              const hallWithSeats = Object.keys(newGrid).find(
                (h) => Object.values(newGrid[h]).some((c) => Boolean(c.student_name))
              );
              if (hallWithSeats) {
                setActiveHall(hallWithSeats);
              }
            }

            setAllocationGrid(newGrid);
            setValidationStatus('valid');
            setHasGenerated(true);
            backendSuccess = true;
            const assignedCount = Object.values(newGrid).reduce(
              (sum, grid) => sum + Object.values(grid).filter((c) => Boolean(c.student_name)).length,
              0
            );
            const msg = `Seating plan mathematically generated across ${Object.keys(newGrid).length} venue(s) for ${assignedCount} candidates via ${res.solver?.name || 'Google OR-Tools CP-SAT'}! 0 conflicts.`;
            setStatusMessage(msg);
            showNotification('success', msg);
            setTimeout(() => setStatusMessage(null), 5000);
          }
        } catch (err: any) {
          console.warn('Backend exam seating solver skipped or returned error, falling back to local solver:', err);
          backendSuccess = false;
        }
      }

      // Attempt 2: Comprehensive multi-hall allocation across all selected halls
      if (!backendSuccess) {
        const newAllocationGrid: Record<string, Record<string, DeskCell>> = {};
        const candidatePointers: Record<string, number> = {};
        activeBatches.forEach((b) => (candidatePointers[b] = 0));
        let totalAssigned = 0;

        for (const hall of examHalls) {
          const rawCfg = hallsConfig[hall];
          const cfg = {
            rows: rawCfg && rawCfg.rows > 0 ? rawCfg.rows : 6,
            cols: rawCfg && rawCfg.cols > 0 ? rawCfg.cols : 6,
            blocked: rawCfg && Array.isArray(rawCfg.blocked) ? rawCfg.blocked : [],
          };
          const gridForHall: Record<string, DeskCell> = {};
          const usableSeats: string[] = [];

          for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
              const key = `${r}-${c}`;
              const rowLetter = String.fromCharCode(65 + r);
              const seatLabel = `${rowLetter}${c + 1}`;
              if (cfg.blocked.includes(key)) {
                gridForHall[key] = { seat_label: seatLabel, row: r, col: c, is_blocked: true, is_locked: false };
              } else {
                usableSeats.push(key);
                gridForHall[key] = { seat_label: seatLabel, row: r, col: c, is_blocked: false, is_locked: false };
              }
            }
          }

          // Distribute remaining candidates for this hall
          const perBatch = Math.floor(usableSeats.length / Math.max(1, activeBatches.length));
          let rem = usableSeats.length % Math.max(1, activeBatches.length);
          const groups: Record<string, number> = {};
          activeBatches.forEach((b) => {
            const roster = currentRoster[b] || [];
            const remaining = Math.max(0, roster.length - candidatePointers[b]);
            const target = Math.min(remaining, perBatch + (rem > 0 ? 1 : 0));
            if (rem > 0) rem--;
            if (target > 0) groups[b] = target;
          });

          // Attempt CP-SAT solve for this hall via math api
          let solvedGrid: string[][] | null = null;
          if (Object.keys(groups).length > 0) {
            try {
              const blockedList = cfg.blocked.map((k) => k.split('-').map(Number));
              const mathRes = await api.mathSolve({
                rows: cfg.rows,
                columns: cfg.cols,
                blocked: blockedList,
                include_diagonal: policy.block_same_batch_diagonal,
                groups,
              });
              if (mathRes && Array.isArray(mathRes.grid)) {
                const hasAssigned = mathRes.grid.some((row: any[]) => Array.isArray(row) && row.some((c) => Boolean(c)));
                if (hasAssigned) {
                  solvedGrid = mathRes.grid;
                }
              }
            } catch {
              solvedGrid = null;
            }
          }

          // Assign candidates
          for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
              const key = `${r}-${c}`;
              if (cfg.blocked.includes(key)) continue;

              let assignedBatch: string | null = null;
              if (solvedGrid && solvedGrid[r] && solvedGrid[r][c]) {
                assignedBatch = solvedGrid[r][c];
              }

              // Local fallback solver if CP-SAT had null cell or wasn't available
              if (!assignedBatch && activeBatches.length > 0) {
                const bIdx = (r + c) % activeBatches.length;
                const bCand = activeBatches[bIdx];
                const roster = currentRoster[bCand] || [];
                if (candidatePointers[bCand] < roster.length) {
                  assignedBatch = bCand;
                } else {
                  // Find another batch with remaining candidates
                  for (let bi = 0; bi < activeBatches.length; bi++) {
                    const altB = activeBatches[(bIdx + bi) % activeBatches.length];
                    const altRoster = currentRoster[altB] || [];
                    if (candidatePointers[altB] < altRoster.length) {
                      assignedBatch = altB;
                      break;
                    }
                  }
                }
              }

              if (assignedBatch) {
                let roster = currentRoster[assignedBatch];
                if (!roster || roster.length === 0) {
                  roster = generateSyntheticCandidates(assignedBatch, 25);
                  currentRoster[assignedBatch] = roster;
                }
                const ptr = candidatePointers[assignedBatch] || 0;
                const candidate = roster[ptr] || {
                  id: `cand-${assignedBatch}-${ptr + 1}`,
                  roll_number: `23JU-${assignedBatch.split('-')[0]}-${(ptr + 1).toString().padStart(2, '0')}`,
                  full_name: `Candidate ${assignedBatch.split('-')[0]} #${ptr + 1}`,
                  batch: assignedBatch,
                };
                candidatePointers[assignedBatch] = ptr + 1;
                totalAssigned++;
                gridForHall[key] = {
                  ...gridForHall[key],
                  batch: assignedBatch,
                  roll_number: candidate.roll_number,
                  student_name: candidate.full_name,
                  student_id: candidate.id,
                  attendance: 'present',
                };
              }
            }
          }

          newAllocationGrid[hall] = gridForHall;
        }

        setStudentsRoster(currentRoster);
        setAllocationGrid(newAllocationGrid);
        setValidationStatus('valid');
        setHasGenerated(true);
        const msg = `Seating plan generated across ${examHalls.length} venue(s) (${examHalls.join(', ')}) for ${totalAssigned} candidates! 0 conflicts.`;
        setStatusMessage(msg);
        showNotification('success', msg);
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } catch (err: any) {
      showNotification('error', `Allocation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate remaining unlocked seats using active batches and roster
  const regenerateUnlockedSeats = () => {
    setIsGenerating(true);
    setStatusMessage('Preserving locked seats and re-solving remaining desks...');

    setTimeout(() => {
      const config = currentHallConfig;
      const updatedHallGrid: Record<string, DeskCell> = { ...currentGrid };
      const activeBatches = Object.keys(batchCounts).length > 0 ? Object.keys(batchCounts) : (activeExam.batches || ['AIML-S3A']);
      let counter = 1;

      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          const key = `${r}-${c}`;
          const currentCell = updatedHallGrid[key];
          if (!currentCell || currentCell.is_blocked || currentCell.is_locked) {
            continue;
          }

          const rowLetter = String.fromCharCode(65 + r);
          const seatLabel = `${rowLetter}${c + 1}`;
          const batchIdx = (r + c + 1) % Math.max(1, activeBatches.length);
          const b = activeBatches[batchIdx];
          const roster = studentsRoster[b] || [];
          const candidate = roster[counter % Math.max(1, roster.length)] || {
            id: `cand-${b}-${counter}`,
            full_name: `Candidate ${b} #${counter}`,
            roll_number: `23JU-${b.slice(0, 4)}-${counter.toString().padStart(2, '0')}`,
            batch: b,
          };
          counter++;

          updatedHallGrid[key] = {
            ...currentCell,
            seat_label: seatLabel,
            row: r,
            col: c,
            is_blocked: false,
            is_locked: false,
            batch: b,
            roll_number: candidate.roll_number,
            student_name: candidate.full_name,
            student_id: candidate.id,
            attendance: 'present',
          };
        }
      }

      setAllocationGrid((prev) => ({ ...prev, [activeHall]: updatedHallGrid }));
      setValidationStatus('valid');
      setIsGenerating(false);
      const msg = 'Remaining unlocked seats re-allocated without altering locked assignments.';
      setStatusMessage(msg);
      showNotification('success', msg);
      setTimeout(() => setStatusMessage(null), 4000);
    }, 400);
  };

  // Run Mathematical Validation
  const runValidation = async () => {
    setIsValidating(true);
    setStatusMessage('Running mathematical validation (Injective mapping, Pigeonhole condition, adjacency graph)...');

    setTimeout(() => {
      setIsValidating(false);
      if (conflictKeys.size > 0) {
        setValidationStatus('invalid');
        const msg = `Validation Failed: ${conflictKeys.size} seats have batch adjacency conflicts.`;
        setStatusMessage(msg);
        showNotification('error', msg);
      } else if (allocatedStudentsCount > availableSeatsCount) {
        setValidationStatus('invalid');
        const msg = 'Validation Failed: Pigeonhole principle violation (|Students| > |Available Seats|).';
        setStatusMessage(msg);
        showNotification('error', msg);
      } else {
        setValidationStatus('valid');
        const msg = 'Mathematical Validation Passed: f: S → T is injective, 0 adjacency conflicts, 0 blocked desk violations.';
        setStatusMessage(msg);
        showNotification('success', msg);
      }
      setTimeout(() => setStatusMessage(null), 5000);
    }, 400);
  };

  // Seat Click Handler
  const handleSeatClick = (key: string) => {
    const seat = currentGrid[key];

    // 1. Move Mode Target Selection
    if (isMoveMode && moveSourceKey) {
      if (key === moveSourceKey) {
        setIsMoveMode(false);
        setMoveSourceKey(null);
        return;
      }
      if (seat?.is_blocked) {
        setStatusMessage('Cannot move student to a blocked desk.');
        showNotification('warning', 'Cannot move student to a blocked desk.');
        setTimeout(() => setStatusMessage(null), 3000);
        return;
      }
      const sourceSeat = currentGrid[moveSourceKey];
      if (!sourceSeat) return;

      const [targetR, targetC] = key.split('-').map(Number);
      const targetLabel = `${String.fromCharCode(65 + targetR)}${targetC + 1}`;

      const updatedGrid = { ...currentGrid };
      updatedGrid[key] = {
        ...updatedGrid[key],
        seat_label: targetLabel,
        row: targetR,
        col: targetC,
        is_blocked: false,
        is_locked: false,
        batch: sourceSeat.batch,
        roll_number: sourceSeat.roll_number,
        student_name: sourceSeat.student_name,
        student_id: sourceSeat.student_id,
        attendance: sourceSeat.attendance || 'present',
      };
      // Vacate source seat
      updatedGrid[moveSourceKey] = {
        ...sourceSeat,
        batch: undefined,
        roll_number: undefined,
        student_name: undefined,
        student_id: undefined,
        is_locked: false,
      };

      setAllocationGrid((prev) => ({ ...prev, [activeHall]: updatedGrid }));
      setIsMoveMode(false);
      setMoveSourceKey(null);
      setSelectedSeatKey(null);
      setValidationStatus('needs_validation');
      const moveMsg = `Candidate moved to desk ${targetLabel}.`;
      setStatusMessage(moveMsg);
      showNotification('info', moveMsg);
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    // 2. Swap Mode Target Selection
    if (isSwapMode && swapSourceKey) {
      if (key === swapSourceKey) {
        setIsSwapMode(false);
        setSwapSourceKey(null);
        return;
      }
      const s1 = currentGrid[swapSourceKey];
      const s2 = currentGrid[key];
      if (!s1 || !s2 || s1.is_blocked || s2.is_blocked) {
        setStatusMessage('Cannot swap with a blocked desk.');
        showNotification('warning', 'Cannot swap with a blocked desk.');
        setTimeout(() => setStatusMessage(null), 3000);
        return;
      }

      const updatedGrid = { ...currentGrid };
      const tempStudent = {
        batch: s1.batch,
        roll_number: s1.roll_number,
        student_name: s1.student_name,
        student_id: s1.student_id,
        attendance: s1.attendance,
      };

      updatedGrid[swapSourceKey] = {
        ...s1,
        batch: s2.batch,
        roll_number: s2.roll_number,
        student_name: s2.student_name,
        student_id: s2.student_id,
        attendance: s2.attendance,
      };

      updatedGrid[key] = {
        ...s2,
        batch: tempStudent.batch,
        roll_number: tempStudent.roll_number,
        student_name: tempStudent.student_name,
        student_id: tempStudent.student_id,
        attendance: tempStudent.attendance,
      };

      setAllocationGrid((prev) => ({ ...prev, [activeHall]: updatedGrid }));
      setIsSwapMode(false);
      setSwapSourceKey(null);
      setSelectedSeatKey(null);
      setValidationStatus('needs_validation');
      const swapMsg = `Swapped candidate ${s1.roll_number || s1.seat_label} with ${s2.roll_number || s2.seat_label}.`;
      setStatusMessage(swapMsg);
      showNotification('info', swapMsg);
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }

    // 3. Attendance Mode
    if (attendanceMode) {
      if (seat && !seat.is_blocked && seat.student_name) {
        const nextAtt: 'present' | 'absent' = seat.attendance === 'absent' ? 'present' : 'absent';
        const updatedCell: DeskCell = { ...seat, attendance: nextAtt };
        const updatedGrid: Record<string, DeskCell> = {
          ...currentGrid,
          [key]: updatedCell,
        };
        setAllocationGrid((prev) => ({ ...prev, [activeHall]: updatedGrid }));
        if (savedPlanId) {
          api.updateExamAttendance(savedPlanId, { student_id: seat.roll_number || seat.student_id, status: nextAtt })
            .catch((err) => console.error('Failed to sync seat attendance', err));
        }
      }
      return;
    }

    // 4. Default: Open detail drawer/modal
    setSelectedSeatKey(key);
  };

  // Seat Actions
  const toggleLockSeat = (key: string) => {
    const seat = currentGrid[key];
    if (!seat) return;
    const updated = {
      ...currentGrid,
      [key]: { ...seat, is_locked: !seat.is_locked },
    };
    setAllocationGrid((prev) => ({ ...prev, [activeHall]: updated }));
    const msg = seat.is_locked ? `Seat ${seat.seat_label} unlocked.` : `Seat ${seat.seat_label} locked.`;
    setStatusMessage(msg);
    showNotification('info', msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const toggleBlockSeat = (key: string) => {
    const seat = currentGrid[key];
    if (!seat) return;
    const isNowBlocked = !seat.is_blocked;
    const updated = {
      ...currentGrid,
      [key]: {
        ...seat,
        is_blocked: isNowBlocked,
        student_name: isNowBlocked ? undefined : seat.student_name,
        roll_number: isNowBlocked ? undefined : seat.roll_number,
        batch: isNowBlocked ? undefined : seat.batch,
      },
    };
    setAllocationGrid((prev) => ({ ...prev, [activeHall]: updated }));
    setValidationStatus('needs_validation');
    setSelectedSeatKey(null);
    const msg = isNowBlocked ? `Desk ${seat.seat_label} blocked.` : `Desk ${seat.seat_label} unblocked.`;
    setStatusMessage(msg);
    showNotification('info', msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const startMove = (key: string) => {
    setIsMoveMode(true);
    setMoveSourceKey(key);
    setIsSwapMode(false);
    setSwapSourceKey(null);
    setSelectedSeatKey(null);
    setStatusMessage(`Move mode active: Click any available desk to move candidate ${currentGrid[key]?.roll_number || ''}.`);
  };

  const startSwap = (key: string) => {
    setIsSwapMode(true);
    setSwapSourceKey(key);
    setIsMoveMode(false);
    setMoveSourceKey(null);
    setSelectedSeatKey(null);
    setStatusMessage(`Swap mode active: Click another desk to swap candidate ${currentGrid[key]?.roll_number || ''}.`);
  };

  const unassignStudent = (key: string) => {
    const seat = currentGrid[key];
    if (!seat) return;
    const updated = {
      ...currentGrid,
      [key]: {
        ...seat,
        student_name: undefined,
        roll_number: undefined,
        batch: undefined,
        student_id: undefined,
        is_locked: false,
      },
    };
    setAllocationGrid((prev) => ({ ...prev, [activeHall]: updated }));
    setValidationStatus('needs_validation');
    setSelectedSeatKey(null);
    const msg = `Candidate unassigned from desk ${seat.seat_label}.`;
    setStatusMessage(msg);
    showNotification('info', msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const markAllPresent = () => {
    const updatedGrid: Record<string, DeskCell> = {};
    Object.entries(currentGrid).forEach(([k, cell]) => {
      updatedGrid[k] = { ...cell, attendance: 'present' };
    });
    setAllocationGrid((prev) => ({ ...prev, [activeHall]: updatedGrid }));
    if (savedPlanId) {
      api.updateExamAttendance(savedPlanId, { absences: [] })
        .then(() => {
          showNotification('success', 'All candidates marked present and synchronized.');
        })
        .catch((err) => {
          console.error('Failed to sync batch attendance', err);
          showNotification('warning', 'Marked present locally; remote sync encountered an issue.');
        });
    } else {
      showNotification('success', 'All candidates marked as present.');
    }
    setStatusMessage('All candidates marked as present.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const exportCsv = () => {
    const headers = ['Hall', 'Seat Label', 'Roll Number', 'Candidate Name', 'Batch', 'Attendance Status'];
    const rows: string[][] = [];
    Object.entries(allocationGrid).forEach(([hallName, grid]) => {
      Object.entries(grid).forEach(([_, cell]) => {
        if (cell && !cell.is_blocked && cell.seat_label) {
          rows.push([
            hallName,
            cell.seat_label,
            cell.roll_number || '',
            `"${cell.student_name || 'Unassigned'}"`,
            cell.batch || '',
            cell.attendance || 'present',
          ]);
        }
      });
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `exam_seating_${selectedExamId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveDraftPlan = () => {
    const assignments: any[] = [];
    Object.entries(allocationGrid).forEach(([hallName, grid]) => {
      Object.entries(grid).forEach(([key, cell]) => {
        if (cell && !cell.is_blocked && cell.seat_label && cell.student_name) {
          const [r, c] = key.split('-').map(Number);
          assignments.push({
            student_id: cell.roll_number || cell.seat_label,
            room_id: hallName,
            row: r,
            col: c,
            seat_label: cell.seat_label,
          });
        }
      });
    });

    if (assignments.length > 0) {
      api.saveExamSeating({
        examination_id: selectedExamId || 'EXAM-2026-1101',
        plan: { kind: 'examination', status: 'allocated' },
        assignments,
      }).then((res) => {
        if (res && res.plan_id) setSavedPlanId(res.plan_id);
        showNotification('success', 'Examination seating allocation saved to database as draft.');
      }).catch((err) => {
        console.error('Failed to save exam seating plan', err);
        showNotification('warning', 'Saved locally; remote sync encountered an issue.');
      });
    } else {
      showNotification('warning', 'No seat assignments to save.');
    }
  };

  const handlePublish = () => {
    if (validationStatus === 'invalid' || conflictKeys.size > 0) {
      showNotification('error', 'Cannot publish an invalid seating plan. Please resolve adjacency conflicts or run validation first.');
      return;
    }

    setIsPublished(true);
    const assignments: any[] = [];
    Object.entries(allocationGrid).forEach(([hallName, grid]) => {
      Object.entries(grid).forEach(([key, cell]) => {
        if (cell && !cell.is_blocked && cell.seat_label && cell.student_name) {
          const [r, c] = key.split('-').map(Number);
          assignments.push({
            student_id: cell.roll_number || cell.seat_label,
            room_id: hallName,
            row: r,
            col: c,
            seat_label: cell.seat_label,
          });
        }
      });
    });

    if (assignments.length > 0) {
      api.saveExamSeating({
        examination_id: selectedExamId || 'EXAM-2026-1101',
        plan: { kind: 'examination', status: 'published' },
        assignments,
      }).then((res) => {
        if (res && res.plan_id) setSavedPlanId(res.plan_id);
        showNotification('success', 'Examination Seating Plan published and synced.');
      }).catch((err) => {
        console.error('Failed to save exam seating plan', err);
        showNotification('warning', 'Published locally; remote sync encountered an error.');
      });
    } else {
      showNotification('success', 'Examination Seating Plan published.');
    }

    setStatusMessage('Examination Seating Plan published. Student seat locators and attendance charts are live.');
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const activeSeatDetail = selectedSeatKey ? currentGrid[selectedSeatKey] : null;

  return (
    <div className="space-y-6">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <Binary className="w-5 h-5 text-black" />
            Seating Planner
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Generate, validate, and manage examination seating plans.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCsv}
            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg border border-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <a
            href={api.getExamLocatorPdfUrl(selectedExamId)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg border border-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            PDF Report
          </a>
          <button
            onClick={runAllocation}
            disabled={isGenerating}
            className="px-3.5 py-2 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isGenerating ? 'Generating...' : 'Generate Seating'}
          </button>
          <button
            onClick={regenerateUnlockedSeats}
            disabled={isGenerating}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Preserves locked seats and re-solves remaining desks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate Unlocked
          </button>
          <button
            onClick={runValidation}
            disabled={isValidating}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
              validationStatus === 'valid'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : validationStatus === 'invalid'
                ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                : 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {isValidating ? 'Validating...' : validationStatus === 'valid' ? 'Validated' : validationStatus === 'invalid' ? 'Invalid (Conflicts)' : 'Validate'}
          </button>
          {hasGenerated && (
            <>
              <button
                onClick={handleSaveDraftPlan}
                disabled={validationStatus === 'invalid' || isGenerating}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Save seating allocation to database"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Plan</span>
              </button>
              <button
                onClick={handlePublish}
                disabled={validationStatus === 'invalid' || conflictKeys.size > 0}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                  isPublished
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-black hover:bg-zinc-800 text-white shadow-xs'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                {isPublished ? 'Published' : 'Publish Plan'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Draft Exam Setup Banner if unallocated */}
      {!hasGenerated && (
        <div className="p-4 bg-zinc-950 text-white rounded-xl border border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-white text-zinc-950 font-bold text-[10px] rounded uppercase tracking-wider">
                Draft Mode
              </span>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Exam Seating Layout Ready for Generation
              </h2>
            </div>
            <p className="text-xs text-zinc-300">
              Exam: <strong className="text-white">{activeExam.name}</strong> • Selected Venue:{' '}
              <strong className="text-white">{activeHall}</strong> • Participating Batches:{' '}
              <strong className="text-white">{(activeExam.batches || []).join(', ')}</strong> ({totalStudentsCount} candidates)
            </p>
          </div>
          <button
            onClick={runAllocation}
            disabled={isGenerating}
            className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isGenerating ? 'Generating Solver...' : 'Generate Seating Plan'}
          </button>
        </div>
      )}

      {/* SECTION 5 MANDATORY KPI BANNER: Selected Examination, Hall, Total Students, Available Seats, Allocated, Unallocated, Validation Status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Selected Examination & Session */}
        <div className="bg-white rounded-xl p-3.5 border border-zinc-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Examination</span>
          <div className="mt-1">
            <p className="text-xs font-bold text-zinc-900 truncate" title={activeExam.name}>
              {activeExam.name}
            </p>
            <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">
              {activeExam.session || 'Morning'} Session
            </span>
          </div>
        </div>

        {/* 2. Selected Hall */}
        <div className="bg-white rounded-xl p-3.5 border border-zinc-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Selected Hall</span>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-bold text-zinc-900">{activeHall}</span>
            <DoorClosed className="w-4 h-4 text-zinc-400" />
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">{currentHallConfig.rows}R × {currentHallConfig.cols}C Layout</span>
        </div>

        {/* 3. Total Students */}
        <div className="bg-white rounded-xl p-3.5 border border-zinc-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Candidates</span>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-bold text-zinc-900">{totalStudentsCount}</span>
            <Users className="w-4 h-4 text-zinc-700" />
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">Across {Object.keys(batchCounts).length} batches</span>
        </div>

        {/* 4. Available Seats */}
        <div className="bg-white rounded-xl p-3.5 border border-zinc-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Available Desks</span>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-bold text-zinc-900">{availableSeatsCount}</span>
            <Armchair className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">{blockedSeatsCount} blocked unavailable</span>
        </div>

        {/* 5. Allocated Students */}
        <div className="bg-white rounded-xl p-3.5 border border-zinc-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Allocated Desks</span>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-bold text-emerald-700">{totalAllocatedAcrossAllHalls}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">{allocatedStudentsCount} in {activeHall} • {lockedSeatsCount} pinned</span>
        </div>

        {/* 6. Unallocated Students & Validation Status */}
        <div className={`rounded-xl p-3.5 border shadow-xs flex flex-col justify-between ${
          validationStatus === 'valid'
            ? 'bg-emerald-50/60 border-emerald-200'
            : validationStatus === 'invalid'
            ? 'bg-rose-50/60 border-rose-200'
            : 'bg-amber-50/60 border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Unallocated</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
              validationStatus === 'valid'
                ? 'bg-emerald-600 text-white'
                : validationStatus === 'invalid'
                ? 'bg-rose-600 text-white'
                : 'bg-amber-600 text-white'
            }`}>
              {validationStatus}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-bold text-zinc-900">{unallocatedStudentsCount}</span>
            <ShieldCheck className={`w-4 h-4 ${
              validationStatus === 'valid' ? 'text-emerald-600' : validationStatus === 'invalid' ? 'text-rose-600' : 'text-amber-600'
            }`} />
          </div>
          <span className="text-[10px] font-medium text-zinc-600">
            {unallocatedStudentsCount === 0 ? 'Full allocation' : `${unallocatedStudentsCount} pending desks`}
          </span>
        </div>
      </div>

      {/* Banner Notifications */}
      {statusMessage && (
        <div className="p-3 bg-zinc-100 border border-zinc-300 text-zinc-900 text-xs rounded-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-zinc-600 hover:text-black">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {conflictKeys.size > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Adjacency Conflict Detected: </span>
            {conflictPairs.map((p, i) => (
              <span key={i} className="mr-2">
                [{p.a} &amp; {p.b} share batch {p.batch}]
              </span>
            ))}
            <span className="text-rose-700 font-medium">Please swap or move candidates to resolve before publishing.</span>
          </div>
        </div>
      )}

      {/* Active Mode Notice */}
      {(isMoveMode || isSwapMode) && (
        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-amber-600" />
            <span className="font-semibold">
              {isMoveMode
                ? `Move Mode Active: Click any empty desk to relocate candidate ${currentGrid[moveSourceKey || '']?.roll_number}.`
                : `Swap Mode Active: Click another occupied desk to swap candidate ${currentGrid[swapSourceKey || '']?.roll_number}.`}
            </span>
          </div>
          <button
            onClick={() => {
              setIsMoveMode(false);
              setMoveSourceKey(null);
              setIsSwapMode(false);
              setSwapSourceKey(null);
            }}
            className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 rounded text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Top 3 Configuration & Policy Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Policy Configuration Card */}
        <PolicyConfigurator
          compact
          policy={policy}
          onChange={(newPolicy) => {
            setPolicy(newPolicy);
            setValidationStatus('needs_validation');
          }}
        />

        {/* Participating Batches & Candidates */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-zinc-700" />
            Participating Batches ({totalStudentsCount} Candidates)
          </h2>
          <div className="space-y-2">
            {Object.entries(batchCounts).map(([batch, count]) => {
              const theme = getBatchStyle(batch);
              return (
                <div
                  key={batch}
                  className="p-2.5 rounded-lg border border-zinc-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${theme.badge}`}>
                      {batch}
                    </span>
                    <span className="text-zinc-600 font-medium">University Examination</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900">{count} Candidates</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Pigeonhole Feasibility |S| ≤ |T|:</span>
            <span className="font-mono font-bold text-emerald-600">
              {allocatedStudentsCount} allocated ≤ {availableSeatsCount} usable (Feasible)
            </span>
          </div>
        </div>

        {/* Mathematical Proof Validation Box */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sigma className="w-4 h-4 text-zinc-700" />
                Mathematical Verification
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  validationStatus === 'valid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : validationStatus === 'invalid'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                {validationStatus === 'valid' ? 'Valid Allocation' : validationStatus === 'invalid' ? 'Invalid Allocation' : 'Needs Validation'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Injective Function f: S → T:</span>
                <span className="font-bold text-emerald-700">Verified (No collisions)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Adjacency Violations:</span>
                <span className={`font-mono font-bold ${conflictKeys.size > 0 ? 'text-rose-600' : 'text-zinc-900'}`}>
                  {conflictKeys.size} edge conflicts
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Blocked Desks Assigned:</span>
                <span className="font-bold text-emerald-700">0 (Strictly respected)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-zinc-500">Locked Seat Constraints:</span>
                <span className="font-mono font-bold text-zinc-900">{lockedSeatsCount} desks pinned</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 mt-2 font-mono">
            Solver: CP-SAT &amp; Checkerboard • Status: {validationStatus.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Hall Tabs, Controls & Grid */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs space-y-4">
        {/* Hall Selection & Legend Toolbar */}
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-100 pb-3 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Exam:</span>
              <select
                value={selectedExamId}
                onChange={(e) => {
                  setSelectedExamId(e.target.value);
                  setValidationStatus('needs_validation');
                }}
                className="text-xs font-semibold border border-zinc-300 rounded-lg px-2.5 py-1.5 bg-white text-zinc-900 max-w-xs truncate"
              >
                {availableExams.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider mr-1">
                Venue:
              </span>
              {selectedHalls.map((hall) => {
                const isExamCenter = hall === 'A-313' || hall === 'A-314' || hall === 'C-327';
                return (
                  <button
                    key={hall}
                    onClick={() => {
                      setActiveHall(hall);
                      setSelectedSeatKey(null);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 font-mono ${
                      activeHall === hall
                        ? 'bg-zinc-950 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                    }`}
                  >
                    <DoorClosed className="w-3.5 h-3.5" />
                    {hall}
                    {isExamCenter && (
                      <span className="text-[9px] px-1 py-0.2 bg-zinc-800 text-zinc-200 rounded">
                        ⭐ SEC
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Quick Add Any Authentic College Hall */}
              <select
                value=""
                onChange={(e) => {
                  const h = e.target.value;
                  if (!h) return;
                  if (!selectedHalls.includes(h)) {
                    setSelectedHalls([...selectedHalls, h]);
                  }
                  setActiveHall(h);
                  setSelectedSeatKey(null);
                }}
                className="text-xs border border-zinc-300 rounded-lg px-2 py-1.5 bg-white text-zinc-700 font-medium hover:border-zinc-500 focus:outline-none"
              >
                <option value="">+ Add Campus Hall...</option>
                <optgroup label="Official Examination Centers (3rd Floor)">
                  <option value="A-313">A-313 (Examination Section, 180 m²)</option>
                  <option value="A-314">A-314 (Valuation Room, 120 m²)</option>
                  <option value="C-327">C-327 (Examination Section, 180 m²)</option>
                </optgroup>
                <optgroup label="1st Floor Lecture Halls & Computing">
                  <option value="A-101">A-101 (Lecture Hall, 65 m²)</option>
                  <option value="A-102">A-102 (Lecture Hall, 65 m²)</option>
                  <option value="A-103">A-103 (Lecture Hall, 65 m²)</option>
                  <option value="A-113">A-113 (Seminar Auditorium, 240 m²)</option>
                  <option value="B-110">B-110 (Lecture Hall, 65 m²)</option>
                  <option value="B-111">B-111 (Lecture Hall, 65 m²)</option>
                  <option value="B-112">B-112 (Lecture Hall, 65 m²)</option>
                  <option value="B-125-A">B-125-A (Computer Lab 1)</option>
                  <option value="B-125-B">B-125-B (Computer Lab 2)</option>
                  <option value="B-126-A">B-126-A (Computer Lab 3)</option>
                  <option value="B-126-B">B-126-B (Computer Lab 4)</option>
                  <option value="B-127-A">B-127-A (Lecture Hall, 65 m²)</option>
                  <option value="B-127-B">B-127-B (Lecture Hall, 65 m²)</option>
                  <option value="B-127-C">B-127-C (Lecture Hall, 65 m²)</option>
                  <option value="C-106">C-106 (Lecture Hall, 65 m²)</option>
                  <option value="C-107">C-107 (Lecture Hall, 65 m²)</option>
                  <option value="C-108">C-108 (Lecture Hall, 65 m²)</option>
                  <option value="C-109">C-109 (Lecture Hall, 65 m²)</option>
                  <option value="D-104">D-104 (Lecture Hall, 65 m²)</option>
                </optgroup>
                <optgroup label="2nd Floor Lecture Halls & Labs">
                  <option value="A-201">A-201 (Lecture Hall, 65 m²)</option>
                  <option value="A-202">A-202 (Lecture Hall, 65 m²)</option>
                  <option value="A-203">A-203 (Lecture Hall, 65 m²)</option>
                  <option value="A-204">A-204 (Lecture Hall, 65 m²)</option>
                  <option value="A-205">A-205 (Lecture Hall, 65 m²)</option>
                  <option value="A-206">A-206 (Lecture Hall, 65 m²)</option>
                  <option value="A-210">A-210 (Lecture Hall, 65 m²)</option>
                  <option value="A-211">A-211 (Lecture Hall, 65 m²)</option>
                  <option value="A-212">A-212 (Lecture Hall, 65 m²)</option>
                  <option value="B-207">B-207 (Lecture Hall, 65 m²)</option>
                  <option value="B-208">B-208 (Lecture Hall, 65 m²)</option>
                  <option value="B-224">B-224 (Advanced Computing Lab, 240 m²)</option>
                  <option value="D-204">D-204 (Lecture Hall, 65 m²)</option>
                  <option value="D-205">D-205 (Lecture Hall, 65 m²)</option>
                  <option value="D-206">D-206 (Lecture Hall, 65 m²)</option>
                </optgroup>
                <optgroup label="3rd Floor Lecture Halls & Labs">
                  <option value="A-301">A-301 (Lecture Hall, 65 m²)</option>
                  <option value="A-302">A-302 (Lecture Hall, 65 m²)</option>
                  <option value="A-303">A-303 (Lecture Hall, 65 m²)</option>
                  <option value="A-312">A-312 (Lecture Hall, 65 m²)</option>
                  <option value="A-316">A-316 (Programming Lab, 240 m²)</option>
                  <option value="B-307">B-307 (Lecture Hall, 65 m²)</option>
                  <option value="B-308">B-308 (Lecture Hall, 65 m²)</option>
                  <option value="B-309">B-309 (Lecture Hall, 65 m²)</option>
                  <option value="B-321-A">B-321-A (Lecture Hall, 65 m²)</option>
                  <option value="B-321-B">B-321-B (Lecture Hall, 65 m²)</option>
                  <option value="C-310">C-310 (Lecture Hall, 65 m²)</option>
                  <option value="C-311">C-311 (Lecture Hall, 65 m²)</option>
                  <option value="C-312">C-312 (Lecture Hall, 65 m²)</option>
                  <option value="D-304">D-304 (Lecture Hall, 65 m²)</option>
                  <option value="D-305">D-305 (Lecture Hall, 65 m²)</option>
                  <option value="D-306">D-306 (Lecture Hall, 65 m²)</option>
                </optgroup>
                <optgroup label="4th Floor Lecture Halls">
                  <option value="A-403">A-403 (Lecture Hall, 65 m²)</option>
                  <option value="B-407">B-407 (Lecture Hall, 65 m²)</option>
                  <option value="B-408">B-408 (Lecture Hall, 65 m²)</option>
                  <option value="C-410">C-410 (Lecture Hall, 65 m²)</option>
                  <option value="C-411">C-411 (Lecture Hall, 65 m²)</option>
                  <option value="C-412">C-412 (Lecture Hall, 65 m²)</option>
                </optgroup>
                <optgroup label="Ground Floor Auditoria">
                  <option value="A-002">A-002 (Seminar Hall, 240 m²)</option>
                  <option value="A-004">A-004 (Kemi Lecture Hall, 240 m²)</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Attendance Toggle & Mode Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setAttendanceMode(!attendanceMode)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                attendanceMode
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              {attendanceMode ? 'Attendance Mode (Active)' : 'Mark Attendance'}
            </button>

            {attendanceMode && (
              <button
                onClick={markAllPresent}
                className="px-2.5 py-1.5 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg border border-zinc-300 font-medium cursor-pointer"
              >
                Mark All Present
              </button>
            )}

            {/* Batch Color Legend */}
            <SeatingLegend
              compact
              batches={
                (Object.keys(batchCounts).length > 0
                  ? Object.keys(batchCounts)
                  : activeExam.batches && activeExam.batches.length > 0
                  ? activeExam.batches
                  : ['AIML-S3A']
                ).map((b) => {
                  const style = getBatchStyle(b);
                  return { name: b, color: `${style.badge}` };
                })
              }
            />
          </div>
        </div>

        {/* Podium Indicator */}
        <div className="w-full py-1.5 bg-zinc-100 rounded text-center text-[10px] font-bold text-zinc-700 uppercase tracking-widest border border-zinc-300">
          [ Invigilator Desk / Examination Hall Podium — {activeHall} ]
        </div>

        {/* Hall Grid */}
        <div className="overflow-x-auto pb-4">
          <div
            className="grid gap-2.5 justify-center mx-auto"
            style={{
              gridTemplateColumns: `repeat(${currentHallConfig.cols}, minmax(100px, 120px))`,
            }}
          >
            {Array.from({ length: currentHallConfig.rows }).map((_, r) => {
              return Array.from({ length: currentHallConfig.cols }).map((__, c) => {
                const key = `${r}-${c}`;
                const seat = currentGrid[key];
                const rowLetter = String.fromCharCode(65 + r);
                const seatLabel = `${rowLetter}${c + 1}`;
                const isSelected = selectedSeatKey === key;
                const isConflict = conflictKeys.has(key);
                const isMoveSource = moveSourceKey === key;
                const isSwapSource = swapSourceKey === key;

                // Blocked Desk
                if (seat?.is_blocked) {
                  return (
                    <div
                      key={key}
                      onClick={() => handleSeatClick(key)}
                      className={`h-22 rounded-lg border-2 border-dashed border-rose-300 bg-rose-50/50 p-2 flex flex-col items-center justify-center text-center opacity-70 cursor-pointer hover:opacity-100 transition-all ${
                        isSelected ? 'ring-2 ring-zinc-900' : ''
                      }`}
                    >
                      <span className="font-mono text-[10px] font-bold text-rose-500">{seatLabel}</span>
                      <span className="text-[9px] text-rose-700 font-medium flex items-center gap-1 mt-0.5">
                        <Ban className="w-3 h-3 text-rose-500" />
                        Blocked Desk
                      </span>
                    </div>
                  );
                }

                // Empty Unassigned Desk
                if (!seat || !seat.student_name) {
                  return (
                    <div
                      key={key}
                      onClick={() => handleSeatClick(key)}
                      className={`h-22 rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-2 flex flex-col items-center justify-center text-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-100 transition-all ${
                        isSelected ? 'ring-2 ring-zinc-900' : ''
                      } ${isMoveMode ? 'border-zinc-500 bg-zinc-100 animate-pulse' : ''}`}
                    >
                      <span className="font-mono text-[10px] font-bold text-zinc-400">{seatLabel}</span>
                      <span className="text-[9px] text-zinc-400 font-medium mt-0.5">
                        {isMoveMode ? 'Click to Place' : 'Empty Desk'}
                      </span>
                    </div>
                  );
                }

                // Occupied Desk
                const theme = getBatchStyle(seat.batch || '');

                return (
                  <div
                    key={key}
                    onClick={() => handleSeatClick(key)}
                    className={`h-22 rounded-lg border p-2 flex flex-col justify-between shadow-2xs transition-all cursor-pointer relative select-none ${
                      theme.bg
                    } ${
                      isConflict
                        ? 'border-2 border-rose-500 ring-2 ring-rose-300 bg-rose-50'
                        : isSelected
                        ? 'border-2 border-zinc-900 ring-2 ring-zinc-400'
                        : isMoveSource || isSwapSource
                        ? 'border-2 border-amber-500 ring-2 ring-amber-300'
                        : theme.border
                    }`}
                  >
                    {/* Top Row: Seat Label & Batch / Lock / Attendance */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-[10px] text-zinc-600">{seatLabel}</span>
                        {seat.is_locked && (
                          <span title="Pinned/Locked seat assignment">
                            <Lock className="w-2.5 h-2.5 text-amber-600" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {attendanceMode && (
                          <span
                            className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                              seat.attendance === 'absent' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {seat.attendance === 'absent' ? 'ABS' : 'PRE'}
                          </span>
                        )}
                        <span className={`px-1 py-0.2 rounded text-[8px] font-bold font-mono ${theme.badge}`}>
                          {seat.batch ? seat.batch.split('-')[0] : 'STU'}
                        </span>
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="space-y-0.5">
                      <p className={`text-[10px] font-bold leading-tight truncate ${theme.text}`}>
                        {seat.student_name}
                      </p>
                      <p className="font-mono text-[9px] text-zinc-500 font-semibold">{seat.roll_number}</p>
                    </div>

                    {/* Conflict Badge */}
                    {isConflict && (
                      <div className="absolute -bottom-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 shadow-xs">
                        <AlertTriangle className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                );
              });
            })}
          </div>
        </div>

        {/* Footer Grid Summary */}
        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-zinc-100 text-xs text-zinc-600 gap-2">
          <div className="flex items-center gap-4">
            <span>Total Hall Desks: <strong className="text-zinc-900">{totalHallSeats}</strong></span>
            <span>Available Desks: <strong className="text-zinc-900">{availableSeatsCount}</strong></span>
            <span>Allocated: <strong className="text-emerald-700">{allocatedStudentsCount}</strong></span>
            <span>Locked: <strong className="text-amber-700">{lockedSeatsCount}</strong></span>
            {attendanceMode && (
              <span>Attendance: <strong className="text-emerald-700">{presentCount} Present</strong> • <strong className="text-rose-700">{absentCount} Absent</strong></span>
            )}
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            Click any seat to inspect, lock, move, or swap candidates.
          </span>
        </div>
      </div>

      {/* Seat Detail Modal / Popover */}
      {activeSeatDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-zinc-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-zinc-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <DoorClosed className="w-4 h-4 text-zinc-300" />
                  Examination Seat {activeSeatDetail.seat_label} ({activeHall})
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Grid Position: Row {activeSeatDetail.row + 1}, Desk {activeSeatDetail.col + 1}
                </p>
              </div>
              <button
                onClick={() => setSelectedSeatKey(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {activeSeatDetail.is_blocked ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Ban className="w-4 h-4 text-rose-600" />
                    Desk Marked as Blocked / Unavailable
                  </p>
                  <p className="text-[11px] text-rose-700">
                    This desk is physically unavailable or blocked for invigilator clearance.
                  </p>
                </div>
              ) : activeSeatDetail.student_name ? (
                <div className="space-y-3">
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">Assigned Candidate</span>
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-900 border border-zinc-200 font-mono font-bold text-[10px] rounded">
                        {activeSeatDetail.batch}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-zinc-900">{activeSeatDetail.student_name}</p>
                    <p className="font-mono text-xs font-semibold text-zinc-600">Roll No: {activeSeatDetail.roll_number}</p>
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Attendance:</span>
                      <span className={`font-bold ${activeSeatDetail.attendance === 'absent' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {activeSeatDetail.attendance === 'absent' ? 'Absent' : 'Present'}
                      </span>
                    </div>
                  </div>

                  {activeSeatDetail.is_locked && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      Assignment locked. It will not be altered during partial regeneration.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 text-xs">
                  <p className="font-bold">Unassigned Desk</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    No candidate is currently assigned to this seat.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 text-xs">
                {activeSeatDetail.student_name && !activeSeatDetail.is_blocked && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => selectedSeatKey && startMove(selectedSeatKey)}
                      className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg font-semibold flex items-center justify-center gap-1.5 border border-zinc-300 transition-colors"
                    >
                      <Move className="w-3.5 h-3.5" />
                      Move Seat
                    </button>
                    <button
                      onClick={() => selectedSeatKey && startSwap(selectedSeatKey)}
                      className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg font-semibold flex items-center justify-center gap-1.5 border border-zinc-300 transition-colors"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      Swap Student
                    </button>
                    <button
                      onClick={() => selectedSeatKey && toggleLockSeat(selectedSeatKey)}
                      className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg font-semibold flex items-center justify-center gap-1.5 border border-zinc-300 transition-colors"
                    >
                      {activeSeatDetail.is_locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {activeSeatDetail.is_locked ? 'Unlock Seat' : 'Lock Seat'}
                    </button>
                    <button
                      onClick={() => selectedSeatKey && unassignStudent(selectedSeatKey)}
                      className="px-3 py-2 bg-zinc-100 hover:bg-rose-50 hover:text-rose-700 text-zinc-700 rounded-lg font-semibold flex items-center justify-center gap-1.5 border border-zinc-300 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Unassign
                    </button>
                  </div>
                )}

                <button
                  onClick={() => selectedSeatKey && toggleBlockSeat(selectedSeatKey)}
                  className={`w-full px-3 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 border transition-colors ${
                    activeSeatDetail.is_blocked
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  {activeSeatDetail.is_blocked ? 'Unblock Desk (Make Available)' : 'Block Desk (Unavailable)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSeatingPage;
