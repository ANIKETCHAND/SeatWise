import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { CrowdCanvas } from '../ui/skiper39';

export const LandingHero: React.FC = () => {
  const scrollToFeatures = () => {
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[92vh] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-slate-950 via-[#0d1629] to-[#0a1120] pt-28 sm:pt-36">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Full Animated Crowd Canvas Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <CrowdCanvas
          src="/open-peeps-sheet.png"
          rows={15}
          cols={7}
          className="absolute bottom-0 left-0 w-full h-[85vh] pointer-events-none opacity-45 invert brightness-125 select-none"
        />
        {/* Subtle bottom fade to blend smoothly into the next section */}
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none" />
      </div>

      {/* Hero Content Layer */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        {/* Intro Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/25 text-blue-300 text-xs font-semibold tracking-wide uppercase shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          Smart Examination Management
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
          Examination Seating, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300">
            Made Smarter.
          </span>
        </h1>

        {/* Supporting Description */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
          SeatWise simplifies university examination seating with intelligent student allocation,
          interactive classroom layouts, and mathematically validated seating arrangements.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <button
            onClick={scrollToFeatures}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white font-semibold text-sm border border-slate-700/80 transition-all flex items-center justify-center cursor-pointer shadow-sm"
          >
            Explore Features
          </button>
        </div>

        {/* Trust Statement */}
        <div className="pt-3 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Designed for smarter, faster, and more organized examinations.</span>
        </div>
      </div>

      {/* Spacer to give breathing room for the crowd animation at the base */}
      <div className="h-28 sm:h-36 pointer-events-none" />
    </section>
  );
};
