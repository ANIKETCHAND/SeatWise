import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  CalendarDays,
  Users,
  Briefcase,
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  staffOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Examinations', path: '/examinations', icon: FileCheck2, staffOnly: true },
  { name: 'Seating Planner', path: '/seating-planner', icon: Binary, staffOnly: true },
  { name: 'Classrooms & Halls', path: '/rooms', icon: DoorClosed, staffOnly: true },
  { name: 'Student Management', path: '/students', icon: Users, staffOnly: true },
  { name: 'Programs & Batches', path: '/university', icon: GraduationCap, adminOnly: true },
  { name: 'Timetable', path: '/timetable', icon: CalendarDays },
  { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
  { name: 'Student Seat Lookup', path: '/seat-lookup', icon: Search },
  { name: 'Mathematical Analysis', path: '/math-analysis', icon: Sigma },
  { name: 'Seating History', path: '/history', icon: History },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3 bg-slate-950/40">
        <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white shadow-md shadow-primary-600/30">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-base">
            SeatWise
            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400 border border-primary-500/30">
              JU
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium truncate max-w-[150px]">
            Jain University Seating
          </p>
        </div>
      </div>

      {/* Role Pill */}
      <div className="px-4 py-2.5 bg-slate-800/40 border-b border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-500" />
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
            {role.replace('_', ' ')}
          </span>
        </div>
        <span className="text-[10px] text-emerald-400 font-mono font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          // Hide admin/staff only routes for student if strict, but let's show with indicator or allow access
          const isPermitted =
            !item.adminOnly || role === 'admin'
              ? !item.staffOnly || role === 'admin' || role === 'exam_staff' || role === 'faculty'
              : false;

          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                } ${!isPermitted ? 'opacity-40 hover:opacity-75' : ''}`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile & Sign Out */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-xs text-primary-300 uppercase shrink-0">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || 'Guest User'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email || 'Authenticated Portal'}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 transition-all cursor-pointer"
          title="Sign out and return to landing page"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
