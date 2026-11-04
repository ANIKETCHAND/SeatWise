import React from 'react';
import {
  BrainCircuit,
  Grid3X3,
  Building2,
  ShieldCheck,
  Search,
  FileSpreadsheet,
} from 'lucide-react';

const FEATURES = [
  {
    icon: BrainCircuit,
    title: 'Intelligent Seating Allocation',
    description:
      'Automatically allocate students to available seats using mathematical algorithms and configurable examination rules.',
  },
  {
    icon: Grid3X3,
    title: 'Interactive Hall Layouts',
    description:
      'Create classroom layouts, configure rows and columns, mark unavailable desks, and block restricted seats.',
  },
  {
    icon: Building2,
    title: 'Multi-Hall Management',
    description:
      'Distribute candidates across multiple examination halls when a single classroom capacity is insufficient.',
  },
  {
    icon: ShieldCheck,
    title: 'Mathematical Validation',
    description:
      'Rigorous verification of injective mapping, Pigeonhole capacity checks, and zero prohibited adjacency violations.',
  },
  {
    icon: Search,
    title: 'Instant Student Seat Lookup',
    description:
      'Quickly find examination hall, row, and desk number using candidate roll number and examination identifier.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Automated Reports',
    description:
      'Generate hall-wise seating charts, program rosters, empty seat summaries, and official invigilator PDF reports.',
  },
];

export const LandingFeatures: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-slate-900 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono">
            Core Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Everything You Need to Manage Examination Seating
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Eliminate manual spreadsheets, prevent seat allocation conflicts, and guarantee
            academic integrity with algorithmically backed seating generation.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/40 rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 group flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
