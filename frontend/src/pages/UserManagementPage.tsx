import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  ClipboardCheck,
  GraduationCap,
  UserRound,
  UserPlus,
  KeyRound,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Lock,
  RefreshCw,
  Power,
  ShieldAlert,
  Sliders,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { AdminUser, UserRole } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const UserManagementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'admin' | 'exam_staff' | 'faculty' | 'student' | 'permissions'>('all');
  const [rolePermissionsMatrix, setRolePermissionsMatrix] = useState<Record<string, string[]>>({});

  // Feedback states
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Temporary password display modal (shown once after create/reset)
  const [revealedCreds, setRevealedCreds] = useState<{ email: string; tempPass: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Create form state
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [newDepartment, setNewDepartment] = useState('');
  const [newRollNumber, setNewRollNumber] = useState('');
  const [newSemester, setNewSemester] = useState<number>(1);
  const [newSection, setNewSection] = useState('A');
  const [newAssignedSubjects, setNewAssignedSubjects] = useState('');
  const [newAccountStatus, setNewAccountStatus] = useState<'active' | 'deactivated'>('active');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [newMustChange, setNewMustChange] = useState(true);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Reset form state
  const [resetPassValue, setResetPassValue] = useState('');
  const [resetMustChange, setResetMustChange] = useState(true);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // User permissions modal state
  const [userEffectivePerms, setUserEffectivePerms] = useState<string[]>([]);
  const [selectedCustomPerms, setSelectedCustomPerms] = useState<string[]>([]);
  const [permSaving, setPermSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await api.getUsers({
        role: activeTab === 'all' || activeTab === 'permissions' ? undefined : activeTab,
        search: searchQuery || undefined,
      });
      setUsers(res.users || []);
      setCounts(res.counts || {});
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleMatrix = async () => {
    try {
      const res = await api.getRolePermissionsMatrix();
      if (res?.roles) {
        setRolePermissionsMatrix(res.roles);
      }
    } catch {}
  };

  useEffect(() => {
    const roleParam = searchParams.get('role');
    const tabParam = searchParams.get('tab');
    const actionParam = searchParams.get('action');

    if (tabParam === 'permissions') {
      setActiveTab('permissions');
    } else if (roleParam && ['admin', 'exam_staff', 'faculty', 'student'].includes(roleParam)) {
      setActiveTab(roleParam as any);
    } else if (roleParam === 'all') {
      setActiveTab('all');
    }

    if (actionParam === 'create') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchUsers();
    fetchRoleMatrix();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const generateSecurePassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 12) {
      setActionError('Password must be at least 12 characters.');
      return;
    }
    if (newPassword !== newConfirmPassword) {
      setActionError('Passwords do not match.');
      return;
    }

    setCreateSubmitting(true);
    setActionError(null);

    try {
      await api.createUser({
        full_name: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        username: newUsername.trim() || undefined,
        role: newRole,
        password: newPassword,
        department: newDepartment.trim() || undefined,
        roll_number: newRole === 'student' ? newRollNumber.trim() : undefined,
        semester: newRole === 'student' ? newSemester : undefined,
        section: newRole === 'student' ? newSection.trim() : undefined,
        assigned_subjects: newAssignedSubjects
          ? newAssignedSubjects.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        account_status: newAccountStatus,
        must_change_password: newMustChange,
      });

      // Show temporary credentials once
      setRevealedCreds({ email: newEmail.trim().toLowerCase(), tempPass: newPassword });
      setShowCreateModal(false);
      resetCreateForm();
      setActionSuccess(`Account for ${newFullName} provisioned successfully.`);
      fetchUsers();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create user account.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setNewFullName('');
    setNewEmail('');
    setNewUsername('');
    setNewRole('student');
    setNewDepartment('');
    setNewRollNumber('');
    setNewSemester(1);
    setNewSection('A');
    setNewAssignedSubjects('');
    setNewAccountStatus('active');
    setNewPassword('');
    setNewConfirmPassword('');
    setNewMustChange(true);
  };

  const handleOpenResetModal = (u: AdminUser) => {
    setSelectedUser(u);
    const generated = generateSecurePassword();
    setResetPassValue(generated);
    setResetMustChange(true);
    setShowResetModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (resetPassValue.length < 12) {
      setActionError('Password must be at least 12 characters.');
      return;
    }

    setResetSubmitting(true);
    try {
      await api.resetPassword(selectedUser.id, resetPassValue, resetMustChange);
      setRevealedCreds({ email: selectedUser.email || selectedUser.full_name, tempPass: resetPassValue });
      setShowResetModal(false);
      setActionSuccess(`Password reset successfully for ${selectedUser.full_name}.`);
      fetchUsers();
    } catch (err: any) {
      setActionError(err.message || 'Password reset failed.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleToggleDeactivate = async (u: AdminUser) => {
    const isCurrentlyActive = u.account_status === 'active';
    const action = isCurrentlyActive ? 'deactivate' : 'reactivate';

    if (!window.confirm(`Are you sure you want to ${action} ${u.full_name}'s account?`)) {
      return;
    }

    try {
      if (isCurrentlyActive) {
        await api.deactivateUser(u.id);
        setActionSuccess(`Account ${u.full_name} deactivated.`);
      } else {
        await api.reactivateUser(u.id);
        setActionSuccess(`Account ${u.full_name} reactivated.`);
      }
      fetchUsers();
    } catch (err: any) {
      setActionError(err.message || `Failed to ${action} user.`);
    }
  };

  const handleOpenPermissionsModal = async (u: AdminUser) => {
    setSelectedUser(u);
    setShowPermissionsModal(true);
    try {
      const data = await api.getUserPermissions(u.id);
      setSelectedCustomPerms(data.custom_granted_permissions || []);
      setUserEffectivePerms(data.effective_permissions || []);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load user permissions.');
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setPermSaving(true);
    try {
      await api.updateUserPermissions(selectedUser.id, selectedCustomPerms);
      setActionSuccess(`Custom permissions updated for ${selectedUser.full_name}.`);
      setShowPermissionsModal(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save permissions.');
    } finally {
      setPermSaving(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!revealedCreds) return;
    const text = `SeatWise Credentials\nEmail: ${revealedCreds.email}\nTemporary Password: ${revealedCreds.tempPass}\nPortal: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const ALL_POSSIBLE_PERMISSIONS = [
    'dashboard.view',
    'examinations.view',
    'examinations.create',
    'examinations.update',
    'examinations.archive',
    'rooms.view',
    'rooms.manage',
    'seating.generate',
    'seating.modify',
    'seating.validate',
    'seating.publish',
    'students.view',
    'students.create',
    'students.update',
    'students.import',
    'timetable.view',
    'timetable.create',
    'timetable.update',
    'attendance.manage',
    'reports.view',
    'reports.export',
    'settings.manage',
    'audit_logs.view',
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono border border-zinc-200 mb-1">
              <ShieldCheck className="w-3 h-3 text-black" />
              Administrator Control Center
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">
              User & Access Management
            </h1>
            <p className="text-xs text-zinc-500">
              Manage all campus user roles, provision credentials, enforce password resets, and configure RBAC policies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetCreateForm();
              setNewPassword(generateSecurePassword());
              setNewConfirmPassword('');
              setShowCreateModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-[10px] font-semibold text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-[10px] font-semibold text-red-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Revealed Credentials Modal (One-time secure view) */}
      {revealedCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2 text-zinc-950 font-bold text-sm">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                Temporary Access Credentials Generated
              </div>
              <button
                onClick={() => setRevealedCreds(null)}
                className="text-xs text-zinc-400 hover:text-black font-semibold"
              >
                Close
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs">
              <p className="font-semibold">Deliver these temporary credentials securely.</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                For security reasons, plaintext passwords are never stored in the database and cannot be retrieved again.
              </p>
            </div>

            <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200 font-mono text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">
                  Account Identifier / Email:
                </span>
                <span className="text-zinc-900 font-semibold">{revealedCreds.email}</span>
              </div>
              <div className="pt-2">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">
                  Temporary Password:
                </span>
                <span className="text-black font-bold text-sm bg-white px-2.5 py-1 rounded border border-zinc-300 inline-block mt-0.5 select-all">
                  {revealedCreds.tempPass}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Credentials'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'all' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
          >
            <span>All Users</span>
            <span className="text-[10px] font-mono opacity-80">({counts.total ?? users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'admin' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrators</span>
            <span className="text-[10px] font-mono opacity-80">({counts.admin ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('exam_staff')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'exam_staff' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Exam Staff</span>
            <span className="text-[10px] font-mono opacity-80">({counts.exam_staff ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('faculty')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'faculty' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Faculty</span>
            <span className="text-[10px] font-mono opacity-80">({counts.faculty ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('student')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'student' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
          >
            <UserRound className="w-3.5 h-3.5" />
            <span>Students</span>
            <span className="text-[10px] font-mono opacity-80">({counts.student ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'permissions' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Role & Permissions Matrix</span>
          </button>
        </div>

        {/* Search */}
        {activeTab !== 'permissions' && (
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, dept..."
                className="pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-black w-56"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold cursor-pointer"
            >
              Search
            </button>
          </form>
        )}
      </div>

      {/* TAB: ROLE & PERMISSION MATRIX */}
      {activeTab === 'permissions' ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-black" />
              RBAC Role & Permission Matrix
            </h3>
            <p className="text-xs text-zinc-500">
              Institutional default permissions assigned to each user role. Custom permissions may be granted per staff/faculty member.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3">Permission Key</th>
                  <th className="py-2.5 px-3 text-center">Administrator</th>
                  <th className="py-2.5 px-3 text-center">Exam Staff</th>
                  <th className="py-2.5 px-3 text-center">Faculty</th>
                  <th className="py-2.5 px-3 text-center">Student</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                {ALL_POSSIBLE_PERMISSIONS.map((perm) => {
                  const hasAdmin = true;
                  const hasExamStaff = rolePermissionsMatrix.exam_staff?.includes(perm) ?? false;
                  const hasFaculty = rolePermissionsMatrix.faculty?.includes(perm) ?? false;
                  const hasStudent = rolePermissionsMatrix.student?.includes(perm) ?? false;

                  return (
                    <tr key={perm} className="hover:bg-zinc-50/80">
                      <td className="py-2 px-3 font-semibold text-zinc-800">{perm}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold leading-4">
                          ✓
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {hasExamStaff ? (
                          <span className="inline-block w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold leading-4">
                            ✓
                          </span>
                        ) : (
                          <span className="text-zinc-300 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {hasFaculty ? (
                          <span className="inline-block w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold leading-4">
                            ✓
                          </span>
                        ) : (
                          <span className="text-zinc-300 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {hasStudent ? (
                          <span className="inline-block w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold leading-4">
                            ✓
                          </span>
                        ) : (
                          <span className="text-zinc-300 font-bold">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB: USER DIRECTORY TABLE */
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <LoadingSpinner size="md" />
              <p className="text-xs text-zinc-500 font-mono mt-2">Loading user directory...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500">
              No users found matching current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-mono text-[10px] uppercase">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Department / Scope</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Password State</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {users.map((u) => {
                    const isActive = u.account_status === 'active';
                    return (
                      <tr key={u.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-950">{u.full_name}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">{u.email || 'No email registered'}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                              u.role === 'admin'
                                ? 'bg-black text-white'
                                : u.role === 'exam_staff'
                                ? 'bg-zinc-800 text-white'
                                : u.role === 'faculty'
                                ? 'bg-zinc-200 text-zinc-800'
                                : 'bg-zinc-100 text-zinc-700 border border-zinc-300'
                            }`}
                          >
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-zinc-600">{u.department || 'General'}</td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-red-600'}`}
                            />
                            {u.account_status}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {u.must_change_password ? (
                            <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Requires Setup
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-zinc-400">Normal</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenResetModal(u)}
                              className="px-2.5 py-1 rounded-lg border border-zinc-200 hover:border-black text-[11px] font-semibold text-zinc-700 hover:text-black transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              Reset
                            </button>

                            {(u.role === 'exam_staff' || u.role === 'faculty') && (
                              <button
                                onClick={() => handleOpenPermissionsModal(u)}
                                className="px-2.5 py-1 rounded-lg border border-zinc-200 hover:border-black text-[11px] font-semibold text-zinc-700 hover:text-black transition-colors cursor-pointer"
                                title="Custom Permissions"
                              >
                                Perms
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleDeactivate(u)}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                                isActive
                                  ? 'border-zinc-200 hover:border-red-400 text-zinc-600 hover:text-red-700'
                                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={isActive ? 'Deactivate Account' : 'Reactivate Account'}
                            >
                              {isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE USER */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-zinc-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-black" />
                Provision New Institutional Account
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-zinc-400 hover:text-black font-semibold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Role selection */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Account Role</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['admin', 'exam_staff', 'faculty', 'student'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewRole(r)}
                      className={`p-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                        newRole === r
                          ? 'border-black bg-black text-white shadow-xs'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Prof. / Dr. / Candidate Name"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="username@jainuniversity.ac.in"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Department / Branch</label>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">
                    Assigned Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. aniket or exam.officer"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-mono focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">
                    Account Status
                  </label>
                  <select
                    value={newAccountStatus}
                    onChange={(e) => setNewAccountStatus(e.target.value as 'active' | 'deactivated')}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs focus:ring-1 focus:ring-black"
                  >
                    <option value="active">Active (Access permitted)</option>
                    <option value="deactivated">Deactivated (Access revoked)</option>
                  </select>
                </div>
              </div>

              {/* Faculty / Exam Staff specific fields */}
              {(newRole === 'faculty' || newRole === 'exam_staff') && (
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">
                    Assigned Subjects / Courses (Where applicable, comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newAssignedSubjects}
                    onChange={(e) => setNewAssignedSubjects(e.target.value)}
                    placeholder="e.g. 23CSE401, 23CSE402, 23AIML501"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs focus:ring-1 focus:ring-black"
                  />
                </div>
              )}

              {/* Student specific fields */}
              {newRole === 'student' && (
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block mb-1">USN / Roll Number</label>
                    <input
                      type="text"
                      required
                      value={newRollNumber}
                      onChange={(e) => setNewRollNumber(e.target.value)}
                      placeholder="e.g. 23JU0102"
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block mb-1">Semester</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newSemester}
                      onChange={(e) => setNewSemester(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block mb-1">Section</label>
                    <input
                      type="text"
                      value={newSection}
                      onChange={(e) => setNewSection(e.target.value)}
                      placeholder="A"
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Password setup */}
              <div className="space-y-2 border-t border-zinc-100 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700">Initial Temporary Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const p = generateSecurePassword();
                      setNewPassword(p);
                      setNewConfirmPassword(p);
                    }}
                    className="text-[11px] font-semibold text-zinc-600 hover:text-black underline cursor-pointer"
                  >
                    Generate Strong Password
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 12 characters"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-mono"
                  />
                  <input
                    type="password"
                    required
                    value={newConfirmPassword}
                    onChange={(e) => setNewConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-mono"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={newMustChange}
                    onChange={(e) => setNewMustChange(e.target.checked)}
                    className="rounded border-zinc-300 text-black focus:ring-black"
                  />
                  Require password change upon initial login
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {createSubmitting ? 'Provisioning Account...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-black" />
                Reset Password
              </h3>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-xs text-zinc-400 hover:text-black font-semibold"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Generating new password for <span className="font-semibold text-zinc-900">{selectedUser.full_name}</span>.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-zinc-700">New Password (Min 12)</label>
                  <button
                    type="button"
                    onClick={() => setResetPassValue(generateSecurePassword())}
                    className="text-[10px] text-zinc-500 hover:text-black underline cursor-pointer"
                  >
                    Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={resetPassValue}
                  onChange={(e) => setResetPassValue(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-mono select-all"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetMustChange}
                  onChange={(e) => setResetMustChange(e.target.checked)}
                  className="rounded border-zinc-300 text-black"
                />
                Require password change on next login
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="w-full py-2 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {resetSubmitting ? 'Resetting...' : 'Confirm Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOM PERMISSIONS */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-zinc-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-black" />
                  Grant Custom RBAC Permissions
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Assign granular permission overrides for {selectedUser.full_name} ({selectedUser.role}).
                </p>
              </div>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="text-xs text-zinc-400 hover:text-black font-semibold"
              >
                Close
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-zinc-100">
              {ALL_POSSIBLE_PERMISSIONS.map((perm) => {
                const isSelected = selectedCustomPerms.includes(perm);
                return (
                  <label
                    key={perm}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-50 cursor-pointer text-xs"
                  >
                    <span className="font-mono text-zinc-800">{perm}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCustomPerms([...selectedCustomPerms, perm]);
                        } else {
                          setSelectedCustomPerms(selectedCustomPerms.filter((p) => p !== perm));
                        }
                      }}
                      className="rounded border-zinc-300 text-black focus:ring-black"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={permSaving}
                className="px-5 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {permSaving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
