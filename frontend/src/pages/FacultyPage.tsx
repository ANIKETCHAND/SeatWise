import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Mail,
  BookOpen,
  Building,
  CheckCircle,
  User,
} from 'lucide-react';
import { Faculty } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Modal } from '../components/common/Modal';
import { api } from '../services/api';
import cseFacultyData from '../data/cse_faculty_data.json';

const INITIAL_FACULTY: Faculty[] = (cseFacultyData as any[]).map((f) => ({
  id: f.id,
  full_name: f.full_name,
  email: f.email,
  department: f.department,
  designation: f.designation,
  photo_url: f.photo_url,
  assigned_subjects: f.assigned_subjects || ['Computer Networks', 'Cloud Computing & DevOps', 'Database Systems'],
  is_active: true,
}));

export const FacultyPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { showNotification } = useNotification();
  const [facultyList, setFacultyList] = useState<Faculty[]>(INITIAL_FACULTY);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFaculty, setNewFaculty] = useState({
    full_name: '',
    email: '',
    department: 'Computer Science and Engineering',
    assigned_subjects: '',
  });

  useEffect(() => {
    api.getFaculty()
      .then((data) => {
        if (data && data.length > 0) {
          setFacultyList(data);
        }
      })
      .catch(() => {});
  }, []);

  const filteredFaculty = facultyList.filter((f) => {
    const q = search.toLowerCase();
    return (
      f.full_name.toLowerCase().includes(q) ||
      (f.email && f.email.toLowerCase().includes(q)) ||
      (f.department && f.department.toLowerCase().includes(q)) ||
      (f.assigned_subjects && f.assigned_subjects.some((s) => s.toLowerCase().includes(q)))
    );
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Faculty = {
      id: `fac-${Date.now()}`,
      full_name: newFaculty.full_name,
      email: newFaculty.email || `${newFaculty.full_name.toLowerCase().replace(' ', '.')}@jainuniversity.ac.in`,
      department: newFaculty.department,
      assigned_subjects: newFaculty.assigned_subjects.split(',').map((s) => s.trim()).filter(Boolean),
      is_active: true,
    };
    setFacultyList([created, ...facultyList]);
    setShowAddModal(false);
    setNewFaculty({ full_name: '', email: '', department: 'Computer Science and Engineering', assigned_subjects: '' });

    api.createFaculty({
      full_name: created.full_name,
      email: created.email,
      department: created.department,
    })
      .then(() => {
        showNotification('success', `Faculty member ${created.full_name} registered successfully.`);
      })
      .catch((err: any) => {
        showNotification('warning', `Local faculty created (${err.message || 'Database sync failed'})`);
      });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-600" />
            Faculty Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Teaching staff, department appointments, and assigned courses catalog (207 faculty members identified).
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Faculty
          </button>
        )}
      </div>

      {/* Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search faculty by name, department, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Total Directory: {filteredFaculty.length} Faculty
        </span>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFaculty.map((f) => (
          <div
            key={f.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start gap-3.5">
                {f.photo_url ? (
                  <img
                    src={f.photo_url}
                    alt={f.full_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 shadow-xs shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 truncate" title={f.full_name}>
                        {f.full_name}
                      </h3>
                      <p className="text-[11px] font-medium text-primary-600 mt-0.5">
                        {f.designation || 'Faculty Member'}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{f.department}</span>
                      </div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ml-1 mt-1" title="Active" />
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{f.email}</span>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    <BookOpen className="w-3 h-3 text-slate-400" />
                    Assigned Subjects:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {f.assigned_subjects?.map((subj, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                      >
                        {subj}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    setFacultyList(facultyList.filter((item) => item.id !== f.id));
                    showNotification('info', `Faculty ${f.full_name} deactivated.`);
                  }}
                  className="text-slate-500 hover:text-rose-600 font-medium"
                >
                  Deactivate
                </button>
                <span className="text-[10px] text-slate-400">Timetable Verified</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Faculty Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Faculty Member"
        description="Register an instructor into the university department."
        maxWidth="md"
      >
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700">Full Name *</label>
            <input
              required
              placeholder="Dr. Sunita Rao"
              value={newFaculty.full_name}
              onChange={(e) => setNewFaculty({ ...newFaculty, full_name: e.target.value })}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Email Address</label>
            <input
              type="email"
              placeholder="sunita.rao@jainuniversity.ac.in"
              value={newFaculty.email}
              onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Department *</label>
            <input
              required
              value={newFaculty.department}
              onChange={(e) => setNewFaculty({ ...newFaculty, department: e.target.value })}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Assigned Subjects (comma-separated)</label>
            <input
              placeholder="Cloud Computing, Virtualization, DevOps Lab"
              value={newFaculty.assigned_subjects}
              onChange={(e) => setNewFaculty({ ...newFaculty, assigned_subjects: e.target.value })}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg shadow-xs"
            >
              Save Faculty
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
