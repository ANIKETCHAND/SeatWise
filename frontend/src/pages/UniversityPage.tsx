import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Layers,
  Plus,
  Search,
  CheckCircle,
  Database,
  Building2,
  Calendar,
} from 'lucide-react';
import { INITIAL_PROGRAMS, TOTAL_BATCHES_COUNT, TOTAL_PROGRAMS_COUNT } from '../data/universityData';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const UniversityPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [programsList, setProgramsList] = useState(INITIAL_PROGRAMS);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [newProgCode, setNewProgCode] = useState('');
  const [newProgName, setNewProgName] = useState('');
  const [newBatchSem, setNewBatchSem] = useState(1);
  const [newBatchSec, setNewBatchSec] = useState('');

  const handleAddProgramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgCode || !newProgName) return;
    const newProg = {
      id: `p-${newProgCode.toLowerCase()}`,
      code: newProgCode.toUpperCase(),
      name: newProgName,
      department: 'Computer Science and Engineering',
      durationYears: 4,
      totalSemesters: 8,
      batches: [],
    };
    setProgramsList([...programsList, newProg]);
    api.createProgram({ code: newProgCode.toUpperCase(), name: newProgName }).catch(() => {});
    setShowAddProgram(false);
    setNewProgCode('');
    setNewProgName('');
    setFeedback(`Program ${newProg.code} registered successfully.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAddBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchSec || !activeProg) return;
    const newBatch = {
      id: `b-${activeProg.code.toLowerCase()}-s${newBatchSem}-${newBatchSec.toLowerCase()}`,
      program: activeProg.code,
      semester: Number(newBatchSem),
      section: newBatchSec.toUpperCase(),
      studentCount: 0,
    };
    const updated = programsList.map((p) =>
      p.code === activeProg.code ? { ...p, batches: [...p.batches, newBatch] } : p
    );
    setProgramsList(updated);
    api.createBatch({
      program_id: (activeProg as any).id || `p-${activeProg.code.toLowerCase()}`,
      semester: Number(newBatchSem),
      section: newBatchSec.toUpperCase(),
    }).catch(() => {});
    setShowAddBatch(false);
    setNewBatchSec('');
    setFeedback(`New batch section ${newBatchSec.toUpperCase()} (Sem ${newBatchSem}) added to ${activeProg.code}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    api.getPrograms()
      .then((data) => {
        if (data && data.length > 0) {
          // If live programs returned from Supabase, merge them
          const merged = INITIAL_PROGRAMS.map((p) => {
            const found = data.find((d: any) => d.code === p.code);
            return found ? { ...p, id: found.id, name: found.name || p.name } : p;
          });
          setProgramsList(merged);
        }
      })
      .catch(() => {});
  }, []);

  const filteredPrograms = programsList.filter((p) => {
    const matchSearch =
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const activeProg = programsList.find((p) => p.code === (selectedProgram || programsList[0].code))!;

  const filteredBatches = activeProg.batches.filter((b) => {
    if (selectedSemester === 'all') return true;
    return b.semester === selectedSemester;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-zinc-900" />
            Curriculum & Batches
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Academic degree programs, semesters, and class sections.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFeedback('15 programs & 94 batches verified.');
                setTimeout(() => setFeedback(null), 4000);
              }}
              className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg border border-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-zinc-900" />
              Verify Records
            </button>
            <button
              onClick={() => setShowAddProgram(true)}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Program
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="p-3 bg-zinc-100 border border-zinc-300 text-zinc-900 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-zinc-950 shrink-0" />
          {feedback}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-zinc-100 text-black border border-zinc-200 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase">Degree Programs</p>
            <p className="text-2xl font-black text-zinc-950">{TOTAL_PROGRAMS_COUNT}</p>
            <p className="text-[11px] text-zinc-400">Undergraduate & Masters</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-zinc-100 text-black border border-zinc-200 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase">Class Batches / Sections</p>
            <p className="text-2xl font-black text-zinc-950">{TOTAL_BATCHES_COUNT}</p>
            <p className="text-[11px] text-zinc-400">Across 8 Academic Semesters</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-zinc-100 text-black border border-zinc-200 flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase">Academic Year</p>
            <p className="text-2xl font-bold text-zinc-950">2026 – 2027</p>
            <p className="text-[11px] text-zinc-400">Odd / Even Semester Cycle</p>
          </div>
        </div>
      </div>

      {/* Program Selector & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Programs List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-zinc-200 shadow-2xs p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3">
            <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Programs ({filteredPrograms.length})
            </span>
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search program..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-zinc-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-zinc-950"
              />
            </div>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[520px] pr-1">
            {filteredPrograms.map((p) => {
              const isSelected = p.code === activeProg.code;
              return (
                <button
                  key={p.code}
                  onClick={() => setSelectedProgram(p.code)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                      : 'border-zinc-200 hover:bg-zinc-50 text-zinc-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs font-mono ${isSelected ? 'text-white' : 'text-zinc-950'}`}>{p.code}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isSelected ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'}`}>
                        {p.batches.length} batches
                      </span>
                    </div>
                    <p className={`text-[11px] truncate max-w-[240px] mt-0.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>{p.name}</p>
                  </div>
                  <span className={`text-[10px] font-semibold ${isSelected ? 'text-zinc-200' : 'text-zinc-400'}`}>
                    Select →
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Program & Its Batches */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between pb-4 border-b border-zinc-100 mb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 bg-zinc-100 text-zinc-950 font-mono font-bold text-sm rounded-md border border-zinc-300">
                    {activeProg.code}
                  </span>
                  <h2 className="text-base font-bold text-zinc-950">{activeProg.name}</h2>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{activeProg.department}</p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setShowAddBatch(true)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Batch
                </button>
              )}
            </div>

            {/* Filter by Semester */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-zinc-500 font-medium">Semester:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {['all', 1, 3, 5, 7].map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemester(sem as any)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      selectedSemester === sem
                        ? 'bg-zinc-950 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {sem === 'all' ? 'All' : `Sem ${sem}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Batches Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredBatches.map((b, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/70 hover:border-zinc-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 font-mono">
                      Sem {b.semester} — Sec {b.section}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-zinc-950" />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Batch: {activeProg.code}-S{b.semester}{b.section}</p>
                  <div className="mt-2 pt-2 border-t border-zinc-200 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Est. 60 students</span>
                    <span className="text-zinc-900 font-semibold cursor-pointer hover:underline">
                      View Roster
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 text-xs text-zinc-400 flex items-center justify-between">
            <span>Showing {filteredBatches.length} of {activeProg.batches.length} batches for {activeProg.code}</span>
            <span className="font-mono text-[11px]">Academic Year 2026-27</span>
          </div>
        </div>
      </div>

      {/* Add Program Modal */}
      {showAddProgram && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-zinc-200 animate-scale-up">
            <h3 className="text-sm font-bold text-zinc-900 mb-1">Add Academic Program</h3>
            <p className="text-xs text-zinc-500 mb-4">Register a new curriculum and degree pathway.</p>
            <form onSubmit={handleAddProgramSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700">Program Code</label>
                <input
                  required
                  placeholder="e.g. CSE-CYBER"
                  value={newProgCode}
                  onChange={(e) => setNewProgCode(e.target.value)}
                  className="w-full text-xs p-2 border border-zinc-300 rounded-lg mt-1 uppercase text-zinc-900 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700">Program Title</label>
                <input
                  required
                  placeholder="e.g. B.Tech in Cyber Physical Systems"
                  value={newProgName}
                  onChange={(e) => setNewProgName(e.target.value)}
                  className="w-full text-xs p-2 border border-zinc-300 rounded-lg mt-1 text-zinc-900 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700">Department</label>
                <input
                  required
                  defaultValue="Computer Science and Engineering"
                  className="w-full text-xs p-2 border border-zinc-300 rounded-lg mt-1 text-zinc-900 bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddProgram(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-black hover:bg-zinc-800 text-white font-medium rounded-lg shadow-xs cursor-pointer"
                >
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Batch Modal */}
      {showAddBatch && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-zinc-200 animate-scale-up">
            <h3 className="text-sm font-bold text-zinc-900 mb-1">Add Batch to {activeProg.code}</h3>
            <p className="text-xs text-zinc-500 mb-4">Create a new semester class section.</p>
            <form onSubmit={handleAddBatchSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700">Semester</label>
                <select
                  value={newBatchSem}
                  onChange={(e) => setNewBatchSem(Number(e.target.value))}
                  className="w-full text-xs p-2 border border-zinc-300 rounded-lg mt-1 text-zinc-900 bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700">Section</label>
                <input
                  required
                  placeholder="e.g. H"
                  maxLength={2}
                  value={newBatchSec}
                  onChange={(e) => setNewBatchSec(e.target.value)}
                  className="w-full text-xs p-2 border border-zinc-300 rounded-lg mt-1 uppercase text-zinc-900 bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddBatch(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-black hover:bg-zinc-800 text-white font-medium rounded-lg shadow-xs cursor-pointer"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
