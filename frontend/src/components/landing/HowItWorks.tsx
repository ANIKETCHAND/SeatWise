import React from 'react';
import { CalendarCheck, DoorOpen, Cpu, FileCheck } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    title: 'Create Examination',
    desc: 'Enter examination name, date, morning or afternoon session, and select participating batches.',
    icon: CalendarCheck,
  },
  {
    number: '02',
    title: 'Select Examination Halls',
    desc: 'Choose approved classrooms and automatically calculate total usable seating capacity.',
    icon: DoorOpen,
  },
  {
    number: '03',
    title: 'Generate Seating',
    desc: 'Automatically assign students using CP-SAT mathematical solvers with strict non-adjacency rules.',
    icon: Cpu,
  },
  {
    number: '04',
    title: 'Validate and Export',
    desc: 'Review the interactive grid, verify mathematical injectivity, and download official PDF/CSV reports.',
    icon: FileCheck,
  },
];

export const LandingHowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-24 bg-slate-950 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono">
            Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            From Examination Setup to Final Seating Plan
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            A structured four-step process built to handle multi-hall examination logistics seamlessly.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between relative group hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-2xl font-black font-mono text-blue-500/80 group-hover:text-blue-400 transition-colors">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
