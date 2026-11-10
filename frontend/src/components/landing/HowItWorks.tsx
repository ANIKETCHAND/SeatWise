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
    <section id="how-it-works" className="py-24 bg-white border-t border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold text-zinc-900 uppercase tracking-widest font-mono">
            Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
            From Examination Setup to Final Seating Plan
          </h2>
          <p className="text-zinc-600 text-sm sm:text-base leading-relaxed">
            A structured four-step process to manage multi-hall examination seating.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-zinc-50/80 hover:bg-white border border-zinc-200 hover:border-zinc-400 rounded-2xl p-6 flex flex-col justify-between relative group transition-all shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-2xl font-black font-mono text-zinc-400 group-hover:text-black transition-colors">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-zinc-200/80 border border-zinc-300/80 flex items-center justify-center text-zinc-800 group-hover:bg-black group-hover:text-white group-hover:border-black transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-zinc-950 mb-2">{step.title}</h3>
                  <p className="text-zinc-600 text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
