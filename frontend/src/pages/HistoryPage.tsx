import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Calendar,
  FileCheck2,
  Armchair,
  Download,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

interface HistoryItem {
  id: string;
  name: string;
  kind: 'classroom' | 'examination';
  created_at: string;
  room_or_halls: string;
  students_count: number;
  status: 'published' | 'draft';
  solver_time_ms: number;
}

const INITIAL_HISTORY: HistoryItem[] = [
  { id: 'PLAN-EX-9921', name: 'FET Mid-Term Seating Halls A-101 & A-102', kind: 'examination', created_at: '2026-11-03 14:30', room_or_halls: 'A-101, A-102 (2 Halls)', students_count: 52, status: 'published', solver_time_ms: 18 },
  { id: 'PLAN-CR-4402', name: 'AIML Sem 3 Sec A - DSA Lab Seating', kind: 'classroom', created_at: '2026-11-03 08:30', room_or_halls: 'AI-LAB-1', students_count: 32, status: 'published', solver_time_ms: 4 },
  { id: 'PLAN-CR-4401', name: 'CSE-GEN Sem 5 Sec C - Operating Systems', kind: 'classroom', created_at: '2026-11-02 11:00', room_or_halls: 'LH-201', students_count: 40, status: 'published', solver_time_ms: 5 },
  { id: 'PLAN-EX-9920', name: 'Cycle Test I - B.Tech Core Streams', kind: 'examination', created_at: '2026-10-28 09:15', room_or_halls: 'EXAM-HALL-MAIN', students_count: 110, status: 'published', solver_time_ms: 35 },
  { id: 'PLAN-CR-4399', name: 'AIDE Sem 3 Sec A - Mathematics for AI', kind: 'classroom', created_at: '2026-10-27 10:45', room_or_halls: 'LH-102', students_count: 36, status: 'published', solver_time_ms: 4 },
];

export const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(INITIAL_HISTORY);
  const [filterKind, setFilterKind] = useState<'all' | 'examination' | 'classroom'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getSeatingPlans()
      .then((data) => {
        if (data && data.length > 0) {
          const mapped: HistoryItem[] = data.map((p: any) => ({
            id: p.id,
            name: p.kind === 'examination'
              ? (p.examinations?.name || `Exam Allocation (${p.examinations?.exam_date || 'Session'})`)
              : `Classroom ${p.batches?.programs?.code || 'AIML'} S${p.batches?.semester || 3}${p.batches?.section || 'A'} - ${p.timetable_entries?.subject_label || 'Lecture'}`,
            kind: p.kind,
            created_at: p.created_at ? new Date(p.created_at).toLocaleString() : 'Recently saved',
            room_or_halls: p.rooms?.name || (p.kind === 'examination' ? 'Certified Exam Halls' : 'LH-201'),
            students_count: p.assignments_count || 40,
            status: p.status || 'published',
            solver_time_ms: p.solve_seconds ? Math.round(Number(p.solve_seconds) * 1000) : 18,
          }));
          setHistoryItems(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const filteredHistory = historyItems.filter((item) => {
    if (filterKind !== 'all' && item.kind !== filterKind) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.id.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.room_or_halls.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-black" />
            Seating History
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            View previously generated and published seating plans.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterKind('all')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
              filterKind === 'all'
                ? 'bg-black text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            All Plans
          </button>
          <button
            onClick={() => setFilterKind('examination')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
              filterKind === 'examination'
                ? 'bg-black text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Examination Seating
          </button>
          <button
            onClick={() => setFilterKind('classroom')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
              filterKind === 'classroom'
                ? 'bg-black text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Classroom Seating
          </button>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search plans, venues, or exams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-zinc-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-black"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
              <th className="p-3 pl-4">Plan ID</th>
              <th className="p-3">Title</th>
              <th className="p-3">Type</th>
              <th className="p-3">Venues</th>
              <th className="p-3">Students</th>
              <th className="p-3">Solver Time</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {filteredHistory.map((h) => (
              <tr key={h.id} className="hover:bg-zinc-50/60">
                <td className="p-3 pl-4 font-mono font-bold text-zinc-900">{h.id}</td>
                <td className="p-3 font-semibold text-zinc-800">{h.name}</td>
                <td className="p-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      h.kind === 'examination'
                        ? 'bg-zinc-200 text-zinc-800'
                        : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                    }`}
                  >
                    {h.kind === 'examination' ? (
                      <FileCheck2 className="w-3 h-3" />
                    ) : (
                      <Armchair className="w-3 h-3" />
                    )}
                    {h.kind}
                  </span>
                </td>
                <td className="p-3 font-medium text-zinc-600">{h.room_or_halls}</td>
                <td className="p-3 font-mono font-bold text-zinc-800">{h.students_count} seats</td>
                <td className="p-3 font-mono text-[11px] text-zinc-500">{h.solver_time_ms} ms</td>
                <td className="p-3 text-zinc-400 text-[11px]">{h.created_at}</td>
                <td className="p-3 text-right pr-4">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={api.getPlanPdfUrl(h.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-zinc-500 hover:text-black cursor-pointer"
                      title="Download PDF Chart"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <Link
                      to={h.kind === 'examination' ? `/exam-seating?plan_id=${h.id}` : `/classroom-seating?plan_id=${h.id}`}
                      className="p-1 text-zinc-500 hover:text-black cursor-pointer"
                      title="Reopen Plan"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
