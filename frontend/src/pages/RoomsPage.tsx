import React, { useState, useEffect } from 'react';
import {
  DoorClosed,
  Plus,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Columns,
  Rows,
  Save,
  Sliders,
  Layers,
} from 'lucide-react';
import { Room } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';

const INITIAL_ROOMS: Room[] = [
  { id: 'rm-101', room_number: 'LH-101', name: 'Lecture Hall 101', building: 'Academic Block A', floor: 1, room_type: 'exam_hall', rows: 6, columns: 6, capacity: 36, usable_capacity: 34, blocked_seats_count: 2, is_exam_approved: true, is_active: true },
  { id: 'rm-102', room_number: 'LH-102', name: 'Lecture Hall 102', building: 'Academic Block A', floor: 1, room_type: 'exam_hall', rows: 6, columns: 8, capacity: 48, usable_capacity: 45, blocked_seats_count: 3, is_exam_approved: true, is_active: true },
  { id: 'rm-201', room_number: 'LH-201', name: 'Classroom 201', building: 'Academic Block B', floor: 2, room_type: 'classroom', rows: 5, columns: 8, capacity: 40, usable_capacity: 40, blocked_seats_count: 0, is_exam_approved: false, is_active: true },
  { id: 'rm-202', room_number: 'LH-202', name: 'Classroom 202', building: 'Academic Block B', floor: 2, room_type: 'classroom', rows: 5, columns: 8, capacity: 40, usable_capacity: 38, blocked_seats_count: 2, is_exam_approved: false, is_active: true },
  { id: 'rm-301', room_number: 'AI-LAB-1', name: 'Artificial Intelligence Lab', building: 'Technology Tower', floor: 3, room_type: 'lab', rows: 4, columns: 8, capacity: 32, usable_capacity: 30, blocked_seats_count: 2, is_exam_approved: false, is_active: true },
  { id: 'rm-401', room_number: 'EXAM-HALL-MAIN', name: 'Central Examination Auditorium', building: 'Auditorium Complex', floor: 1, room_type: 'exam_hall', rows: 10, columns: 12, capacity: 120, usable_capacity: 115, blocked_seats_count: 5, is_exam_approved: true, is_active: true },
];

export const RoomsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { showNotification } = useNotification();
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [activeTab, setActiveTab] = useState<'all' | 'exam' | 'classroom' | 'lab'>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room>(INITIAL_ROOMS[0]);
  
  // Interactive Layout Editor State
  const [editorRows, setEditorRows] = useState(selectedRoom.rows);
  const [editorCols, setEditorCols] = useState(selectedRoom.columns);
  const [blockedSeats, setBlockedSeats] = useState<Set<string>>(new Set(['0-2', '2-4']));
  const [editorFeedback, setEditorFeedback] = useState<string | null>(null);

  useEffect(() => {
    api.getRooms()
      .then((data) => {
        if (data && data.length > 0) {
          const mapped: Room[] = data.map((r: any) => ({
            id: r.id,
            room_number: r.code || r.name,
            name: r.name,
            building: r.building || 'Academic Block',
            floor: r.floor || 1,
            room_type: r.room_type || 'classroom',
            rows: r.rows || 5,
            columns: r.columns || 8,
            capacity: r.total_seats || (r.rows || 5) * (r.columns || 8),
            usable_capacity: r.usable_seats || (r.total_seats || 40) - (r.blocked_seats || 0),
            blocked_seats_count: r.blocked_seats || 0,
            is_exam_approved: !!r.is_exam_approved,
            is_active: r.status !== 'inactive',
          }));
          setRooms(mapped);
          setSelectedRoom(mapped[0]);
          setEditorRows(mapped[0].rows);
          setEditorCols(mapped[0].columns);
        }
      })
      .catch(() => {});
  }, []);

  const selectRoomForEditing = (room: Room) => {
    setSelectedRoom(room);
    setEditorRows(room.rows);
    setEditorCols(room.columns);
    const initialBlocked = new Set<string>();
    // Pre-populate some blocked seats matching count
    for (let i = 0; i < room.blocked_seats_count; i++) {
      initialBlocked.add(`${i % room.rows}-${(i * 2 + 1) % room.columns}`);
    }
    setBlockedSeats(initialBlocked);
    setEditorFeedback(null);
  };

  const toggleSeatBlocked = (r: number, c: number) => {
    const key = `${r}-${c}`;
    const next = new Set(blockedSeats);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setBlockedSeats(next);
  };

  const saveLayout = () => {
    const total = editorRows * editorCols;
    const blockedCount = blockedSeats.size;
    const usable = total - blockedCount;

    const updatedRooms = rooms.map((r) => {
      if (r.id === selectedRoom.id) {
        return {
          ...r,
          rows: editorRows,
          columns: editorCols,
          capacity: total,
          usable_capacity: usable,
          blocked_seats_count: blockedCount,
        };
      }
      return r;
    });

    setRooms(updatedRooms);
    setSelectedRoom({
      ...selectedRoom,
      rows: editorRows,
      columns: editorCols,
      capacity: total,
      usable_capacity: usable,
      blocked_seats_count: blockedCount,
    });

    api.updateRoomLayout(selectedRoom.id, {
      rows: editorRows,
      columns: editorCols,
      blocked: Array.from(blockedSeats),
    })
      .then(() => {
        setEditorFeedback(`Room layout for ${selectedRoom.room_number} saved. Usable seats: ${usable}/${total}.`);
        showNotification('success', `Room layout for ${selectedRoom.room_number} saved.`);
      })
      .catch((err: any) => {
        setEditorFeedback(`Room layout for ${selectedRoom.room_number} updated locally.`);
        showNotification('warning', `Layout updated locally (${err.message || 'Database sync failed'})`);
      });

    setTimeout(() => setEditorFeedback(null), 4000);
  };

  const filteredRooms = rooms.filter((r) => {
    if (activeTab === 'exam') return r.is_exam_approved;
    if (activeTab === 'classroom') return r.room_type === 'classroom';
    if (activeTab === 'lab') return r.room_type === 'lab';
    return true;
  });

  const totalUsableSeats = editorRows * editorCols - blockedSeats.size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <DoorClosed className="w-5 h-5 text-primary-600" />
            Classrooms & Examination Halls Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure room dimensions, manage defective/blocked seats, and certify examination venues.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Exam Approved Halls: <strong>{rooms.filter(r => r.is_exam_approved).length}</strong></span>
          </div>
        )}
      </div>

      {editorFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {editorFeedback}
        </div>
      )}

      {/* Main Split: Room List and Visual Grid Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Rooms Table */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
          <div>
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-3">
              {[
                { id: 'all', label: 'All Venues' },
                { id: 'exam', label: 'Exam Approved' },
                { id: 'classroom', label: 'Classrooms' },
                { id: 'lab', label: 'Labs' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[580px] pr-1">
              {filteredRooms.map((r) => {
                const isSelected = r.id === selectedRoom.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => selectRoomForEditing(r)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{r.room_number}</span>
                        <span className="text-[10px] text-slate-500">({r.building}, Fl {r.floor})</span>
                      </div>
                      {r.is_exam_approved && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          <ShieldCheck className="w-3 h-3" />
                          Exam Certified
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-xs">
                      <span className="text-slate-500 text-[11px] font-medium">{r.name}</span>
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="text-slate-700 font-bold">{r.usable_capacity} seats</span>
                        {r.blocked_seats_count > 0 && (
                          <span className="text-rose-600 font-semibold">({r.blocked_seats_count} blocked)</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Click any room to open its interactive visual seating matrix editor.
          </div>
        </div>

        {/* Right: Visual Grid Layout Editor */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                    {selectedRoom.room_number}
                  </span>
                  <h2 className="text-base font-bold text-slate-800">{selectedRoom.name}</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visual Layout Grid Editor • Click any desk to mark defective/blocked.
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={saveLayout}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all self-start sm:self-auto"
                >
                  <Save className="w-4 h-4" />
                  Save Room Layout
                </button>
              )}
            </div>

            {/* Grid dimension controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <Rows className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Rows:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <button
                      onClick={() => setEditorRows(Math.max(1, editorRows - 1))}
                      className="w-5 h-5 rounded bg-white border border-slate-300 font-bold flex items-center justify-center hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-slate-800 px-1.5">{editorRows}</span>
                    <button
                      onClick={() => setEditorRows(editorRows + 1)}
                      className="w-5 h-5 rounded bg-white border border-slate-300 font-bold flex items-center justify-center hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Columns className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Columns:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <button
                      onClick={() => setEditorCols(Math.max(1, editorCols - 1))}
                      className="w-5 h-5 rounded bg-white border border-slate-300 font-bold flex items-center justify-center hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-slate-800 px-1.5">{editorCols}</span>
                    <button
                      onClick={() => setEditorCols(editorCols + 1)}
                      className="w-5 h-5 rounded bg-white border border-slate-300 font-bold flex items-center justify-center hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold">Usable Capacity:</span>
                <p className="font-mono font-bold text-emerald-600 text-sm mt-0.5">
                  {totalUsableSeats} seats
                </p>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold">Blocked Desks:</span>
                <p className="font-mono font-bold text-rose-600 text-sm mt-0.5">
                  {blockedSeats.size} desks
                </p>
              </div>
            </div>

            {/* Front of Room Indicator */}
            <div className="w-full py-1.5 mb-4 bg-slate-200/80 rounded text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest border border-slate-300/80">
              [ Whiteboard / Podium / Teacher's Desk ]
            </div>

            {/* Visual Seat Matrix */}
            <div className="overflow-x-auto pb-4">
              <div
                className="grid gap-2 justify-center mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${editorCols}, minmax(42px, 52px))`,
                }}
              >
                {Array.from({ length: editorRows }).map((_, r) => {
                  const rowLetter = String.fromCharCode(65 + r);
                  return Array.from({ length: editorCols }).map((__, c) => {
                    const key = `${r}-${c}`;
                    const isBlocked = blockedSeats.has(key);
                    const seatLabel = `${rowLetter}${c + 1}`;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleSeatBlocked(r, c)}
                        className={`h-11 rounded-lg border text-center transition-all flex flex-col items-center justify-center relative group ${
                          isBlocked
                            ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-inner'
                            : 'bg-white border-slate-300 hover:border-primary-500 hover:bg-primary-50/30 text-slate-700 shadow-2xs'
                        }`}
                      >
                        <span className="font-mono text-[10px] font-bold leading-none">
                          {seatLabel}
                        </span>
                        {isBlocked ? (
                          <Ban className="w-3 h-3 text-rose-500 mt-0.5" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                        )}
                        <span className="absolute -top-6 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {isBlocked ? 'Blocked Desk' : `Desk ${seatLabel} (Usable)`}
                        </span>
                      </button>
                    );
                  });
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-white border border-slate-300 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px]">Usable Desk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-50 border border-rose-300 flex items-center justify-center">
                  <Ban className="w-2.5 h-2.5 text-rose-500" />
                </span>
                <span className="text-[11px]">Blocked / Defective (Never Assigned)</span>
              </div>
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              Grid: {editorRows}R × {editorCols}C = {editorRows * editorCols} Desks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
