import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  Plus,
  Calendar,
  Clock,
  DoorClosed,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Edit2,
  Trash2,
  Archive,
  BookOpen,
  AlertTriangle,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export interface ExamRecord {
  id: string;
  name: string;
  subject_name?: string;
  subject_code?: string;
  exam_date: string;
  session: 'morning' | 'afternoon';
  batches: string[];
  halls: string[];
  total_candidates: number;
  status: 'draft' | 'allocated' | 'published' | 'archived';
}

const INITIAL_EXAMS: ExamRecord[] = [
  {
    id: 'EXAM-2026-1101',
    name: 'Mid-Term Examinations - Computer Science & AI',
    subject_name: 'Artificial Intelligence & Search Algorithms',
    subject_code: 'CS301',
    exam_date: '2026-11-20',
    session: 'morning',
    batches: ['AIML-S3A', 'CSE-GEN-S3B', 'AIDE-S3A'],
    halls: ['LH-101', 'LH-102'],
    total_candidates: 52,
    status: 'allocated',
  },
  {
    id: 'EXAM-2026-1102',
    name: 'Semester End Theory Assessment - Cycle II',
    subject_name: 'Database Management Systems & SQL',
    subject_code: 'CS302',
    exam_date: '2026-11-25',
    session: 'afternoon',
    batches: ['CSE-GEN-S3B', 'AIDE-S3A'],
    halls: ['LH-101'],
    total_candidates: 32,
    status: 'draft',
  },
  {
    id: 'EXAM-2026-1103',
    name: 'Postgraduate Masters Degree Assessment',
    subject_name: 'Advanced Machine Learning Theory',
    subject_code: 'AI501',
    exam_date: '2026-12-02',
    session: 'morning',
    batches: ['AIML-S3A'],
    halls: ['LH-102'],
    total_candidates: 20,
    status: 'published',
  },
];

const AVAILABLE_BATCHES = ['AIML-S3A', 'CSE-GEN-S3B', 'AIDE-S3A', 'CSBS-S5A', 'CTIS-S5A', 'CyberSecurity-S5A'];
const AVAILABLE_HALLS = ['LH-101', 'LH-102', 'EXAM-HALL-MAIN', 'LH-201'];

export const ExamManagementPage: React.FC = () => {
  const { role } = useAuth();
  const isStaff = role === 'admin' || role === 'exam_staff';

  const [exams, setExams] = useState<ExamRecord[]>(INITIAL_EXAMS);
  const [batchesList, setBatchesList] = useState<string[]>(AVAILABLE_BATCHES);
  const [hallsList, setHallsList] = useState<string[]>(AVAILABLE_HALLS);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'allocated' | 'published' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    subject_name: '',
    subject_code: '',
    exam_date: '2026-11-20',
    session: 'morning' as 'morning' | 'afternoon',
    batches: ['AIML-S3A', 'CSE-GEN-S3B'],
    halls: ['LH-101'],
    status: 'draft' as 'draft' | 'allocated' | 'published' | 'archived',
  });

  // Load Real Supabase Data
  useEffect(() => {
    api.getExams()
      .then((data) => {
        if (data && data.length > 0) {
          const mapped: ExamRecord[] = data.map((e: any) => ({
            id: e.id,
            name: e.name,
            subject_name: e.subject_name || (e.name.includes('-') ? e.name.split('-')[1]?.trim() : ''),
            subject_code: e.subject_code || '',
            exam_date: e.exam_date,
            session: e.session === 'AN' ? 'afternoon' : 'morning',
            batches: ['AIML-S3A', 'CSE-GEN-S3B'],
            halls: ['LH-101', 'LH-102'],
            total_candidates: e.batch_count ? e.batch_count * 25 : 50,
            status: e.status || 'draft',
          }));
          setExams(mapped);
        }
      })
      .catch(() => {});

    api.getBatches()
      .then((data) => {
        if (data && data.length > 0) {
          const bNames = data.map((b: any) => `${b.programs?.code || 'JU'}-S${b.semester}${b.section}`);
          setBatchesList(Array.from(new Set([...bNames, ...AVAILABLE_BATCHES])));
        }
      })
      .catch(() => {});

    api.getRooms()
      .then((data) => {
        if (data && data.length > 0) {
          const hNames = data.map((r: any) => r.code || r.name);
          setHallsList(Array.from(new Set([...hNames, ...AVAILABLE_HALLS])));
        }
      })
      .catch(() => {});
  }, []);

  // Hall Booking Conflict Detection
  const hallConflicts = useMemo(() => {
    const conflicts: { hall: string; examName: string; examId: string }[] = [];
    if (!formData.exam_date || !formData.session) return conflicts;

    exams.forEach((ex) => {
      if (editingExamId && ex.id === editingExamId) return;
      if (ex.status === 'archived') return;

      if (ex.exam_date === formData.exam_date && ex.session === formData.session) {
        ex.halls.forEach((h) => {
          if (formData.halls.includes(h)) {
            conflicts.push({ hall: h, examName: ex.name, examId: ex.id });
          }
        });
      }
    });
    return conflicts;
  }, [formData.exam_date, formData.session, formData.halls, editingExamId, exams]);

  // Open Create
  const handleOpenCreate = () => {
    setEditingExamId(null);
    setFormData({
      name: '',
      subject_name: '',
      subject_code: '',
      exam_date: '2026-11-20',
      session: 'morning',
      batches: ['AIML-S3A', 'CSE-GEN-S3B'],
      halls: ['LH-101'],
      status: 'draft',
    });
    setErrorMessage(null);
    setShowModal(true);
  };

  // Open Edit
  const handleOpenEdit = (exam: ExamRecord) => {
    setEditingExamId(exam.id);
    setFormData({
      name: exam.name,
      subject_name: exam.subject_name || '',
      subject_code: exam.subject_code || '',
      exam_date: exam.exam_date,
      session: exam.session,
      batches: [...exam.batches],
      halls: [...exam.halls],
      status: exam.status,
    });
    setErrorMessage(null);
    setShowModal(true);
  };

  // Toggle Batch Selection in Form
  const toggleBatch = (bName: string) => {
    if (formData.batches.includes(bName)) {
      if (formData.batches.length === 1) {
        setErrorMessage('An examination requires at least one participating batch.');
        return;
      }
      setFormData({ ...formData, batches: formData.batches.filter((b) => b !== bName) });
    } else {
      setFormData({ ...formData, batches: [...formData.batches, bName] });
    }
  };

  // Toggle Hall Selection in Form
  const toggleHall = (hName: string) => {
    if (formData.halls.includes(hName)) {
      if (formData.halls.length === 1) {
        setErrorMessage('An examination requires at least one venue hall.');
        return;
      }
      setFormData({ ...formData, halls: formData.halls.filter((h) => h !== hName) });
    } else {
      setFormData({ ...formData, halls: [...formData.halls, hName] });
    }
  };

  // Submit Create or Edit
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('Examination title is required.');
      return;
    }
    if (hallConflicts.length > 0) {
      setErrorMessage(`Cannot save: Hall conflict detected with ${hallConflicts[0].examName} in hall ${hallConflicts[0].hall}.`);
      return;
    }

    if (editingExamId) {
      // Edit mode
      const updatedList = exams.map((ex) => {
        if (ex.id === editingExamId) {
          return {
            ...ex,
            name: formData.name,
            subject_name: formData.subject_name,
            subject_code: formData.subject_code,
            exam_date: formData.exam_date,
            session: formData.session,
            batches: formData.batches,
            halls: formData.halls,
            status: formData.status,
          };
        }
        return ex;
      });
      setExams(updatedList);
      api.updateExam(editingExamId, {
        name: formData.name,
        exam_date: formData.exam_date,
        session: formData.session === 'afternoon' ? 'AN' : 'FN',
        status: formData.status,
      }).catch(() => {});
      setNotification(`Examination "${formData.name}" successfully updated.`);
    } else {
      // Create mode
      const created: ExamRecord = {
        id: `EXAM-${Date.now().toString().slice(-4)}`,
        name: formData.name,
        subject_name: formData.subject_name,
        subject_code: formData.subject_code,
        exam_date: formData.exam_date,
        session: formData.session,
        batches: formData.batches,
        halls: formData.halls,
        total_candidates: formData.batches.length * 20,
        status: 'draft',
      };
      setExams([created, ...exams]);
      api.createExam({
        name: created.name,
        exam_date: created.exam_date,
        session: created.session === 'afternoon' ? 'AN' : 'FN',
        subject_name: formData.subject_name,
        subject_code: formData.subject_code,
      }).catch(() => {});
      setNotification(`Examination "${created.name}" created. You can now configure seating plan.`);
    }

    setShowModal(false);
    setTimeout(() => setNotification(null), 4000);
  };

  // Safe Archive Exam
  const handleArchive = (examId: string, examName: string) => {
    const confirmArchive = window.confirm(`Are you sure you want to archive examination "${examName}"?`);
    if (!confirmArchive) return;

    setExams(exams.map((ex) => (ex.id === examId ? { ...ex, status: 'archived' } : ex)));
    api.archiveExam(examId).catch(() => {});
    setNotification(`Examination "${examName}" archived safely.`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Safe Delete Exam
  const handleDelete = (examId: string, examName: string, status: string) => {
    if (status === 'published') {
      const confirmArch = window.confirm(
        `Examination "${examName}" has published seating charts. Safely archive it instead of hard deletion?`
      );
      if (confirmArch) {
        handleArchive(examId, examName);
      }
      return;
    }

    const confirmDel = window.confirm(`Delete examination "${examName}" permanently? This cannot be undone.`);
    if (!confirmDel) return;

    setExams(exams.filter((ex) => ex.id !== examId));
    api.deleteExam(examId).catch(() => {});
    setNotification(`Examination "${examName}" deleted.`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered examinations list
  const filteredExams = exams.filter((ex) => {
    if (statusFilter !== 'all' && ex.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ex.name.toLowerCase().includes(q) ||
        (ex.subject_name && ex.subject_name.toLowerCase().includes(q)) ||
        ex.id.toLowerCase().includes(q) ||
        ex.halls.some((h) => h.toLowerCase().includes(q)) ||
        ex.batches.some((b) => b.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-primary-600" />
            University Examination Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure examination schedules, participating academic batches, certified halls, and prevent double-bookings.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Examination
          </button>
        )}
      </div>

      {/* Notifications */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {(['all', 'draft', 'allocated', 'published', 'archived'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs rounded-lg font-semibold uppercase tracking-wider transition-all ${
                statusFilter === st
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search exam, subject, hall..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {/* Examinations Directory */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {exam.id}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                    exam.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800'
                      : exam.status === 'allocated'
                      ? 'bg-blue-100 text-blue-800'
                      : exam.status === 'archived'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {exam.status}
                </span>
              </div>

              <h2 className="text-sm font-bold text-slate-800 line-clamp-2">{exam.name}</h2>

              {exam.subject_name && (
                <p className="text-xs text-primary-700 font-semibold mt-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary-500" />
                  {exam.subject_name} {exam.subject_code ? `(${exam.subject_code})` : ''}
                </p>
              )}

              <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{exam.exam_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="capitalize">{exam.session} Session ({exam.session === 'afternoon' ? '01:30 PM – 04:30 PM' : '09:30 AM – 12:30 PM'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <DoorClosed className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-700">{exam.halls.join(', ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-[11px] text-slate-700">{exam.batches.join(' • ')}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Est. Candidates: <strong className="text-slate-800">{exam.total_candidates}</strong>
                </span>
                <Link
                  to={`/seating-planner?exam_id=${exam.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:text-primary-800"
                >
                  Seating Planner <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {isStaff && (
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-50">
                  <button
                    onClick={() => handleOpenEdit(exam)}
                    className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded text-xs flex items-center gap-1"
                    title="Edit Examination"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  {exam.status !== 'archived' && (
                    <button
                      onClick={() => handleArchive(exam.id, exam.name)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded text-xs flex items-center gap-1"
                      title="Safely Archive Examination"
                    >
                      <Archive className="w-3 h-3" />
                      <span>Archive</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(exam.id, exam.name, exam.status)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded text-xs flex items-center gap-1"
                    title="Delete Examination"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {editingExamId ? 'Edit Examination' : 'Create Examination Session'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure session timing, subject, participating academic batches, and exam halls.
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {hallConflicts.length > 0 && (
              <div className="mb-3 p-2.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Hall Conflict Warning:</strong> Hall <em>{hallConflicts[0].hall}</em> is already booked for examination "{hallConflicts[0].examName}" on this date and session.
                </span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700">Exam Title *</label>
                <input
                  required
                  placeholder="e.g. End Semester Theory Exams - December 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Subject Name</label>
                  <input
                    placeholder="e.g. Data Structures & Algorithms"
                    value={formData.subject_name}
                    onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Subject Code</label>
                  <input
                    placeholder="e.g. CS201"
                    value={formData.subject_code}
                    onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Exam Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.exam_date}
                    onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Session *</label>
                  <select
                    value={formData.session}
                    onChange={(e) => setFormData({ ...formData, session: e.target.value as any })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1 bg-white"
                  >
                    <option value="morning">Morning (09:30 AM – 12:30 PM)</option>
                    <option value="afternoon">Afternoon (01:30 PM – 04:30 PM)</option>
                  </select>
                </div>
              </div>

              {/* Participating Batches Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Participating Batches ({formData.batches.length} selected)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                  {batchesList.map((batch) => {
                    const isSelected = formData.batches.includes(batch);
                    return (
                      <button
                        type="button"
                        key={batch}
                        onClick={() => toggleBatch(batch)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all font-mono ${
                          isSelected
                            ? 'bg-primary-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {batch}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Examination Halls Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Examination Venue Halls ({formData.halls.length} selected)
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-lg bg-slate-50">
                  {hallsList.map((hall) => {
                    const isSelected = formData.halls.includes(hall);
                    return (
                      <button
                        type="button"
                        key={hall}
                        onClick={() => toggleHall(hall)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                          isSelected
                            ? 'bg-slate-800 text-white shadow-2xs'
                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <DoorClosed className="w-3 h-3 inline mr-1" />
                        {hall}
                      </button>
                    );
                  })}
                </div>
              </div>

              {editingExamId && (
                <div>
                  <label className="text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1 bg-white uppercase font-semibold"
                  >
                    <option value="draft">Draft</option>
                    <option value="allocated">Allocated</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={hallConflicts.length > 0}
                  className="px-4 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs"
                >
                  {editingExamId ? 'Save Changes' : 'Create Examination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagementPage;
