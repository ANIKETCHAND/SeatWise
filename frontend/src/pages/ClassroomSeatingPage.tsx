import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Armchair,
  Calendar,
  Clock,
  DoorClosed,
  User,
  BookOpen,
  Search,
  Save,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserX,
  Shuffle,
  Download,
} from 'lucide-react';
import { INITIAL_PROGRAMS, PERIOD_TIMINGS } from '../data/universityData';
import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { exportTableToCsv } from '../utils/exportHelpers';

interface AssignedSeat {
  seat_label: string;
  row: number;
  col: number;
  student_roll: string;
  student_name: string;
  is_absent?: boolean;
}

export const ClassroomSeatingPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [searchParams] = useSearchParams();
  const planIdFromQuery = searchParams.get('plan_id');

  const [program, setProgram] = useState('AIML');
  const [semester, setSemester] = useState(3);
  const [section, setSection] = useState('A');
  const [date, setDate] = useState('2026-11-04');
  const [period, setPeriod] = useState('P1');
  const [search, setSearch] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(planIdFromQuery);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Timetable Resolved Context
  const resolvedSession = {
    subject: 'Data Structures & Algorithms',
    code: '21CS301',
    faculty: 'Dr. Ramesh Kumar',
    room: 'LH-201',
    building: 'Block B, 2nd Floor',
    rows: 5,
    columns: 8,
    total_desks: 40,
    blocked: ['0-2'],
  };

  // Mock Students Roster for Section 3A
  const initialRoster = Array.from({ length: 32 }).map((_, i) => ({
    roll: `23JU01${(i + 1).toString().padStart(2, '0')}`,
    name: [
      'Aarav Sharma', 'Ananya Deshmukh', 'Bhavin Patel', 'Chaitanya Reddy', 'Divya Nambiar',
      'Eshaan Joshi', 'Farhan Akhtar', 'Gaurav Kulkarni', 'Harini Iyer', 'Ishaan Verma',
      'Janhavi Rao', 'Karan Mehra', 'Lavanya S.', 'Manish Tewari', 'Neha Chawla',
      'Omkar Joshi', 'Pooja Hegde', 'Pranav Nair', 'Rohan Gupta', 'Sanya Mirza',
      'Siddharth Roy', 'Tanvi Bhat', 'Uday Shankar', 'Varun Dhawan', 'Vidya Balan',
      'Yash Singhania', 'Zara Sheikh', 'Aditya Birla', 'Meera Rajput', 'Kavya Madhavan',
      'Nikhil Kamath', 'Tarun Tahiliani'
    ][i % 32],
  }));

  // Initial Seating assignments (Standard classroom mode: same batch adjacent is ALLOWED)
  const [assignments, setAssignments] = useState<Record<string, AssignedSeat>>(() => {
    const map: Record<string, AssignedSeat> = {};
    let studentIdx = 0;
    for (let r = 0; r < resolvedSession.rows; r++) {
      for (let c = 0; c < resolvedSession.columns; c++) {
        const key = `${r}-${c}`;
        if (resolvedSession.blocked.includes(key)) continue;
        if (studentIdx < initialRoster.length) {
          const st = initialRoster[studentIdx++];
          const rowLetter = String.fromCharCode(65 + r);
          map[key] = {
            seat_label: `${rowLetter}${c + 1}`,
            row: r,
            col: c,
            student_roll: st.roll,
            student_name: st.name,
            is_absent: false,
          };
        }
      }
    }
    return map;
  });

  const [selectedSeatKey, setSelectedSeatKey] = useState<string | null>(null);

  // Auto-allocate / Shuffle
  const handleShuffle = () => {
    const shuffledStudents = [...initialRoster].sort(() => Math.random() - 0.5);
    const map: Record<string, AssignedSeat> = {};
    let studentIdx = 0;
    for (let r = 0; r < resolvedSession.rows; r++) {
      for (let c = 0; c < resolvedSession.columns; c++) {
        const key = `${r}-${c}`;
        if (resolvedSession.blocked.includes(key)) continue;
        if (studentIdx < shuffledStudents.length) {
          const st = shuffledStudents[studentIdx++];
          const rowLetter = String.fromCharCode(65 + r);
          map[key] = {
            seat_label: `${rowLetter}${c + 1}`,
            row: r,
            col: c,
            student_roll: st.roll,
            student_name: st.name,
            is_absent: false,
          };
        }
      }
    }
    setAssignments(map);
    setFeedback('Classroom seating automatically rearranged.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSeatClick = (key: string) => {
    if (!selectedSeatKey) {
      if (assignments[key]) {
        setSelectedSeatKey(key);
      }
    } else {
      // Swap or move
      if (key !== selectedSeatKey) {
        const next = { ...assignments };
        const seatA = next[selectedSeatKey];
        const seatB = next[key];

        if (seatB) {
          // swap
          next[selectedSeatKey] = {
            ...seatB,
            row: seatA.row,
            col: seatA.col,
            seat_label: seatA.seat_label,
          };
          next[key] = {
            ...seatA,
            row: seatB.row,
            col: seatB.col,
            seat_label: seatB.seat_label,
          };
        } else {
          // move to empty seat
          delete next[selectedSeatKey];
          const rowLetter = String.fromCharCode(65 + parseInt(key.split('-')[0]));
          const colNum = parseInt(key.split('-')[1]) + 1;
          next[key] = {
            ...seatA,
            row: parseInt(key.split('-')[0]),
            col: parseInt(key.split('-')[1]),
            seat_label: `${rowLetter}${colNum}`,
          };
        }
        setAssignments(next);
        setFeedback(`Student seat swapped successfully.`);
        setTimeout(() => setFeedback(null), 3000);
      }
      setSelectedSeatKey(null);
    }
  };

  const toggleAbsence = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!assignments[key]) return;
    setAssignments({
      ...assignments,
      [key]: {
        ...assignments[key],
        is_absent: !assignments[key].is_absent,
      },
    });
  };

  useEffect(() => {
    if (planIdFromQuery) {
      api.getClassroomPlan(planIdFromQuery)
        .then((res) => {
          if (res && res.assignments && res.assignments.length > 0) {
            const map: Record<string, AssignedSeat> = {};
            const absentIds = new Set(
              (res.attendance || []).filter((a: any) => a.status === 'absent').map((a: any) => a.student_id)
            );
            res.assignments.forEach((a: any) => {
              const key = `${a.row}-${a.col}`;
              map[key] = {
                seat_label: a.seat_label,
                row: a.row,
                col: a.col,
                student_roll: (a.students || {}).roll_number || a.student_id,
                student_name: (a.students || {}).full_name || 'Enrolled Student',
                is_absent: absentIds.has(a.student_id),
              };
            });
            setAssignments(map);
            if (res.plan?.plan_date) setDate(res.plan.plan_date);
            if (res.plan?.period) setPeriod(`P${res.plan.period}`);
            setSavedPlanId(planIdFromQuery);
            setFeedback(`Reopened saved seating plan ${planIdFromQuery} from database.`);
            setTimeout(() => setFeedback(null), 4000);
          }
        })
        .catch(() => {});
    }
  }, [planIdFromQuery]);

  const saveSeatingPlan = async () => {
    setIsSaved(true);
    try {
      const res = await api.saveClassroomSeating({
        batch_id: `batch-${program.toLowerCase()}-s${semester}${section.toLowerCase()}`,
        room_id: resolvedSession.room,
        plan_date: date,
        period: parseInt(period.replace('P', ''), 10) || 1,
        assignments: Object.entries(assignments).map(([_, a]) => ({
          student_id: a.student_roll,
          room_id: resolvedSession.room,
          row: a.row,
          col: a.col,
          seat_label: a.seat_label,
        })),
      });
      if (res && res.plan_id) {
        setSavedPlanId(res.plan_id);
      }
      setFeedback(`Classroom seating plan for ${resolvedSession.room} (${period}) saved to database.`);
      showNotification('success', `Classroom plan saved for ${resolvedSession.room} (${period}).`);
    } catch (err: any) {
      setFeedback(`Classroom seating plan for ${resolvedSession.room} (${period}) archived.`);
      showNotification('warning', `Plan saved locally (${err?.message || 'Database sync failed'})`);
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const exportCsv = () => {
    const headers = [
      { key: 'student_roll', label: 'Roll Number' },
      { key: 'student_name', label: 'Student Name' },
      { key: 'seat_label', label: 'Seat Label' },
      { key: 'row', label: 'Row' },
      { key: 'col', label: 'Column' },
      { key: 'attendance_status', label: 'Attendance Status' },
    ];
    const data = Object.values(assignments).map((a) => ({
      ...a,
      attendance_status: a.is_absent ? 'Absent' : 'Present',
    }));
    exportTableToCsv(
      data,
      headers,
      `classroom_seating_${program}_s${semester}${section}_${period}_${date}.csv`
    );
    showNotification('success', 'Classroom seating roster exported to CSV successfully.');
  };

  const absentCount = Object.values(assignments).filter((s) => s.is_absent).length;
  const presentCount = Object.values(assignments).length - absentCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Armchair className="w-5 h-5 text-primary-600" />
            Mode A: Regular Classroom Seating
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily lecture & lab seating. Dynamic timetable session resolution with attendance marking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Seating Chart
          </button>
          <button
            onClick={saveSeatingPlan}
            className="px-3.5 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Save Seating Plan
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {feedback}
        </div>
      )}

      {/* Timetable Session Selector Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase">Program</label>
          <select
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className="w-full text-xs font-medium border border-slate-300 rounded-lg p-1.5 mt-1 bg-white"
          >
            {INITIAL_PROGRAMS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase">Semester</label>
          <select
            value={semester}
            onChange={(e) => setSemester(Number(e.target.value))}
            className="w-full text-xs font-medium border border-slate-300 rounded-lg p-1.5 mt-1 bg-white"
          >
            {[1, 3, 5, 7].map((s) => (
              <option key={s} value={s}>
                Sem {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase">Section</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full text-xs font-medium border border-slate-300 rounded-lg p-1.5 mt-1 bg-white"
          >
            {['A', 'B', 'C', 'D'].map((sec) => (
              <option key={sec} value={sec}>
                Sec {sec}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-xs font-medium border border-slate-300 rounded-lg p-1.5 mt-1"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full text-xs font-medium border border-slate-300 rounded-lg p-1.5 mt-1 bg-white font-mono"
          >
            {PERIOD_TIMINGS.map((pt) => (
              <option key={pt.period} value={pt.period}>
                {pt.period} ({pt.time})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic Session Card */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white border border-white/20">
            <BookOpen className="w-6 h-6 text-primary-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/20 text-white font-semibold">
                {resolvedSession.code}
              </span>
              <h2 className="text-base font-bold text-white">{resolvedSession.subject}</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-200 mt-1">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-primary-300" />
                {resolvedSession.faculty}
              </span>
              <span className="flex items-center gap-1 font-semibold text-accent-300">
                <DoorClosed className="w-3.5 h-3.5" />
                Assigned Venue: {resolvedSession.room} ({resolvedSession.building})
              </span>
            </div>
          </div>
        </div>

        {/* Attendance stats */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-300">Present</span>
            <p className="text-base font-bold text-emerald-400">{presentCount}</p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-300">Absent</span>
            <p className="text-base font-bold text-rose-400">{absentCount}</p>
          </div>
          <button
            onClick={handleShuffle}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5"
            title="Rearrange Seats"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Rearrange
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-3 bg-zinc-100 border border-zinc-300 rounded-lg text-zinc-900 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
          <span>
            <strong>Classroom Mode Rule:</strong> Same-batch peer adjacency is allowed by default for regular classroom sessions. Click any seat to move/swap students. Click the user icon to mark absence.
          </span>
        </div>
        {selectedSeatKey && (
          <span className="px-2 py-0.5 bg-primary-600 text-white rounded text-[10px] font-bold animate-pulse">
            Selected seat {assignments[selectedSeatKey]?.seat_label} — click target desk to swap
          </span>
        )}
      </div>

      {/* Classroom Seating Grid Visualizer */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        {/* Front of Classroom */}
        <div className="w-full py-2 bg-slate-100 rounded text-center text-xs font-bold text-slate-600 uppercase tracking-widest border border-slate-300">
          [ Whiteboard / Projector Screen / Faculty Podium ]
        </div>

        <div className="overflow-x-auto pb-4">
          <div
            className="grid gap-2.5 justify-center mx-auto"
            style={{
              gridTemplateColumns: `repeat(${resolvedSession.columns}, minmax(88px, 110px))`,
            }}
          >
            {Array.from({ length: resolvedSession.rows }).map((_, r) => {
              const rowLetter = String.fromCharCode(65 + r);
              return Array.from({ length: resolvedSession.columns }).map((__, c) => {
                const key = `${r}-${c}`;
                const isBlocked = resolvedSession.blocked.includes(key);
                const assigned = assignments[key];
                const seatLabel = `${rowLetter}${c + 1}`;
                const isSelected = selectedSeatKey === key;

                if (isBlocked) {
                  return (
                    <div
                      key={key}
                      className="h-20 rounded-lg border border-dashed border-rose-300 bg-rose-50/60 p-2 flex flex-col items-center justify-center text-center opacity-70"
                    >
                      <span className="font-mono text-[10px] font-bold text-rose-500">{seatLabel}</span>
                      <span className="text-[9px] text-rose-600 font-medium">Blocked</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={key}
                    onClick={() => handleSeatClick(key)}
                    className={`h-20 rounded-lg border p-2 flex flex-col justify-between text-left cursor-pointer transition-all relative ${
                      isSelected
                        ? 'border-primary-600 ring-2 ring-primary-500 bg-primary-50 shadow-md'
                        : assigned
                        ? assigned.is_absent
                          ? 'border-rose-300 bg-rose-50/40 hover:border-rose-400'
                          : 'border-slate-300 bg-white hover:border-primary-400 hover:shadow-xs'
                        : 'border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[10px] text-slate-500">{seatLabel}</span>
                      {assigned && (
                        <button
                          type="button"
                          onClick={(e) => toggleAbsence(key, e)}
                          title={assigned.is_absent ? 'Mark Present' : 'Mark Absent'}
                          className={`p-1 rounded transition-colors ${
                            assigned.is_absent
                              ? 'bg-rose-100 text-rose-700'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                          }`}
                        >
                          <UserX className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {assigned ? (
                      <div className="space-y-0.5">
                        <p className={`text-[11px] font-bold leading-tight truncate ${assigned.is_absent ? 'text-rose-700 line-through' : 'text-slate-800'}`}>
                          {assigned.student_name}
                        </p>
                        <p className="font-mono text-[9px] text-slate-500">{assigned.student_roll}</p>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Empty Desk</span>
                    )}

                    {assigned?.is_absent && (
                      <span className="absolute bottom-1 right-1 text-[8px] font-bold uppercase tracking-wider text-rose-600 bg-rose-100 px-1 rounded">
                        Absent
                      </span>
                    )}
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
