import React from 'react';
import { CheckCircle2, ShieldAlert, Lock, DoorClosed, Users, Check } from 'lucide-react';

export const LandingProductPreview: React.FC = () => {
  // Illustrative 4x6 preview grid with two distinct batches alternating
  const sampleDesks = [
    { row: 1, col: 1, label: 'R1-C1', batch: 'AIML-S3A', student: 'Aarav Sharma', roll: '23JU101', color: 'bg-zinc-900 border-zinc-900 text-white' },
    { row: 1, col: 2, label: 'R1-C2', batch: 'CSE-GEN-S3B', student: 'Diya Patel', roll: '23JU201', color: 'bg-zinc-100 border-zinc-300 text-zinc-900' },
    { row: 1, col: 3, label: 'R1-C3', batch: 'AIML-S3A', student: 'Rohan Verma', roll: '23JU102', color: 'bg-zinc-900 border-zinc-900 text-white' },
    { row: 1, col: 4, label: 'R1-C4', batch: 'CSE-GEN-S3B', student: 'Ishita Rao', roll: '23JU202', color: 'bg-zinc-100 border-zinc-300 text-zinc-900' },
    { row: 1, col: 5, label: 'R1-C5', batch: 'AIML-S3A', student: 'Kunal Sen', roll: '23JU103', color: 'bg-zinc-900 border-zinc-900 text-white' },
    { row: 1, col: 6, label: 'R1-C6', batch: 'CSE-GEN-S3B', student: 'Ananya Roy', roll: '23JU203', color: 'bg-zinc-100 border-zinc-300 text-zinc-900' },

    { row: 2, col: 1, label: 'R2-C1', batch: 'CSE-GEN-S3B', student: 'Aditya Nair', roll: '23JU204', color: 'bg-zinc-100 border-zinc-300 text-zinc-900' },
    { row: 2, col: 2, label: 'R2-C2', batch: 'AIML-S3A', student: 'Pooja Hegde', roll: '23JU104', color: 'bg-zinc-900 border-zinc-900 text-white' },
    { row: 2, col: 3, label: 'R2-C3', batch: 'CSE-GEN-S3B', student: 'Siddharth M', roll: '23JU205', color: 'bg-zinc-100 border-zinc-300 text-zinc-900' },
    { row: 2, col: 4, label: 'R2-C4', batch: 'AIML-S3A', student: 'Neha Gupta', roll: '23JU105', color: 'bg-zinc-900 border-zinc-900 text-white' },
    { row: 2, col: 5, label: 'R2-C5', batch: 'CSE-GEN-S3B', student: 'Gaurav Das', roll: '23JU206', color: 'bg-zinc-100 border-zinc-300 text-zinc-900' },
    { row: 2, col: 6, label: 'R2-C6', batch: 'AIML-S3A', student: 'Bhavna K', roll: '23JU106', color: 'bg-zinc-900 border-zinc-900 text-white' },

    { row: 3, col: 1, label: 'R3-C1', batch: 'AIML-S3A', student: 'Varun Joshi', roll: '23JU107', color: 'bg-zinc-900 border-zinc-900 text-white' },
    { row: 3, col: 2, label: 'R3-C2', batch: 'CSE-GEN-S3B', student: 'Meera Iyer', roll: '23JU207', color: 'bg-zinc-100 border-zinc-300 text-zinc-900' },
    { row: 3, col: 3, label: 'R3-C3', isBlocked: true, label2: 'BLOCKED' },
    { row: 3, col: 4, label: 'R3-C4', batch: 'AIML-S3A', student: 'Harsh Vardhan', roll: '23JU108', color: 'bg-zinc-900 border-zinc-900 text-white' },
    { row: 3, col: 5, label: 'R3-C5', batch: 'CSE-GEN-S3B', student: 'Tanvi Shinde', roll: '23JU208', color: 'bg-zinc-100 border-zinc-300 text-zinc-900' },
    { row: 3, col: 6, label: 'R3-C6', batch: 'AIML-S3A', student: 'Yash Mehta', roll: '23JU109', color: 'bg-zinc-900 border-zinc-900 text-white' },
  ];

  return (
    <section id="preview" className="py-24 bg-zinc-50 border-t border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold text-zinc-900 uppercase tracking-widest font-mono">
            Interactive Seating Engine
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
            See Your Seating Plan Come Together
          </h2>
          <p className="text-zinc-600 text-sm sm:text-base leading-relaxed">
            Illustrative preview of the SeatWise seating planner with real-time checkerboard
            non-adjacency verification, locked seat handling, and multi-batch distribution.
          </p>
        </div>

        {/* Product Preview Card */}
        <div className="mt-14 max-w-5xl mx-auto bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-zinc-900/5">
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-950">
                  Midterm Examination — Session Nov 2026
                </span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-300 text-zinc-900 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Check className="w-3 h-3 text-zinc-900" /> Mathematically Valid
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Venue: Lecture Hall A-101 (FET Campus Block A) • 2 Batches Mixed • Zero Adjacency Violations
              </p>
            </div>

            {/* Metrics pills */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total</span>
                <span className="text-xs font-mono font-bold text-zinc-900">18 Students</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Capacity</span>
                <span className="text-xs font-mono font-bold text-zinc-900">24 Seats</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Unallocated</span>
                <span className="text-xs font-mono font-bold text-zinc-900">0</span>
              </div>
            </div>
          </div>

          {/* Seating Grid */}
          <div className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {sampleDesks.map((desk, idx) => {
                if (desk.isBlocked) {
                  return (
                    <div
                      key={idx}
                      className="h-20 rounded-xl border border-dashed border-zinc-400 bg-zinc-100 p-2.5 flex flex-col justify-between"
                    >
                      <span className="text-[9px] font-mono font-bold text-zinc-500">
                        {desk.label}
                      </span>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-zinc-600 font-mono tracking-wider">
                          BLOCKED
                        </span>
                      </div>
                      <span className="text-[8px] text-zinc-400 text-right">No Student</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className={`h-20 rounded-xl border p-2.5 flex flex-col justify-between transition-transform hover:scale-[1.02] shadow-sm ${desk.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-[9px] font-bold ${desk.batch?.startsWith('AIML') ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {desk.label}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${desk.batch?.startsWith('AIML') ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-800'}`}>
                        {desk.batch?.split('-')[0]}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <p className={`text-[11px] font-bold truncate leading-tight ${desk.batch?.startsWith('AIML') ? 'text-white' : 'text-zinc-950'}`}>
                        {desk.student}
                      </p>
                      <p className={`text-[9px] font-mono ${desk.batch?.startsWith('AIML') ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {desk.roll}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Legend */}
          <div className="mt-6 pt-4 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-zinc-900 border border-zinc-900" />
                Batch 1 (AIML-S3A)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-zinc-100 border border-zinc-300" />
                Batch 2 (CSE-GEN-S3B)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-zinc-100 border border-dashed border-zinc-400" />
                Blocked Desk
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              *Interactive preview demo representation
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
