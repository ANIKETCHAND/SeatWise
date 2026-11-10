import React, { useState, useEffect, useMemo } from 'react';
import {
  DoorClosed,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Columns,
  Rows,
  Save,
  Layers,
  Search,
  Building,
  Filter,
  Award,
  Check,
  RefreshCw,
  LayoutGrid,
  Compass,
  Maximize2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Room } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import {
  CAMPUS_ROOMS,
  CAMPUS_FLOORS,
  CampusRoom,
  CampusBlock,
  CampusRoomClassification,
} from '../data/campusFloorData';

export const RoomsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { showNotification } = useNotification();

  // Master Rooms State (Initialized with comprehensive authentic FET Campus architectural rooms)
  const [rooms, setRooms] = useState<CampusRoom[]>(CAMPUS_ROOMS);

  // Filter & Navigation State
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [selectedBlock, setSelectedBlock] = useState<'all' | CampusBlock>('all');
  const [selectedClassification, setSelectedClassification] = useState<'all' | CampusRoomClassification>('all');
  const [examOnly, setExamOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'map' | 'cards'>('map');

  // Interactive Layout Editor State
  const [selectedRoom, setSelectedRoom] = useState<CampusRoom>(
    CAMPUS_ROOMS.find((r) => r.room_number === 'A-101') || CAMPUS_ROOMS[0]
  );
  const [editorRows, setEditorRows] = useState<number>(selectedRoom.rows || 6);
  const [editorCols, setEditorCols] = useState<number>(selectedRoom.columns || 6);
  const [blockedSeats, setBlockedSeats] = useState<Set<string>>(new Set(['0-2', '2-4']));
  const [editorFeedback, setEditorFeedback] = useState<string | null>(null);

  // Sync with Backend API if available
  useEffect(() => {
    api.getRooms()
      .then((data) => {
        if (data && data.length > 0) {
          // Merge API overrides onto authentic campus floor rooms
          setRooms((prev) =>
            prev.map((r) => {
              const remote = data.find(
                (d: any) =>
                  (d.code && d.code.toLowerCase() === r.room_number.toLowerCase()) ||
                  (d.name && d.name.toLowerCase() === r.name.toLowerCase())
              );
              if (!remote) return r;
              return {
                ...r,
                id: remote.id || r.id,
                rows: remote.rows || r.rows,
                columns: remote.columns || r.columns,
                capacity: remote.total_seats || r.capacity,
                usable_capacity: remote.usable_seats || r.usable_capacity,
                blocked_seats_count: remote.blocked_seats || r.blocked_seats_count,
                is_exam_approved: remote.is_exam_approved !== undefined ? !!remote.is_exam_approved : r.is_exam_approved,
              };
            })
          );
        }
      })
      .catch(() => {});
  }, []);

  const selectRoomForEditing = (room: CampusRoom) => {
    setSelectedRoom(room);
    const r = room.rows || 6;
    const c = room.columns || 6;
    setEditorRows(r);
    setEditorCols(c);
    if (room.blocked_seats && room.blocked_seats.length > 0) {
      setBlockedSeats(new Set(room.blocked_seats));
    } else if (room.blocked_seats_count > 0) {
      const initialBlocked = new Set<string>();
      for (let i = 0; i < room.blocked_seats_count; i++) {
        initialBlocked.add(`${i % r}-${(i * 2 + 1) % c}`);
      }
      setBlockedSeats(initialBlocked);
    } else {
      setBlockedSeats(new Set());
    }
    setEditorFeedback(null);
  };

  const handleFloorChange = (floor: number) => {
    setSelectedFloor(floor);
    const targetFloorMeta = CAMPUS_FLOORS.find((f) => f.floor === floor) || CAMPUS_FLOORS[1];
    if (selectedBlock !== 'all' && !targetFloorMeta.blocks.includes(selectedBlock)) {
      setSelectedBlock('all');
    }
    const targetRooms = rooms.filter((r) => r.floor === floor);
    if (targetRooms.length > 0) {
      const preferred = targetRooms.find((r) => r.is_exam_center) || targetRooms[0];
      selectRoomForEditing(preferred);
    }
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

  const toggleExamApproval = (roomId: string) => {
    const updated = rooms.map((r) => {
      if (r.id === roomId || r.room_number === roomId) {
        return { ...r, is_exam_approved: !r.is_exam_approved };
      }
      return r;
    });
    setRooms(updated);
    if (selectedRoom.id === roomId || selectedRoom.room_number === roomId) {
      setSelectedRoom((prev) => ({ ...prev, is_exam_approved: !prev.is_exam_approved }));
    }
    showNotification('success', `Updated examination certification for venue.`);
  };

  const setStandardExamGrid = () => {
    setEditorRows(6);
    setEditorCols(6);
    setBlockedSeats(new Set());
    setEditorFeedback('Applied standard 6×6 (36 seats) exam layout.');
  };

  const clearBlockedSeats = () => {
    setBlockedSeats(new Set());
    setEditorFeedback('Cleared all blocked desks.');
  };

  const saveLayout = () => {
    const total = editorRows * editorCols;
    const blockedCount = blockedSeats.size;
    const usable = total - blockedCount;
    const blockedArr = Array.from(blockedSeats);

    const updatedRooms = rooms.map((r) => {
      if (r.id === selectedRoom.id || r.room_number === selectedRoom.room_number) {
        return {
          ...r,
          rows: editorRows,
          columns: editorCols,
          capacity: total,
          usable_capacity: usable,
          blocked_seats_count: blockedCount,
          blocked_seats: blockedArr,
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
      blocked_seats: blockedArr,
    });

    api.updateRoomLayout(selectedRoom.id, {
      rows: editorRows,
      columns: editorCols,
      blocked: blockedArr,
    })
      .then(() => {
        setEditorFeedback(`Layout for ${selectedRoom.room_number} saved to database.`);
        showNotification('success', `Room layout for ${selectedRoom.room_number} saved.`);
      })
      .catch((err: any) => {
        setEditorFeedback(`Layout for ${selectedRoom.room_number} updated locally.`);
        showNotification('warning', `Layout updated locally (${err.message || 'Saved in memory'})`);
      });

    setTimeout(() => setEditorFeedback(null), 4000);
  };

  // Filtered rooms based on floor, block, classification, and search
  const floorRooms = useMemo(() => {
    return rooms.filter((r) => r.floor === selectedFloor);
  }, [rooms, selectedFloor]);

  const filteredRooms = useMemo(() => {
    return floorRooms.filter((r) => {
      if (selectedBlock !== 'all' && r.block !== selectedBlock) return false;
      if (selectedClassification !== 'all' && r.classification !== selectedClassification) return false;
      if (examOnly && !r.is_exam_approved) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = r.room_number.toLowerCase().includes(q);
        const matchName = r.name.toLowerCase().includes(q);
        const matchClass = r.classification.toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchClass) return false;
      }
      return true;
    });
  }, [floorRooms, selectedBlock, selectedClassification, examOnly, searchQuery]);

  // Designated Examination Centers
  const examCenters = useMemo(() => {
    return rooms.filter((r) => r.is_exam_center);
  }, [rooms]);

  // Floor stats
  const totalFloorRooms = floorRooms.length;
  const examApprovedCount = floorRooms.filter((r) => r.is_exam_approved).length;
  const totalFloorCapacity = floorRooms.reduce((acc, r) => acc + (r.usable_capacity || 0), 0);
  const activeFloorMeta = CAMPUS_FLOORS.find((f) => f.floor === selectedFloor) || CAMPUS_FLOORS[1];

  const totalUsableSeats = editorRows * editorCols - blockedSeats.size;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-zinc-950 text-white rounded-lg">
              <DoorClosed className="w-5 h-5 text-white" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
                Halls & Classrooms
              </h1>
              <p className="text-xs text-zinc-500">
                Campus floor plans, examination hall capacities, and desk layouts.
              </p>
            </div>
          </div>
        </div>

        {/* Global Stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-zinc-100 border border-zinc-300 rounded-lg font-mono">
            <span className="text-zinc-500 text-[10px] block uppercase font-bold">Total Rooms</span>
            <span className="font-bold text-zinc-950">{rooms.length} venues</span>
          </div>
          <div className="px-3 py-1.5 bg-zinc-950 text-white border border-zinc-950 rounded-lg font-mono">
            <span className="text-zinc-400 text-[10px] block uppercase font-bold">Exam Approved</span>
            <span className="font-bold text-white">{rooms.filter((r) => r.is_exam_approved).length} halls</span>
          </div>
          <div className="px-3 py-1.5 bg-zinc-100 border border-zinc-300 rounded-lg font-mono">
            <span className="text-zinc-500 text-[10px] block uppercase font-bold">Exam Centers</span>
            <span className="font-bold text-zinc-950">3 certified</span>
          </div>
        </div>
      </div>

      {/* Designated Examination Centers Banner */}
      <div className="p-4 bg-zinc-950 text-white rounded-xl border border-zinc-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white text-zinc-950 rounded-lg font-bold text-xs flex items-center gap-1 shrink-0">
              <Award className="w-4 h-4 text-zinc-950" />
              SECURE
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Examination & Valuation Centers
              </h3>
              <p className="text-xs text-zinc-400">
                Paper custody, valuations, and controller operations.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {examCenters.map((ec) => (
              <button
                key={ec.id}
                type="button"
                onClick={() => {
                  setSelectedFloor(ec.floor);
                  selectRoomForEditing(ec);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                  selectedRoom.room_number === ec.room_number
                    ? 'bg-white text-zinc-950 border-white shadow-xs'
                    : 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{ec.room_number}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded font-normal">
                  {ec.center_type}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Floor Switcher */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-zinc-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">Select Campus Floor:</span>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-100 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'map'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Schematic Floor Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Room Cards Grid
            </button>
          </div>
        </div>

        {/* Floor Selection Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {CAMPUS_FLOORS.map((f) => {
            const isCurrent = selectedFloor === f.floor;
            const floorHallsCount = rooms.filter((r) => r.floor === f.floor).length;
            const floorExamHallsCount = rooms.filter((r) => r.floor === f.floor && r.is_exam_approved).length;

            return (
              <button
                key={f.floor}
                type="button"
                onClick={() => handleFloorChange(f.floor)}
                className={`p-3 rounded-lg border text-left transition-all relative ${
                  isCurrent
                    ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                    : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-100/60 text-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                    isCurrent ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
                  }`}>
                    {f.short_label}
                  </span>
                  {f.floor === 3 && (
                    <span className={`text-[9px] font-bold px-1 rounded ${
                      isCurrent ? 'bg-white text-zinc-950' : 'bg-zinc-900 text-white'
                    }`}>
                      EXAM SEC
                    </span>
                  )}
                </div>
                <h4 className={`text-xs font-bold mt-2 ${isCurrent ? 'text-white' : 'text-zinc-900'}`}>
                  {f.name}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-[10px] opacity-80">
                  <span>{floorHallsCount} rooms</span>
                  <span>•</span>
                  <span>{floorExamHallsCount} exam halls</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Floor Subtitle / Description */}
        <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-600 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900">{activeFloorMeta.name}:</span>
            <span>{activeFloorMeta.subtitle}</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            Capacity: <strong>{totalFloorCapacity}</strong> seats across <strong>{totalFloorRooms}</strong> rooms
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100">
          {/* Block Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-zinc-500 mr-1">Block / Wing:</span>
            {(['all', ...activeFloorMeta.blocks] as const).map((blk) => (
              <button
                key={blk}
                type="button"
                onClick={() => setSelectedBlock(blk)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  selectedBlock === blk
                    ? 'bg-zinc-950 text-white'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {blk === 'all' ? 'All Blocks' : blk === 'Central' ? 'Central Core' : `Block ${blk}`}
              </button>
            ))}
          </div>

          {/* Classification Filter & Search */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Classification Selector */}
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value as any)}
              className="px-2.5 py-1 text-xs rounded-md bg-white border border-zinc-300 text-zinc-700 font-medium hover:border-zinc-500 focus:outline-none"
            >
              <option value="all">All Venue Classes</option>
              <option value="Approved Examination Lecture Hall">Approved Exam Halls</option>
              <option value="Computer Lab / Valuation Center">Computer Labs & Valuation</option>
              <option value="Department Lab">Department Labs</option>
              <option value="Faculty / Admin Office">Faculty & Admin</option>
            </select>

            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search room (e.g. A-101)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-white border border-zinc-300 rounded-md text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-950 w-full sm:w-40"
              />
            </div>

            <button
              type="button"
              onClick={() => setExamOnly(!examOnly)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium border flex items-center gap-1 transition-all ${
                examOnly
                  ? 'bg-zinc-950 text-white border-zinc-950'
                  : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              Exam Certified
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Floor Map / Cards (Left 7 Cols) and Seat Matrix Editor (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Map or Cards */}
        <div className="lg:col-span-7 space-y-4">
          {viewMode === 'map' ? (
            /* Interactive Schematic Architectural Floor Map */
            <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs p-4">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-zinc-800" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Architectural Wing Layout • {activeFloorMeta.name}
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {filteredRooms.length} venues shown
                </span>
              </div>

              {/* Blueprint Layout Grid */}
              <div className="space-y-4">
                {/* North Wing: Block D (if present) */}
                {activeFloorMeta.blocks.includes('D') && (selectedBlock === 'all' || selectedBlock === 'D') && (
                  <div className="p-3 bg-zinc-50/70 border border-zinc-200 rounded-lg">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 text-xs font-bold text-zinc-800">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-zinc-800" />
                        North Wing — Block D (Advanced Sciences & Library)
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono font-normal">FET Campus</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {filteredRooms
                        .filter((r) => r.block === 'D')
                        .map((r) => (
                          <RoomMapTile
                            key={r.id}
                            room={r}
                            isSelected={selectedRoom.room_number === r.room_number}
                            onSelect={() => selectRoomForEditing(r)}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Main Middle Row: Block A (West), Central Hub, Block B (East) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* West Wing: Block A */}
                  {(selectedBlock === 'all' || selectedBlock === 'A') && (
                    <div className={`p-3 bg-zinc-50/70 border border-zinc-200 rounded-lg ${
                      selectedBlock === 'A' ? 'md:col-span-12' : activeFloorMeta.blocks.includes('B') ? 'md:col-span-6' : 'md:col-span-12'
                    }`}>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 text-xs font-bold text-zinc-800">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-zinc-950" />
                          West Wing — Block A (Lecture Theatres & Labs)
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono font-normal">Block A</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredRooms
                          .filter((r) => r.block === 'A')
                          .map((r) => (
                            <RoomMapTile
                              key={r.id}
                              room={r}
                              isSelected={selectedRoom.room_number === r.room_number}
                              onSelect={() => selectRoomForEditing(r)}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* East Wing: Block B */}
                  {activeFloorMeta.blocks.includes('B') && (selectedBlock === 'all' || selectedBlock === 'B') && (
                    <div className={`p-3 bg-zinc-50/70 border border-zinc-200 rounded-lg ${
                      selectedBlock === 'B' ? 'md:col-span-12' : activeFloorMeta.blocks.includes('A') ? 'md:col-span-6' : 'md:col-span-12'
                    }`}>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 text-xs font-bold text-zinc-800">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-zinc-950" />
                          East Wing — Block B (Computing Labs & Halls)
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono font-normal">Block B</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredRooms
                          .filter((r) => r.block === 'B')
                          .map((r) => (
                            <RoomMapTile
                              key={r.id}
                              room={r}
                              isSelected={selectedRoom.room_number === r.room_number}
                              onSelect={() => selectRoomForEditing(r)}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Central Core: Amphitheatre or Atrium */}
                {activeFloorMeta.blocks.includes('Central') && (selectedBlock === 'all' || selectedBlock === 'Central') && (
                  <div className="p-3 bg-zinc-100 border border-zinc-300 rounded-lg">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 text-xs font-bold text-zinc-900">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
                        Central Core Hub (Atrium / Stage)
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">Central Core</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredRooms
                        .filter((r) => r.block === 'Central')
                        .map((r) => (
                          <RoomMapTile
                            key={r.id}
                            room={r}
                            isSelected={selectedRoom.room_number === r.room_number}
                            onSelect={() => selectRoomForEditing(r)}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* South Wing: Block C (if present) */}
                {activeFloorMeta.blocks.includes('C') && (selectedBlock === 'all' || selectedBlock === 'C') && (
                  <div className="p-3 bg-zinc-50/70 border border-zinc-200 rounded-lg">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 text-xs font-bold text-zinc-800">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-zinc-800" />
                        South Wing — Block C (Engineering Labs & Tech Wings)
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono font-normal">Block C</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {filteredRooms
                        .filter((r) => r.block === 'C')
                        .map((r) => (
                          <RoomMapTile
                            key={r.id}
                            room={r}
                            isSelected={selectedRoom.room_number === r.room_number}
                            onSelect={() => selectRoomForEditing(r)}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Cards Grid View */
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[720px] overflow-y-auto pr-1">
                {filteredRooms.map((r) => {
                  const isSelected = selectedRoom.room_number === r.room_number;
                  return (
                    <div
                      key={r.id}
                      onClick={() => selectRoomForEditing(r)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                          : 'border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50/70 text-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            isSelected ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                          }`}>
                            {r.room_number}
                          </span>
                          <span className={`text-[10px] ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            Block {r.block}
                          </span>
                        </div>
                        {r.is_exam_center ? (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isSelected ? 'bg-white text-zinc-950' : 'bg-zinc-900 text-white'
                          }`}>
                            {r.center_type}
                          </span>
                        ) : r.is_exam_approved ? (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            isSelected ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800 border border-zinc-300'
                          }`}>
                            <ShieldCheck className="w-3 h-3" />
                            Exam Certified
                          </span>
                        ) : null}
                      </div>

                      <h4 className={`text-xs font-bold mt-2 truncate ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
                        {r.name}
                      </h4>

                      <div className={`mt-2 pt-2 border-t flex items-center justify-between text-xs font-mono ${
                        isSelected ? 'border-zinc-800 text-zinc-300' : 'border-zinc-100 text-zinc-600'
                      }`}>
                        <span>{r.area_sqm} m²</span>
                        <span>{r.rows}R × {r.columns}C</span>
                        <span className="font-bold">{r.usable_capacity} seats</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Room Matrix Layout Editor */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-zinc-200 shadow-2xs p-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Selected Venue Header */}
            <div className="pb-3 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm bg-zinc-950 text-white px-2.5 py-0.5 rounded">
                    {selectedRoom.room_number}
                  </span>
                  <h2 className="text-sm font-bold text-zinc-950 truncate max-w-[220px]">
                    {selectedRoom.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                  <span>Block {selectedRoom.block}</span>
                  <span>•</span>
                  <span>{selectedRoom.floor_label}</span>
                  <span>•</span>
                  <span className="font-mono font-semibold">{selectedRoom.area_sqm} m²</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleExamApproval(selectedRoom.room_number)}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold border flex items-center gap-1 transition-all ${
                    selectedRoom.is_exam_approved
                      ? 'bg-zinc-100 text-zinc-900 border-zinc-300 hover:bg-zinc-200'
                      : 'bg-zinc-950 text-white border-zinc-950 hover:bg-zinc-800'
                  }`}
                  title={selectedRoom.is_exam_approved ? 'Revoke exam certification' : 'Certify venue for exams'}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {selectedRoom.is_exam_approved ? 'Certified' : 'Certify'}
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={saveLayout}
                    className="px-3 py-1 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </button>
                )}
              </div>
            </div>

            {editorFeedback && (
              <div className="p-2.5 bg-zinc-100 border border-zinc-300 text-zinc-900 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zinc-950 shrink-0" />
                {editorFeedback}
              </div>
            )}

            {/* Classification & Area Info Pill */}
            <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] uppercase font-bold">Venue Classification:</span>
                <span className="font-semibold text-zinc-900">{selectedRoom.classification}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-zinc-500">Floor Area Space:</span>
                <span className="text-zinc-800">
                  {selectedRoom.area_sqm} m² ({(selectedRoom.area_sqm / (totalUsableSeats || 1)).toFixed(1)} m²/seat)
                </span>
              </div>
            </div>

            {/* Grid dimension controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 text-xs">
              <div className="flex items-center gap-2">
                <Rows className="w-4 h-4 text-zinc-400" />
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold">Rows:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <button
                      type="button"
                      onClick={() => setEditorRows(Math.max(1, editorRows - 1))}
                      className="w-5 h-5 rounded bg-white border border-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-100 text-xs"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-zinc-900 px-1">{editorRows}</span>
                    <button
                      type="button"
                      onClick={() => setEditorRows(Math.min(12, editorRows + 1))}
                      className="w-5 h-5 rounded bg-white border border-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-100 text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Columns className="w-4 h-4 text-zinc-400" />
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold">Cols:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <button
                      type="button"
                      onClick={() => setEditorCols(Math.max(1, editorCols - 1))}
                      className="w-5 h-5 rounded bg-white border border-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-100 text-xs"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-zinc-900 px-1">{editorCols}</span>
                    <button
                      type="button"
                      onClick={() => setEditorCols(Math.min(12, editorCols + 1))}
                      className="w-5 h-5 rounded bg-white border border-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-100 text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-zinc-500 text-[10px] uppercase font-bold">Usable Seats:</span>
                <p className="font-mono font-bold text-zinc-950 text-sm mt-0.5">
                  {totalUsableSeats}
                </p>
              </div>

              <div>
                <span className="text-zinc-500 text-[10px] uppercase font-bold">Blocked:</span>
                <p className="font-mono font-bold text-zinc-500 text-sm mt-0.5">
                  {blockedSeats.size}
                </p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-zinc-500">Quick Config:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={setStandardExamGrid}
                  className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-medium rounded border border-zinc-300"
                >
                  Standard 6×6
                </button>
                <button
                  type="button"
                  onClick={clearBlockedSeats}
                  className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-medium rounded border border-zinc-300"
                >
                  Clear Blocked
                </button>
              </div>
            </div>

            {/* Front of Room Indicator */}
            <div className="w-full py-1.5 bg-zinc-100 rounded text-center text-[10px] font-bold text-zinc-700 uppercase tracking-widest border border-zinc-300">
              [ Whiteboard / Podium / Teacher's Desk ]
            </div>

            {/* Visual Seat Matrix */}
            <div className="overflow-x-auto pb-2 max-h-[360px] overflow-y-auto">
              <div
                className="grid gap-1.5 justify-center mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${editorCols}, minmax(38px, 48px))`,
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
                        className={`h-10 rounded border text-center transition-all flex flex-col items-center justify-center relative group ${
                          isBlocked
                            ? 'bg-zinc-200 border-zinc-400 text-zinc-400 line-through'
                            : 'bg-white border-zinc-300 hover:border-zinc-950 hover:bg-zinc-50 text-zinc-900 shadow-2xs'
                        }`}
                      >
                        <span className="font-mono text-[10px] font-bold leading-none">
                          {seatLabel}
                        </span>
                        {isBlocked ? (
                          <Ban className="w-2.5 h-2.5 text-zinc-500 mt-0.5" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 mt-1" />
                        )}
                        <span className="absolute -top-6 bg-zinc-950 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
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
          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-white border border-zinc-400 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                </span>
                <span className="text-[11px]">Usable Desk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-zinc-200 border border-zinc-400 flex items-center justify-center">
                  <Ban className="w-2 h-2 text-zinc-600" />
                </span>
                <span className="text-[11px]">Blocked / Defective</span>
              </div>
            </div>

            <span className="text-[11px] font-mono text-zinc-400">
              {editorRows * editorCols} Desks Total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component: Architectural Room Tile in Floor Map
const RoomMapTile: React.FC<{
  room: CampusRoom;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ room, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
        isSelected
          ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs ring-1 ring-zinc-950'
          : room.is_exam_center
          ? 'border-zinc-800 bg-zinc-900 text-white hover:border-zinc-950'
          : 'border-zinc-200 hover:border-zinc-400 bg-white text-zinc-900 hover:bg-zinc-50/50'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-1">
          <span className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded ${
            isSelected
              ? 'bg-zinc-800 text-white'
              : room.is_exam_center
              ? 'bg-zinc-800 text-zinc-200'
              : 'bg-zinc-100 text-zinc-900 border border-zinc-200'
          }`}>
            {room.room_number}
          </span>
          <span className={`text-[10px] font-mono ${
            isSelected || room.is_exam_center ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            {room.area_sqm} m²
          </span>
        </div>

        <h4 className={`text-xs font-semibold mt-1.5 line-clamp-1 ${
          isSelected || room.is_exam_center ? 'text-white' : 'text-zinc-900'
        }`}>
          {room.name}
        </h4>
      </div>

      <div className={`mt-2 pt-1.5 border-t flex items-center justify-between text-[10px] ${
        isSelected || room.is_exam_center ? 'border-zinc-800 text-zinc-300' : 'border-zinc-100 text-zinc-500'
      }`}>
        {room.is_exam_center ? (
          <span className="font-bold text-white uppercase text-[9px] flex items-center gap-1">
            <Award className="w-2.5 h-2.5" />
            {room.center_type}
          </span>
        ) : room.is_exam_approved ? (
          <span className="font-semibold flex items-center gap-1 text-[10px]">
            <ShieldCheck className="w-2.5 h-2.5" />
            Exam Hall
          </span>
        ) : (
          <span className="truncate max-w-[85px]">{room.room_type}</span>
        )}

        <span className="font-mono font-bold">
          {room.usable_capacity} seats
        </span>
      </div>
    </div>
  );
};
