import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export const LandingFinalCTA: React.FC = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-950 via-blue-950/40 to-slate-950 border-t border-slate-800/80 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Ready to Organize Your Next Examination?
        </h2>
        <p className="max-w-xl mx-auto text-slate-300 text-sm sm:text-base leading-relaxed">
          Create smarter seating arrangements and manage examination halls with SeatWise.
        </p>
        <div className="pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all group"
          >
            <span>Sign In to SeatWise</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};
