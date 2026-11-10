import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  CalendarDays,
  Users,
  DoorClosed,
  Armchair,
  FileCheck2,
  Binary,
  Sigma,
  FileSpreadsheet,
  History,
  Settings,
  ShieldCheck,
  Sparkles,
  Search,
  LogOut,
  UserCheck,
  ClipboardCheck,
  UserRound,
  UserPlus,
  KeyRound,
  Sliders,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface NavLinkItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

export const Sidebar: React.FC = () => {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  const getNavLinks = (): { sectionTitle?: string; items: NavLinkItem[] }[] => {
    switch (role) {
      case 'admin':
        return [
          {
            sectionTitle: 'Administration',
            items: [{ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }],
          },
          {
            sectionTitle: 'User Management',
            items: [
              { name: 'All Users', path: '/admin/users', icon: Users },
              { name: 'Administrators', path: '/admin/users?role=admin', icon: ShieldCheck },
              { name: 'Exam Staff', path: '/admin/users?role=exam_staff', icon: ClipboardCheck },
              { name: 'Faculty', path: '/admin/users?role=faculty', icon: GraduationCap },
              { name: 'Students', path: '/admin/users?role=student', icon: UserRound },
              { name: 'Add User', path: '/admin/users?action=create', icon: UserPlus },
              { name: 'Passwords', path: '/admin/users?action=passwords', icon: KeyRound },
              { name: 'Permissions', path: '/admin/users?tab=permissions', icon: Sliders },
              { name: 'Audit Logs', path: '/admin/audit-logs', icon: History },
            ],
          },
          {
            sectionTitle: 'Examinations',
            items: [
              { name: 'Examinations', path: '/examinations', icon: FileCheck2 },
              { name: 'Seating Planner', path: '/seating-planner', icon: Binary },
              { name: 'Halls & Rooms', path: '/rooms', icon: DoorClosed },
              { name: 'Students', path: '/students', icon: Users },
            ],
          },
          {
            sectionTitle: 'Curriculum',
            items: [
              { name: 'Programs & Batches', path: '/university', icon: GraduationCap },
              { name: 'Timetable', path: '/timetable', icon: CalendarDays },
              { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
            ],
          },
          {
            sectionTitle: 'System',
            items: [
              { name: 'Algorithm Analysis', path: '/math-analysis', icon: Sigma },
              { name: 'Seating History', path: '/history', icon: History },
              { name: 'Settings', path: '/settings', icon: Settings },
            ],
          },
        ];

      case 'exam_staff':
        return [
          {
            sectionTitle: 'Operations',
            items: [
              { name: 'Dashboard', path: '/exam-dashboard', icon: LayoutDashboard },
              { name: 'Examinations', path: '/examinations', icon: FileCheck2 },
              { name: 'Seating Planner', path: '/seating-planner', icon: Binary },
              { name: 'Halls & Rooms', path: '/rooms', icon: DoorClosed },
              { name: 'Students', path: '/students', icon: Users },
              { name: 'Timetable', path: '/timetable', icon: CalendarDays },
              { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
              { name: 'Seating History', path: '/history', icon: History },
            ],
          },
        ];

      case 'faculty':
        return [
          {
            sectionTitle: 'Faculty Portal',
            items: [
              { name: 'Dashboard', path: '/faculty-dashboard', icon: LayoutDashboard },
              { name: 'Timetable', path: '/timetable', icon: CalendarDays },
              { name: 'Classroom Seating', path: '/classroom-seating', icon: Armchair },
              { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
            ],
          },
        ];

      case 'student':
        return [
          {
            sectionTitle: 'Student Portal',
            items: [
              { name: 'Dashboard', path: '/student-dashboard', icon: LayoutDashboard },
              { name: "Today's Exams", path: '/student/examinations', icon: Clock },
              { name: 'Find Seat', path: '/student/seat-lookup', icon: Armchair },
              { name: 'Exam History', path: '/student/history', icon: History },
            ],
          },
        ];

      default:
        return [
          {
            items: [{ name: 'Sign In', path: '/login', icon: LayoutDashboard }],
          },
        ];
    }
  };

  const sections = getNavLinks();

  return (
    <aside className="w-64 bg-zinc-950 text-zinc-300 flex flex-col shrink-0 min-h-screen border-r border-zinc-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-zinc-800/80 gap-3 bg-black">
        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-black shadow-sm group-hover:scale-105 transition-transform">
          <Sparkles className="w-5 h-5 text-black" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-base">
            SeatWise
            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono">
              JU
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-medium truncate max-w-[150px]">
            Jain University Seating
          </p>
        </div>
      </div>

      {/* Role Pill */}
      <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {role === 'admin' ? (
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" />
          ) : role === 'exam_staff' ? (
            <ClipboardCheck className="w-3.5 h-3.5 text-zinc-300" />
          ) : role === 'faculty' ? (
            <GraduationCap className="w-3.5 h-3.5 text-zinc-300" />
          ) : (
            <UserRound className="w-3.5 h-3.5 text-zinc-300" />
          )}
          <span className="text-xs uppercase tracking-wider font-semibold text-zinc-200 font-mono">
            {role ? role.replace('_', ' ') : 'Guest'}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 font-mono font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Authenticated
        </span>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {section.sectionTitle && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold px-3 block mb-1">
                {section.sectionTitle}
              </span>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-white text-black font-semibold shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Profile & Sign Out */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/40 space-y-2">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Authenticated User'}</p>
            <p className="text-[10px] text-zinc-400 truncate">{user?.email || 'Jain University'}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-all cursor-pointer"
          title="Sign out and return to landing page"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
