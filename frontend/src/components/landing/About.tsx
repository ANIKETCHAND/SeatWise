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
    <section id="about" className="py-24 bg-white border-t border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Text */}
          <div className="space-y-6">
            <span className="text-xs font-bold text-zinc-900 uppercase tracking-widest font-mono">
              About SeatWise
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight leading-tight">
              Built to Make Examination Management Simpler
            </h2>
            <p className="text-zinc-600 text-sm sm:text-base leading-relaxed">
              SeatWise is designed to simplify one of the most time-consuming parts of examination
              management. By combining intelligent allocation, graph theory, and interactive
              seating layouts, it helps administrators and teachers create organized examination
              seating plans with greater efficiency and confidence.
            </p>
            <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed">
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
                  className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3 hover:border-zinc-400 transition-colors shadow-sm"
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-200/80 border border-zinc-300/80 flex items-center justify-center text-zinc-900">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-950 tracking-tight">{item.title}</h4>
                  <p className="text-xs text-zinc-600 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
