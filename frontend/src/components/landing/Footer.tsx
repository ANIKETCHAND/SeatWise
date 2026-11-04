import React from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-white border-t border-zinc-200 py-12 text-zinc-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo & Description */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-900 tracking-tight">SeatWise</span>
              <p className="text-[11px] text-zinc-500">Smart Examination Seating Management System</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-600 font-medium">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-black transition-colors"
            >
              Home
            </button>
            <a href="#features" className="hover:text-black transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-black transition-colors">
              How It Works
            </a>
            <Link to="/dashboard" className="text-zinc-900 hover:text-black font-semibold transition-colors">
              Sign In
            </Link>
          </div>
        </div>

        {/* Legal & Attribution */}
        <div className="mt-8 pt-6 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-500 text-[11px]">
          <p>© {new Date().getFullYear()} SeatWise. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Animated crowd powered by{' '}
            <span className="text-zinc-800 font-medium">Skiper UI (Skiper39)</span> & Open Peeps by Pablo Stanley.
          </p>
        </div>
      </div>
    </footer>
  );
};
