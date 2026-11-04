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
    <section className="relative min-h-[92vh] flex flex-col justify-between overflow-hidden bg-white pt-28 sm:pt-36">
      {/* Background subtle radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-zinc-100/80 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Full Animated Crowd Canvas Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <CrowdCanvas
          src="/open-peeps-sheet.png"
          rows={15}
          cols={7}
          className="absolute bottom-0 left-0 w-full h-[85vh] pointer-events-none select-none"
        />
      </div>

      {/* Hero Content Layer */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        {/* Intro Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 border border-zinc-300/80 text-zinc-900 text-xs font-semibold tracking-wide uppercase shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
          Smart Examination Management
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-black tracking-tight leading-[1.1]">
          Examination Seating, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600">
            Made Smarter.
          </span>
        </h1>

        {/* Supporting Description */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-600 font-normal leading-relaxed">
          SeatWise simplifies university examination seating with intelligent student allocation,
          interactive classroom layouts, and mathematically validated seating arrangements.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-black hover:bg-zinc-800 text-white font-semibold text-sm shadow-lg shadow-black/10 hover:shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer border border-black"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <button
            onClick={scrollToFeatures}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-sm border border-zinc-300 hover:border-zinc-400 transition-all flex items-center justify-center cursor-pointer shadow-sm"
          >
            Explore Features
          </button>
        </div>

        {/* Trust Statement */}
        <div className="pt-3 flex items-center justify-center gap-2 text-xs text-zinc-600 font-medium">
          <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
          <span>Designed for smarter, faster, and more organized examinations.</span>
        </div>
      </div>

      {/* Spacer to give breathing room for the crowd animation at the base */}
      <div className="h-28 sm:h-36 pointer-events-none" />
    </section>
  );
};
