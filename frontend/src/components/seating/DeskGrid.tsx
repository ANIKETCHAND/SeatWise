import React from 'react';
import { Armchair, Ban, Lock, UserCheck, UserX } from 'lucide-react';

export interface DeskCellData {
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

interface DeskGridProps {
  rows: number;
  cols: number;
  cells: DeskCellData[];
  selectedSeatLabel?: string | null;
  onSelectSeat?: (cell: DeskCellData) => void;
  onToggleLock?: (cell: DeskCellData) => void;
  onToggleAttendance?: (cell: DeskCellData) => void;
  readOnly?: boolean;
}

export const DeskGrid: React.FC<DeskGridProps> = ({
  rows,
  cols,
  cells,
  selectedSeatLabel,
  onSelectSeat,
  onToggleLock,
  onToggleAttendance,
  readOnly = false,
}) => {
  const getCell = (r: number, c: number): DeskCellData => {
    const found = cells.find((cell) => cell.row === r && cell.col === c);
    return (
      found || {
        seat_label: `${String.fromCharCode(65 + r)}${c + 1}`,
        row: r,
        col: c,
      }
    );
  };

  const getBatchColor = (batch?: string): string => {
    if (!batch) return 'bg-white text-zinc-700 border-zinc-200';
    const hash = batch.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-zinc-900 text-white border-zinc-950',
      'bg-zinc-100 text-zinc-900 border-zinc-300',
      'bg-zinc-800 text-zinc-100 border-zinc-900',
      'bg-zinc-200 text-zinc-900 border-zinc-400',
      'bg-zinc-700 text-white border-zinc-800',
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="overflow-x-auto p-4 bg-zinc-50 rounded-xl border border-zinc-200">
      <div className="inline-block min-w-full">
        {/* Front of Hall / Podium Indicator */}
        <div className="w-full text-center mb-6">
          <div className="inline-block bg-zinc-200 text-zinc-700 px-8 py-1 rounded-full text-xs font-semibold uppercase tracking-widest shadow-2xs">
            Blackboard / Teacher Podium
          </div>
        </div>

        {/* Matrix Grid */}
        <div
          className="grid gap-2.5 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(110px, 1fr))`,
          }}
        >
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const cell = getCell(r, c);
              const isSelected = selectedSeatLabel === cell.seat_label;
              const isOccupied = Boolean(cell.roll_number || cell.student_name);
              const isBlocked = Boolean(cell.is_blocked);
              const isAbsent = cell.attendance === 'absent';

              let cellStyle = 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400';
              if (isBlocked) {
                cellStyle = 'bg-rose-50/60 border-rose-200 text-rose-400 cursor-not-allowed';
              } else if (isOccupied) {
                cellStyle = getBatchColor(cell.batch);
              }
              if (cell.is_locked) {
                cellStyle += ' ring-2 ring-amber-400';
              }
              if (isSelected) {
                cellStyle += ' ring-2 ring-zinc-900 ring-offset-2';
              }

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => !isBlocked && !readOnly && onSelectSeat && onSelectSeat(cell)}
                  className={`relative p-2.5 rounded-lg border text-left transition-all shadow-2xs flex flex-col justify-between min-h-[92px] ${cellStyle} ${
                    !readOnly && !isBlocked ? 'cursor-pointer hover:shadow-xs' : ''
                  }`}
                >
                  {/* Seat Header */}
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="font-mono text-zinc-500">{cell.seat_label}</span>
                    <div className="flex items-center gap-1">
                      {cell.is_locked && <Lock className="w-3 h-3 text-amber-600" />}
                      {isBlocked && <Ban className="w-3.5 h-3.5 text-rose-500" />}
                    </div>
                  </div>

                  {/* Seat Occupant Content */}
                  {isOccupied && !isBlocked ? (
                    <div className="my-1 min-w-0">
                      <p
                        className={`text-xs font-bold truncate ${
                          isAbsent ? 'line-through text-rose-600' : 'text-zinc-900'
                        }`}
                      >
                        {cell.roll_number || 'Enrolled'}
                      </p>
                      <p className="text-[10px] text-zinc-600 truncate mt-0.5">
                        {cell.student_name || 'Student'}
                      </p>
                      {cell.batch && (
                        <span className="inline-block mt-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/80 border border-zinc-200">
                          {cell.batch}
                        </span>
                      )}
                    </div>
                  ) : !isBlocked ? (
                    <div className="my-auto text-center py-2 text-zinc-300">
                      <Armchair className="w-5 h-5 mx-auto" />
                    </div>
                  ) : null}

                  {/* Action Bar inside desk */}
                  {isOccupied && !readOnly && (
                    <div className="mt-1 pt-1 border-t border-zinc-200/50 flex items-center justify-between text-[10px]">
                      {onToggleAttendance && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleAttendance(cell);
                          }}
                          className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] ${
                            isAbsent
                              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                        >
                          {isAbsent ? <UserX className="w-2.5 h-2.5" /> : <UserCheck className="w-2.5 h-2.5" />}
                          {isAbsent ? 'Absent' : 'Present'}
                        </button>
                      )}
                      {onToggleLock && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLock(cell);
                          }}
                          className="text-zinc-400 hover:text-zinc-700 p-0.5"
                          title={cell.is_locked ? 'Unlock Seat' : 'Lock Seat'}
                        >
                          <Lock className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DeskGrid;
