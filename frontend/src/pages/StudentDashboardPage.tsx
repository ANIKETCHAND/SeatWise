import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Armchair,
  CheckCircle2,
  Clock,
  DoorClosed,
  Building,
  GraduationCap,
  History,
  Search,
  Sparkles,
  AlertCircle,
  FileText,
  Printer,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { StudentExam, StudentSeatInfo } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialTab = (): 'today' | 'find-seat' | 'upcoming' | 'history' => {
    if (location.pathname.includes('/student/examinations')) return 'today';
    if (location.pathname.includes('/student/seat-lookup')) return 'find-seat';
    if (location.pathname.includes('/student/history')) return 'history';
    return 'find-seat';
  };

  const [activeTab, setActiveTab] = useState<'today' | 'find-seat' | 'upcoming' | 'history'>(getInitialTab);

  useEffect(() => {
    if (location.pathname.includes('/student/examinations')) setActiveTab('today');
    else if (location.pathname.includes('/student/seat-lookup')) setActiveTab('find-seat');
    else if (location.pathname.includes('/student/history')) setActiveTab('history');
  }, [location.pathname]);

  const [loading, setLoading] = useState<boolean>(true);

  // Student profile data
  const [studentInfo, setStudentInfo] = useState<{
    full_name: string;
    roll_number: string;
    program_code: string;
    program_name: string;
    semester: number;
    section: string;
  } | null>(null);

  // Today's exams
  const [todayExams, setTodayExams] = useState<StudentExam[]>([]);
  // Upcoming exams
  const [upcomingExams, setUpcomingExams] = useState<StudentExam[]>([]);
  // Seat allocation
  const [seatAllocations, setSeatAllocations] = useState<StudentSeatInfo[]>([]);
  const [selectedAllocationIndex, setSelectedAllocationIndex] = useState<number>(0);
  // History
  const [examHistory, setExamHistory] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);

    Promise.allSettled([
      api.getStudentMe(),
      api.getTodayExaminations(),
      api.getUpcomingExaminations(),
      api.lookupMySeat(),
      api.getHistory(),
    ])
      .then(([meRes, todayRes, upcomingRes, seatRes, historyRes]) => {
        if (meRes.status === 'fulfilled' && meRes.value) {
          setStudentInfo(meRes.value);
        } else if (user) {
          setStudentInfo({
            full_name: user.full_name || 'Student',
            roll_number: user.roll_number || '23JU0102',
            program_code: 'CSE',
            program_name: 'B.Tech Computer Science & Engineering',
            semester: 4,
            section: 'A',
          });
        }

        if (todayRes.status === 'fulfilled' && todayRes.value?.examinations) {
          setTodayExams(todayRes.value.examinations);
        }

        if (upcomingRes.status === 'fulfilled' && upcomingRes.value?.examinations) {
          setUpcomingExams(upcomingRes.value.examinations);
        }

        if (seatRes.status === 'fulfilled' && seatRes.value?.allocations) {
          setSeatAllocations(seatRes.value.allocations);
        }

        if (historyRes.status === 'fulfilled' && historyRes.value?.history) {
          setExamHistory(historyRes.value.history);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const activeSeat = seatAllocations[selectedAllocationIndex] || seatAllocations[0] || null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-mono text-zinc-500">Loading student examination portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      {/* Student Profile Hero Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
            {studentInfo?.full_name?.charAt(0) || 'S'}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono border border-zinc-200 mb-1">
              <CheckCircle2 className="w-3 h-3 text-black" />
              Verified Student Account
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">
              {studentInfo?.full_name || user?.full_name || 'University Student'}
            </h1>
            <p className="text-xs text-zinc-500 flex flex-wrap items-center gap-2 mt-0.5">
              <span className="font-mono font-semibold text-zinc-800">
                USN: {studentInfo?.roll_number || user?.roll_number || '23JU0102'}
              </span>
              <span>•</span>
              <span>{studentInfo?.program_name || 'B.Tech CSE'}</span>
              <span>•</span>
              <span>Semester {studentInfo?.semester || 4} - Section {studentInfo?.section || 'A'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-zinc-200 hover:border-black bg-white text-xs font-semibold text-zinc-800 hover:text-black transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Hall Ticket
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => {
            setActiveTab('find-seat');
            navigate('/student/seat-lookup');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'find-seat'
              ? 'bg-black text-white shadow-xs'
              : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
          }`}
        >
          <Armchair className="w-4 h-4" />
          <span>Find My Seat</span>
          {seatAllocations.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-white text-[10px] font-mono">
              {seatAllocations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('today');
            navigate('/student/examinations');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'today'
              ? 'bg-black text-white shadow-xs'
              : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Today's Examinations</span>
          {todayExams.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-mono">
              {todayExams.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-black text-white shadow-xs'
              : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Upcoming Schedule</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            navigate('/student/history');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-black text-white shadow-xs'
              : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Examination History</span>
        </button>
      </div>

      {/* TAB 1: FIND MY SEAT (Interactive Desk Locator) */}
      {activeTab === 'find-seat' && (
        <div className="space-y-6">
          {seatAllocations.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-500">
                <Armchair className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900">No Published Seating Plans Yet</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Your examination seating arrangement is currently being processed by the Exam Cell.
                Seat numbers will appear here immediately once officially published.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* If multiple exams allocated */}
              {seatAllocations.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {seatAllocations.map((alloc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedAllocationIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                        selectedAllocationIndex === idx
                          ? 'border-black bg-black text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                      }`}
                    >
                      {alloc.examination_name}
                    </button>
                  ))}
                </div>
              )}

              {activeSeat && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Official Desk Ticket */}
                  <div className="lg:col-span-1 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-5">
                    <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        Assigned Seat Desk Ticket
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                        Published
                      </span>
                    </div>

                    {/* Prominent Seat Number Badge */}
                    <div className="bg-zinc-900 text-white rounded-2xl p-6 text-center space-y-1 shadow-sm">
                      <span className="text-xs font-mono uppercase text-zinc-400 font-semibold tracking-widest block">
                        Assigned Seat
                      </span>
                      <div className="text-5xl font-extrabold font-mono tracking-tight text-white py-1">
                        {activeSeat.seat_label}
                      </div>
                      <span className="text-[11px] text-zinc-300 block font-mono">
                        Row {activeSeat.row + 1} • Column {activeSeat.column + 1}
                      </span>
                    </div>

                    {/* Venue & Time Details */}
                    <div className="space-y-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <DoorClosed className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-zinc-900 block">{activeSeat.hall_name}</span>
                          <span className="text-[11px] text-zinc-500">
                            {activeSeat.building} • {activeSeat.floor}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <CalendarDays className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-zinc-900 block">{activeSeat.examination_name}</span>
                          <span className="text-[11px] text-zinc-500">
                            Date: {activeSeat.examination_date} • Session: {activeSeat.examination_session}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <GraduationCap className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-zinc-900 block">Candidate: {activeSeat.student_name}</span>
                          <span className="text-[11px] text-zinc-500 font-mono">Roll: {activeSeat.roll_number}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Visual Seat Locator Map */}
                  <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                          <Armchair className="w-4 h-4 text-black" />
                          Visual Hall Desk Locator
                        </h3>
                        <p className="text-[11px] text-zinc-500">
                          Hall layout representation for {activeSeat.hall_name}. Your assigned seat is highlighted.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] font-mono">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-black inline-block" /> Your Seat
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-zinc-200 inline-block" /> Other Candidate
                        </span>
                      </div>
                    </div>

                    {/* Teacher/Invigilator Stage Podium */}
                    <div className="w-full py-2 bg-zinc-100 border border-zinc-300 rounded-lg text-center text-[10px] font-mono text-zinc-600 font-semibold uppercase tracking-wider">
                      [ Front of Hall / Invigilator Podium ]
                    </div>

                    {/* Interactive Seat Matrix */}
                    <div className="overflow-x-auto py-4">
                      <div className="inline-flex flex-col gap-2 min-w-full items-center">
                        {Array.from({ length: activeSeat.room_dimensions?.rows || 6 }).map((_, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-2">
                            <span className="w-6 text-[10px] font-mono text-zinc-400 text-right shrink-0">
                              R{rIdx + 1}
                            </span>
                            <div className="flex gap-2">
                              {Array.from({ length: activeSeat.room_dimensions?.columns || 6 }).map((_, cIdx) => {
                                const isMySeat = activeSeat.row === rIdx && activeSeat.column === cIdx;
                                const label = `${String.fromCharCode(65 + rIdx)}${cIdx + 1}`;
                                return (
                                  <div
                                    key={cIdx}
                                    className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center text-[10px] font-mono transition-transform ${
                                      isMySeat
                                        ? 'bg-black text-white font-bold ring-2 ring-black ring-offset-2 scale-110 shadow-md'
                                        : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                                    }`}
                                    title={`Seat ${label} (Row ${rIdx + 1}, Col ${cIdx + 1})`}
                                  >
                                    <span>{label}</span>
                                    {isMySeat && <span className="text-[8px] font-sans leading-none">YOU</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-center text-[11px] text-zinc-500 font-mono">
                      Please occupy your designated desk at least 15 minutes before exam commencement.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TODAY'S EXAMINATIONS */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Examinations Scheduled for Today
          </div>

          {todayExams.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900">No Examinations Scheduled Today</h3>
              <p className="text-xs text-zinc-500">You do not have any exams scheduled for today's date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 text-[10px] font-mono font-bold">
                      {exam.session_label || exam.session}
                    </span>
                    <span className="text-xs text-zinc-500">{exam.date}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">{exam.examination_name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Faculty of Engineering and Technology</p>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-mono">Status: {exam.status}</span>
                    <button
                      onClick={() => setActiveTab('find-seat')}
                      className="text-xs font-semibold text-black hover:underline cursor-pointer"
                    >
                      Locate Desk →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: UPCOMING EXAMINATIONS */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Future Examination Schedule
          </div>

          {upcomingExams.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center space-y-2">
              <CalendarDays className="w-8 h-8 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900">No Upcoming Exams Found</h3>
              <p className="text-xs text-zinc-500">No future examinations published at this time.</p>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 overflow-hidden shadow-xs">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-zinc-950">{exam.examination_name}</h4>
                    <p className="text-[11px] text-zinc-500">
                      Date: <span className="font-semibold text-zinc-800">{exam.date}</span> • Session:{' '}
                      <span className="font-mono">{exam.session}</span>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-zinc-100 text-zinc-800 border border-zinc-200 capitalize">
                    {exam.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EXAMINATION HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Past Examination Attendance & Seating History
          </div>

          {examHistory.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center space-y-2">
              <History className="w-8 h-8 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900">No Previous Examination History</h3>
              <p className="text-xs text-zinc-500">Prior examination records will be archived here.</p>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 overflow-hidden shadow-xs">
              {examHistory.map((h, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">{h.examination_name}</h4>
                    <p className="text-[11px] text-zinc-500">
                      Date: {h.exam_date} • Hall: {h.hall} • Session: {h.session}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-zinc-900 block">Seat {h.seat_label}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
