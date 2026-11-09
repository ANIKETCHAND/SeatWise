import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { api } from '../../services/api';
import { Database, Server, UserCheck, Shield, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [dbConfigured, setDbConfigured] = useState<boolean>(false);

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    api.getHealth()
      .then((res) => {
        setBackendStatus('connected');
        setDbConfigured(Boolean(res.database_configured));
      })
      .catch(() => {
        setBackendStatus('disconnected');
      });
  }, []);

  return (
    <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between shadow-xs sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-base font-bold text-zinc-950 tracking-tight">
            Jain (Deemed-to-be University)
          </h1>
          <p className="text-xs text-zinc-500 font-normal">
            Faculty of Engineering and Technology (FET) Seating Portal
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection status badges */}
        <div className="hidden sm:flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-zinc-100 text-zinc-900 border border-zinc-300"
          >
            <Server className="w-3 h-3 text-zinc-700" />
            Backend: {backendStatus}
          </span>

          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-zinc-100 text-zinc-900 border border-zinc-300"
          >
            <Database className="w-3 h-3 text-zinc-700" />
            Supabase: {dbConfigured ? 'Ready' : 'Dev / Migration Ready'}
          </span>
        </div>

        {/* Authoritative Role Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-800 font-mono">
          <Shield className="w-3.5 h-3.5 text-zinc-600" />
          <span className="capitalize">{role ? role.replace('_', ' ') : 'Guest'}</span>
        </div>

        {/* User preview & Sign Out Action */}
        <div className="flex items-center gap-3 pl-2 border-l border-zinc-200">
          <div className="flex items-center gap-2">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-8 h-8 rounded-full border border-zinc-300 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
                <UserCheck className="w-4 h-4" />
              </div>
            )}
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-zinc-900 leading-tight truncate max-w-[140px]">
                {user?.full_name?.split(' ')[0]}
              </p>
              <p className="text-[10px] text-zinc-500 capitalize">{role.replace('_', ' ')}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-900 hover:text-white bg-white hover:bg-black border border-zinc-300 hover:border-black transition-all cursor-pointer shadow-xs"
            title="Sign out of SeatWise"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
