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
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs uppercase tracking-wider font-semibold text-zinc-300 font-mono">
            {role.replace('_', ' ')}
          </span>
        </div>
        <span className="text-[10px] text-zinc-300 font-mono font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Live
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
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
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
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
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/40 space-y-2">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Guest User'}</p>
            <p className="text-[10px] text-zinc-400 truncate">{user?.email || 'Authenticated Portal'}</p>
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
