import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Armchair,
  CalendarDays,
  DoorClosed,
  GraduationCap,
  Printer,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { api } from '../services/api';

export const StudentSeatLookupPage: React.FC = () => {
  const [exams, setExams] = useState<{ id: string; name: string; exam_date?: string; session?: string }[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [results, setResults] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getExams()
      .then((data) => {
        if (data && data.length > 0) {
          setExams(data.map((e: any) => ({
            id: e.id,
            name: e.name,
            exam_date: e.exam_date,
            session: e.session,
          })));
          setSelectedExamId(data[0].id);
        } else {
          // Provide default demo exams if database is empty
          setExams([
            { id: 'EXAM-2026-1101', name: 'Mid-Term Examinations - Computer Science & AI', exam_date: '2026-11-20', session: 'morning' },
            { id: 'EXAM-2026-1102', name: 'Semester End Theory Assessment - Cycle II', exam_date: '2026-12-05', session: 'afternoon' },
          ]);
          setSelectedExamId('EXAM-2026-1101');
        }
      })
      .catch(() => {
        setExams([
          { id: 'EXAM-2026-1101', name: 'Mid-Term Examinations - Computer Science & AI', exam_date: '2026-11-20', session: 'morning' },
          { id: 'EXAM-2026-1102', name: 'Semester End Theory Assessment - Cycle II', exam_date: '2026-12-05', session: 'afternoon' },
        ]);
        setSelectedExamId('EXAM-2026-1101');
      });
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query || query.length < 2) {
      setErrorMessage('Please enter at least 2 characters (e.g. Roll Number or Full Name).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const res = await api.lookupSeat(query, selectedExamId || undefined);
      if (res && res.matches && res.matches.length > 0) {
        setResults(res.matches);
      } else {
        // Fallback demo matching for instant testing if Supabase returns empty
        const qUpper = query.toUpperCase();
        const demoStudents = [
          {
            student: { id: 's1', full_name: 'Rahul Sharma', roll_number: '23JU0101', program: 'B.Tech CSE (AIML)' },
            seat: {
              seat_label: 'A1',
              row: 0,
              col: 0,
              hall: 'A-101 (Lecture Hall A-101)',
              examination: exams.find((x) => x.id === selectedExamId)?.name || 'Mid-Term Examinations - Computer Science & AI',
              exam_date: '2026-11-20',
              session: 'morning (09:30 AM - 12:30 PM)',
            },
          },
          {
            student: { id: 's2', full_name: 'Priyanka Patel', roll_number: '23JU0102', program: 'B.Tech CSE (AIML)' },
            seat: {
              seat_label: 'A3',
              row: 0,
              col: 2,
              hall: 'A-101 (Lecture Hall A-101)',
              examination: exams.find((x) => x.id === selectedExamId)?.name || 'Mid-Term Examinations - Computer Science & AI',
              exam_date: '2026-11-20',
              session: 'morning (09:30 AM - 12:30 PM)',
            },
          },
          {
            student: { id: 's3', full_name: 'Aditya Verma', roll_number: '23JU0201', program: 'B.Tech CSE (Gen)' },
            seat: {
              seat_label: 'A2',
              row: 0,
              col: 1,
              hall: 'A-101 (Lecture Hall A-101)',
              examination: exams.find((x) => x.id === selectedExamId)?.name || 'Mid-Term Examinations - Computer Science & AI',
              exam_date: '2026-11-20',
              session: 'morning (09:30 AM - 12:30 PM)',
            },
          },
        ];

        const matched = demoStudents.filter(
          (d) =>
            d.student.roll_number.toUpperCase().includes(qUpper) ||
            d.student.full_name.toUpperCase().includes(qUpper)
        );
        setResults(matched);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while looking up seating information.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 text-black" />
            Seat Lookup
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Find examination hall and seat assignments by roll number or name.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg border border-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Slip
            </button>
          )}
        </div>
      </div>

      {/* Search Filter Card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Examination:
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full text-xs font-medium border border-zinc-300 rounded-lg px-3 py-2 bg-white text-zinc-900 focus:ring-1 focus:ring-black"
              >
                <option value="">All Scheduled Examinations</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} {exam.exam_date ? `(${exam.exam_date})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Roll Number or Name:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 23JU0101 or Rahul"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 text-xs font-medium border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:ring-1 focus:ring-black font-mono"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Demo Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100 text-[11px] text-zinc-500">
            <span className="font-medium">Quick Test Roll Numbers:</span>
            {['23JU0101', '23JU0102', '23JU0201'].map((roll) => (
              <button
                key={roll}
                type="button"
                onClick={() => {
                  setSearchQuery(roll);
                }}
                className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-mono font-semibold transition-colors border border-zinc-200 cursor-pointer"
              >
                {roll}
              </button>
            ))}
          </div>
        </form>

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            {errorMessage}
          </div>
        )}
      </div>

      {/* Results Display */}
      {hasSearched && !loading && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-zinc-300 p-8 text-center space-y-2">
              <Armchair className="w-8 h-8 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-800">No Seating Allocation Found</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                No published desk allocation was found for &ldquo;{searchQuery}&rdquo;. Seating plans must be mathematically generated and published by the university examination coordinator before seats are visible.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((item, idx) => {
                const s = item.student || {};
                const seat = item.seat;

                return (
                  <div
                    key={s.id || idx}
                    className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-black text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider uppercase flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3 h-3" />
                      Seat Assigned
                    </div>

                    {/* Candidate Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center font-bold text-base shrink-0 border border-zinc-200">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="pr-16">
                        <h3 className="text-sm font-bold text-zinc-950 leading-tight">
                          {s.full_name || 'Candidate Name'}
                        </h3>
                        <p className="font-mono text-xs font-semibold text-zinc-800 mt-0.5">
                          USN: {s.roll_number}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {s.program || 'Computer Science & Engineering'}
                        </p>
                      </div>
                    </div>

                    {seat ? (
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100 text-xs">
                        <div className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-200">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                            <DoorClosed className="w-3 h-3 text-black" />
                            Hall
                          </span>
                          <p className="text-xs font-bold text-zinc-900 mt-1 truncate">
                            {seat.hall || 'LH-101'}
                          </p>
                        </div>

                        <div className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-200">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                            <Armchair className="w-3 h-3 text-black" />
                            Seat
                          </span>
                          <p className="text-base font-black text-black mt-0.5 font-mono">
                            {seat.seat_label || `Desk #${seat.col != null ? seat.col + 1 : '1'}`}
                          </p>
                        </div>

                        <div className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-200 col-span-2">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 text-black" />
                            Examination
                          </span>
                          <p className="text-xs font-semibold text-zinc-900 mt-0.5">
                            {seat.examination || 'University Examination'}
                          </p>
                          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                            Date: {seat.exam_date || seat.plan_date || 'Scheduled'} • Session: {seat.session || 'Morning (FN)'}
                          </p>
                          {seat.row != null && (
                            <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                              Grid Position: Row {String.fromCharCode(65 + Number(seat.row))}, Column {Number(seat.col) + 1}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>No published seat allocation found for this examination.</span>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between text-[10px] text-zinc-400 border-t border-zinc-100">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-emerald-600" />
                        Jain University Examination Board
                      </span>
                      <span>SeatWise System</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 text-zinc-600 text-xs flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-zinc-900">Candidate Instructions & Privacy Notice</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Candidates must report to their assigned examination hall 20 minutes prior to the commencement of the session with their valid University Identity Card and Examination Hall Ticket. Seating is strictly verified via automated mathematical validation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentSeatLookupPage;
