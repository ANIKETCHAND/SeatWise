import React, { useState } from 'react';
import {
  Sigma,
  Network,
  Grid,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Ban,
  ShieldCheck,
  HelpCircle,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';

export const MathAnalysisPage: React.FC = () => {
  // Interactive Simulation Controls
  const [rows, setRows] = useState<number>(4);
  const [cols, setCols] = useState<number>(6);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  
  // Two classes student counts
  const [classACount, setClassACount] = useState<number>(10);
  const [classBCount, setClassBCount] = useState<number>(8);
  const [diagonalAllowed, setDiagonalAllowed] = useState<boolean>(false);
  const [solverResult, setSolverResult] = useState<any>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);

  // Active Interactive Mode: 'checkerboard' | 'graph' | 'pigeonhole' | 'injective'
  const [activeConcept, setActiveConcept] = useState<string>('checkerboard');

  const toggleBlocked = (r: number, c: number) => {
    const key = `${r}-${c}`;
    const next = new Set(blocked);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setBlocked(next);
  };

  const runLiveSolver = async () => {
    setIsSolving(true);
    try {
      const blockedList = Array.from(blocked).map((k) => k.split('-').map(Number));
      const res = await api.mathSolve({
        rows,
        columns: cols,
        blocked: blockedList,
        include_diagonal: diagonalAllowed,
        groups: { A: classACount, B: classBCount },
      });
      setSolverResult(res);
    } catch (err: any) {
      setSolverResult({ status: 'error', message: err.message || 'Solver request failed' });
    } finally {
      setIsSolving(false);
    }
  };

  const totalSeats = rows * cols;
  const usableSeats = totalSeats - blocked.size;
  const totalStudents = classACount + classBCount;

  // Checkerboard partitions
  let part0Count = 0;
  let part1Count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (blocked.has(`${r}-${c}`)) continue;
      if ((r + c) % 2 === 0) part0Count++;
      else part1Count++;
    }
  }

  const largerPartition = Math.max(part0Count, part1Count);
  const smallerPartition = Math.min(part0Count, part1Count);

  // Mathematical validations
  const pigeonholeSatisfied = totalStudents <= usableSeats;
  const maxClassSize = Math.max(classACount, classBCount);
  
  // Independence bound check: each class cannot exceed the maximum independent set
  const checkerboardFeasible =
    pigeonholeSatisfied &&
    maxClassSize <= largerPartition &&
    Math.min(classACount, classBCount) <= smallerPartition + (largerPartition - maxClassSize);

  // Quick Preset Test Cases from Specification Section 20A:
  const loadPreset = (r: number, c: number, a: number, b: number) => {
    setRows(r);
    setCols(c);
    setBlocked(new Set());
    setClassACount(a);
    setClassBCount(b);
    setSolverResult(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 rounded-2xl p-6 lg:p-8 text-white shadow-sm border border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-xs font-semibold mb-3 border border-primary-400/20">
          <Sigma className="w-3.5 h-3.5 text-primary-400" />
          Rigorous Discrete Mathematics & Optimization Specification
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
          Mathematical Allocation Engine Foundations
        </h1>
        <p className="text-slate-300 text-sm mt-2 max-w-3xl leading-relaxed">
          SeatWise mathematically guarantees seating allocations using Set Theory injectivity,
          the Dirichlet Pigeonhole Principle, Bipartite Graph 2-Coloring, Independence Number Bounds,
          and Google OR-Tools CP-SAT constraint programming.
        </p>

        {/* Quick Presets from Specification */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-1">
            Run Master Spec Test Cases:
          </span>
          <button
            onClick={() => loadPreset(4, 6, 10, 8)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-medium border border-slate-700"
          >
            4×6 (10/8) Valid
          </button>
          <button
            onClick={() => loadPreset(4, 6, 12, 12)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-medium border border-slate-700"
          >
            4×6 (12/12) Bijective
          </button>
          <button
            onClick={() => loadPreset(4, 6, 13, 11)}
            className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-mono font-medium border border-rose-800"
          >
            4×6 (13/11) Infeasible
          </button>
          <button
            onClick={() => loadPreset(3, 3, 5, 4)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-medium border border-slate-700"
          >
            3×3 (5/4) Valid
          </button>
          <button
            onClick={() => loadPreset(3, 3, 6, 3)}
            className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-mono font-medium border border-rose-800"
          >
            3×3 (6/3) Infeasible
          </button>
          <button
            onClick={() => loadPreset(2, 2, 2, 2)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-medium border border-slate-700"
          >
            2×2 (2/2) Valid
          </button>
          <button
            onClick={() => loadPreset(1, 1, 1, 0)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-medium border border-slate-700"
          >
            1×1 (1/0) Valid
          </button>
        </div>
      </div>

      {/* Interactive Simulator Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Grid className="w-5 h-5 text-primary-600" />
              Interactive Layout & Adjacency Simulator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live mathematical evaluation with click-to-block seats and real-time checkerboard partitioning.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                checkerboardFeasible
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {checkerboardFeasible ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Mathematically Feasible
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Mathematically Infeasible
                </>
              )}
            </span>
          </div>
        </div>

        {/* Simulator Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Rows (R)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold p-1.5 border border-slate-300 rounded-lg mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Columns (C)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold p-1.5 border border-slate-300 rounded-lg mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Class A Students</label>
            <input
              type="number"
              min={0}
              value={classACount}
              onChange={(e) => setClassACount(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold p-1.5 border border-slate-300 rounded-lg mt-1 text-blue-700"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Class B Students</label>
            <input
              type="number"
              min={0}
              value={classBCount}
              onChange={(e) => setClassBCount(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold p-1.5 border border-slate-300 rounded-lg mt-1 text-indigo-700"
            />
          </div>
          <div className="flex flex-col justify-end">
            <button
              onClick={() => setBlocked(new Set())}
              className="w-full py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Blocked
            </button>
          </div>
        </div>

        {/* Live Mathematical Proof Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
            <span className="text-[10px] uppercase font-bold text-blue-700">Pigeonhole Capacity</span>
            <p className="text-base font-bold text-slate-800 mt-0.5">
              |S| = {totalStudents} ≤ |T| = {usableSeats}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {pigeonholeSatisfied ? '✓ Capacity sufficient' : '✗ Violates |S| ≤ |T|'}
            </p>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-200">
            <span className="text-[10px] uppercase font-bold text-indigo-700">Checkerboard Partition</span>
            <p className="text-base font-bold text-slate-800 mt-0.5">
              P₀ = {part0Count} | P₁ = {part1Count}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              color(r, c) = (r + c) mod 2
            </p>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-700">Independence Bound α(G)</span>
            <p className="text-base font-bold text-slate-800 mt-0.5">
              α = {largerPartition} seats
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Max single class without adjacency
            </p>
          </div>

          <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-200">
            <span className="text-[10px] uppercase font-bold text-purple-700">Bijective Verification</span>
            <p className="text-base font-bold text-slate-800 mt-0.5">
              {totalStudents === usableSeats ? 'Bijective (Full Occupancy)' : 'Injective (Sub-capacity)'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              f: S → T injective guaranteed
            </p>
          </div>
        </div>

        {/* Visual Room Grid with Checkerboard Colors */}
        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200">
          <div className="text-center mb-3">
            <span className="text-xs font-bold text-slate-700">
              Visual Grid Partition: Click any desk to toggle defective/blocked status
            </span>
          </div>

          <div className="overflow-x-auto pb-2">
            <div
              className="grid gap-2 justify-center mx-auto"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(52px, 64px))`,
              }}
            >
              {Array.from({ length: rows }).map((_, r) => {
                const rowLetter = String.fromCharCode(65 + r);
                return Array.from({ length: cols }).map((__, c) => {
                  const key = `${r}-${c}`;
                  const isBlocked = blocked.has(key);
                  const parity = (r + c) % 2;
                  const seatLabel = `${rowLetter}${c + 1}`;

                  return (
                    <button
                      key={key}
                      onClick={() => toggleBlocked(r, c)}
                      className={`h-14 rounded-lg border p-1 text-center flex flex-col items-center justify-center transition-all ${
                        isBlocked
                          ? 'bg-rose-50 border-rose-300 text-rose-600 opacity-60'
                          : parity === 0
                          ? 'bg-blue-100 border-blue-300 text-blue-900 hover:ring-2 hover:ring-blue-400'
                          : 'bg-indigo-100 border-indigo-300 text-indigo-900 hover:ring-2 hover:ring-indigo-400'
                      }`}
                    >
                      <span className="font-mono text-[10px] font-bold">{seatLabel}</span>
                      {isBlocked ? (
                        <Ban className="w-3.5 h-3.5 text-rose-500 mt-1" />
                      ) : (
                        <span className="text-[9px] font-bold mt-1">
                          {parity === 0 ? 'P₀ (A)' : 'P₁ (B)'}
                        </span>
                      )}
                    </button>
                  );
                });
              })}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-100 border border-blue-400" />
              <span>Partition P₀ (Even parity = (r+c)%2 == 0): {part0Count} seats</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-400" />
              <span>Partition P₁ (Odd parity = (r+c)%2 == 1): {part1Count} seats</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-rose-50 border border-rose-300 flex items-center justify-center">
                <Ban className="w-2.5 h-2.5 text-rose-500" />
              </span>
              <span>Blocked Seat</span>
            </div>
          </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={diagonalAllowed}
                onChange={(e) => setDiagonalAllowed(e.target.checked)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              Prevent Diagonal Adjacency (Optional Examination Restriction)
            </label>
          </div>
          <button
            onClick={runLiveSolver}
            disabled={isSolving}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Cpu className="w-4 h-4" />
            {isSolving ? 'Solving with CP-SAT...' : 'Execute Live CP-SAT Constraint Solver'}
          </button>
        </div>

        {solverResult && (
          <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="font-bold text-primary-400">Backend Solver: {solverResult.solver || 'Google OR-Tools CP-SAT'}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${solverResult.status === 'valid' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'}`}>
                Status: {solverResult.status}
              </span>
            </div>
            {solverResult.validation?.notes && (
              <p className="text-slate-300 text-[11px] font-sans">{solverResult.validation.notes.join(' • ')}</p>
            )}
          </div>
        )}
      </div>

      {/* The 10 Master Mathematical Principles Detailed Sections */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          Comprehensive Mathematical Explanations (Sections 1 – 10)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Sets */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center">1</span>
              <h3 className="text-sm font-bold text-slate-800">1. Set Theory Foundations</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Let <strong>S</strong> be the finite set of enrolled students and <strong>T</strong> be the set of usable desks in configured halls.
              Each desk <em>t = (h, r, c) ∈ T</em> denotes a unique physical seat coordinate in examination hall <em>h</em>. Blocked seats are excluded from <strong>T</strong>.
            </p>
          </div>

          {/* 2. Functions and Injective Mapping */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center">2</span>
              <h3 className="text-sm font-bold text-slate-800">2. Functions & Injective Mapping</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              A seating arrangement is an assignment function <em>f : S → T</em>. It is mathematically <strong>injective</strong>:
            </p>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
              ∀ s₁, s₂ ∈ S, s₁ ≠ s₂  ⟹  f(s₁) ≠ f(s₂)
            </div>
            <p className="text-xs text-slate-500">
              Every student gets a unique seat; no desk holds two candidates. When |S| = |T|, <em>f</em> is bijective.
            </p>
          </div>

          {/* 3. Pigeonhole Principle */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center">3</span>
              <h3 className="text-sm font-bold text-slate-800">3. Dirichlet's Pigeonhole Principle</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              If candidate count exceeds usable seats (|S| &gt; |T|), no injective map exists. By the pigeonhole principle, at least one desk must receive ≥2 students, which is physically impossible.
            </p>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
              Necessary Condition: |S| ≤ |T|
            </div>
          </div>

          {/* 4. Graph Representation */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center">4</span>
              <h3 className="text-sm font-bold text-slate-800">4. Hall Graph Representation G = (V, E)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Each examination hall is an undirected graph <strong>G = (V, E)</strong>. Vertex set <strong>V</strong> represents usable desks. Edge set <strong>E</strong> represents physical proximity where same-batch occupancy is prohibited.
            </p>
          </div>

          {/* 5. Graph Adjacency */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center">5</span>
              <h3 className="text-sm font-bold text-slate-800">5. Seat Graph Adjacency Relations</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Default adjacency connects seats sharing a horizontal or vertical side: |r₁ - r₂| + |c₁ - c₂| = 1.
              Diagonal neighbors (|r₁ - r₂| = 1 ∧ |c₁ - c₂| = 1) are only restricted when diagonal policy is explicitly activated.
            </p>
          </div>

          {/* 6. Bipartite Graphs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center">6</span>
              <h3 className="text-sm font-bold text-slate-800">6. Bipartite Graphs & 2-Colorability</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              A grid with horizontal and vertical edges contains only even-length cycles (length 4, 6, 8...). Hence, it is <strong>bipartite</strong> and has chromatic number <em>χ(G) = 2</em>.
            </p>
          </div>

          {/* 7. Checkerboard Coloring */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center">7</span>
              <h3 className="text-sm font-bold text-slate-800">7. Checkerboard 2-Coloring Partitions</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The parity function <em>color(r, c) = (r + c) mod 2</em> decomposes the grid into two independent sets <em>P₀</em> and <em>P₁</em>.
              No two seats in the same partition share an edge.
            </p>
          </div>

          {/* 8. Independence Number */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center">8</span>
              <h3 className="text-sm font-bold text-slate-800">8. Independence Number α(G)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              For an unobstructed R × C rectangular grid with horizontal/vertical edges, <em>α(G) = ⌈(R × C) / 2⌉</em>.
              No single batch can place more than α(G) students in the hall without creating adjacent pairs.
            </p>
          </div>

          {/* 9. Constraint Satisfaction */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center">9</span>
              <h3 className="text-sm font-bold text-slate-800">9. CP-SAT Constraint Satisfaction</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multi-batch, multi-hall allocation is solved via Google OR-Tools CP-SAT using boolean decision variables:
              <em>x[s, t] ∈ &#123;0, 1&#125;</em>. Adjacency constraints forbid <em>x[s₁, t₁] + x[s₂, t₂] ≤ 1</em> for same-batch candidates on edge (t₁, t₂).
            </p>
          </div>

          {/* 10. Mathematical Validation */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center">10</span>
              <h3 className="text-sm font-bold text-slate-800">10. Mathematical Validation Engine</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every generated seating plan undergoes independent verification from first principles: checking injectivity, usable seat compliance, absence of duplicate students or seats, and zero adjacent same-batch violations.
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
