import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export const LandingFinalCTA: React.FC = () => {
  return (
    <section className="py-24 bg-zinc-50 border-t border-zinc-200 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-zinc-200/50 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight">
          Ready to Organize Your Next Examination?
        </h2>
        <p className="max-w-xl mx-auto text-zinc-600 text-sm sm:text-base leading-relaxed">
          Create smarter seating arrangements and manage examination halls with SeatWise.
        </p>
        <div className="pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-base shadow-xl shadow-black/10 hover:shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all group border border-black cursor-pointer"
          >
            <span>Sign In to SeatWise</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};
