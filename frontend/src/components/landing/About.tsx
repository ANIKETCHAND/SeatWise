import React from 'react';
import { Network, Split, GitCommit, Binary, Calculator } from 'lucide-react';

const PRINCIPLES = [
  {
    icon: Binary,
    title: 'Set Theory & Injective Functions',
    desc: 'Each student receives at most one seat (f: S → T is injective), guaranteeing zero duplicate assignments and no silent omissions.',
  },
  {
    icon: Calculator,
    title: 'Pigeonhole Principle',
    desc: 'Strict mathematical proof ensuring that if |S| > |T|, the allocation is flagged as impossible with exact seat deficit figures.',
  },
  {
    icon: Split,
    title: 'Bipartite Graph & Checkerboard',
    desc: 'Seats are modeled as vertices in a bipartite grid. Adjacent horizontal and vertical neighbors satisfy parity coloring (r + c) mod 2.',
  },
  {
    icon: Network,
    title: 'CP-SAT Constraint Satisfaction',
    desc: 'Complex multi-class allocations across multiple halls are solved via Google OR-Tools boolean decision variables with conflict bounds.',
  },
];

export const LandingAbout: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-slate-950 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Text */}
          <div className="space-y-6">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono">
              About SeatWise
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Built to Make Examination Management Simpler
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              SeatWise is designed to simplify one of the most time-consuming parts of examination
              management. By combining intelligent allocation, graph theory, and interactive
              seating layouts, it helps administrators and teachers create organized examination
              seating plans with greater efficiency and confidence.
            </p>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Every arrangement is mathematically proven before publishing — preventing cheat-prone
              adjacency, ensuring fairness, and reducing preparation overhead from days to seconds.
            </p>
          </div>

          {/* Right Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRINCIPLES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-tight">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
