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
    <section id="features" className="py-24 bg-zinc-50 border-t border-zinc-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold text-zinc-900 uppercase tracking-widest font-mono">
            Core Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
            Everything You Need to Manage Examination Seating
          </h2>
          <p className="text-zinc-600 text-sm sm:text-base leading-relaxed">
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
                className="bg-white hover:bg-zinc-50 border border-zinc-200/90 hover:border-zinc-900/60 rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-950/5 group flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 group-hover:bg-black group-hover:text-white group-hover:border-black transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-950 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed">
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
