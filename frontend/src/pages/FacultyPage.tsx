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
          <h1 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-zinc-900" />
            Faculty
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Directory of academic faculty, departments, and course assignments.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Faculty
          </button>
        )}
      </div>

      {/* Search Toolbar */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-2xs flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search faculty by name, department, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-zinc-300 rounded-lg"
          />
        </div>
        <span className="text-xs font-semibold text-zinc-500">
          Total: {filteredFaculty.length} Faculty
        </span>
      </div>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFaculty.map((f) => (
          <div
            key={f.id}
            className="bg-white rounded-xl border border-zinc-200 p-5 shadow-2xs hover:border-zinc-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start gap-3.5">
                {f.photo_url ? (
                  <img
                    src={f.photo_url}
                    alt={f.full_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-zinc-100 shadow-2xs shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-zinc-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950 truncate" title={f.full_name}>
                        {f.full_name}
                      </h3>
                      <p className="text-[11px] font-medium text-zinc-700 mt-0.5">
                        {f.designation || 'Faculty Member'}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 mt-0.5">
                        <Building className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="truncate">{f.department}</span>
                      </div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 shrink-0 ml-1 mt-1" title="Active" />
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-zinc-100 space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="truncate">{f.email}</span>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                    <BookOpen className="w-3 h-3 text-zinc-400" />
                    Assigned Subjects:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {f.assigned_subjects?.map((subj, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 font-medium"
                      >
                        {subj}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    setFacultyList(facultyList.filter((item) => item.id !== f.id));
                    showNotification('info', `Faculty ${f.full_name} deactivated.`);
                  }}
                  className="text-zinc-500 hover:text-zinc-950 font-medium cursor-pointer"
                >
                  Deactivate
                </button>
                <span className="text-[10px] text-zinc-400">Timetable Verified</span>
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
            <label className="text-xs font-semibold text-zinc-700">Full Name *</label>
            <input
              required
              placeholder="Dr. Sunita Rao"
              value={newFaculty.full_name}
              onChange={(e) => setNewFaculty({ ...newFaculty, full_name: e.target.value })}
              className="w-full text-xs p-2 border border-zinc-300 rounded-lg mt-1 text-zinc-900 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-700">Email Address</label>
            <input
              type="email"
              placeholder="sunita.rao@jainuniversity.ac.in"
              value={newFaculty.email}
              onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })}
              className="w-full text-xs p-2 border border-zinc-300 rounded-lg mt-1 text-zinc-900 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-700">Department *</label>
            <input
              required
              value={newFaculty.department}
              onChange={(e) => setNewFaculty({ ...newFaculty, department: e.target.value })}
              className="w-full text-xs p-2 border border-zinc-300 rounded-lg mt-1 text-zinc-900 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-700">Assigned Subjects (comma-separated)</label>
            <input
              placeholder="Cloud Computing, Virtualization, DevOps Lab"
              value={newFaculty.assigned_subjects}
              onChange={(e) => setNewFaculty({ ...newFaculty, assigned_subjects: e.target.value })}
              className="w-full text-xs p-2 border border-zinc-300 rounded-lg mt-1 text-zinc-900 bg-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-black hover:bg-zinc-800 text-white font-medium rounded-lg shadow-xs cursor-pointer"
            >
              Save Faculty
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
