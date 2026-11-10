import React from 'react';
import { SeatingPolicy } from '../../types';
import { ShieldCheck, Sliders } from 'lucide-react';

interface PolicyConfiguratorProps {
  policy: SeatingPolicy;
  onChange: (updated: SeatingPolicy) => void;
  disabled?: boolean;
  compact?: boolean;
  title?: string;
}

export const PolicyConfigurator: React.FC<PolicyConfiguratorProps> = ({
  policy,
  onChange,
  disabled = false,
  compact = false,
  title,
}) => {
  const toggle = (key: keyof SeatingPolicy) => {
    if (disabled) return;
    onChange({
      ...policy,
      [key]: !policy[key],
    });
  };

  const options: Array<{ key: keyof SeatingPolicy; title: string; desc: string }> = [
    {
      key: 'block_same_batch_horizontal',
      title: 'Horizontal Adjacency Constraint',
      desc: 'Prevents adjacent seats in the same row from having the same exam batch',
    },
    {
      key: 'block_same_batch_vertical',
      title: 'Vertical Adjacency Constraint',
      desc: 'Prevents consecutive seats directly behind each other from having identical subjects',
    },
    {
      key: 'block_same_batch_diagonal',
      title: 'Diagonal Restriction',
      desc: 'Strict 8-way neighborhood check (requires lower density / more halls)',
    },
    {
      key: 'allow_empty_seats',
      title: 'Permit Empty Buffer Seats',
      desc: 'Allow the solver to insert empty spacer desks if necessary for feasibility',
    },
    {
      key: 'allow_mixed_batches',
      title: 'Interleave Alternate Batches',
      desc: 'Mix students from different departments/programs in a checkerboard pattern',
    },
    {
      key: 'separate_programs',
      title: 'Degree Program Separation',
      desc: 'Maximize physical distance between students of the same academic degree',
    },
  ];

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs">
        <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-zinc-700" />
          {title || 'Seating Policy Constraints'}
        </h2>
        <div className="space-y-2 text-xs">
          {options.map((opt) => (
            <label
              key={opt.key}
              className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer select-none ${
                policy[opt.key]
                  ? 'bg-zinc-100 border-zinc-900 text-zinc-900'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-500'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-400'}`}
            >
              <div>
                <span className="text-xs font-semibold block">{opt.title}</span>
                <span className="text-[10px] text-zinc-500 block">{opt.desc}</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(policy[opt.key])}
                onChange={() => toggle(opt.key)}
                disabled={disabled}
                className="rounded text-zinc-900 focus:ring-zinc-900 shrink-0 ml-2"
              />
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200">
        <Sliders className="w-5 h-5 text-zinc-700" />
        <h3 className="text-sm font-semibold text-zinc-900">{title || 'Mathematical Optimization Policies'}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map((opt) => (
          <label
            key={opt.key}
            className={`flex items-start gap-3 p-3 rounded-lg border transition cursor-pointer select-none ${
              policy[opt.key]
                ? 'bg-zinc-100 border-zinc-900 text-zinc-900'
                : 'bg-zinc-50 border-zinc-200 text-zinc-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-400'}`}
          >
            <input
              type="checkbox"
              checked={Boolean(policy[opt.key])}
              onChange={() => toggle(opt.key)}
              disabled={disabled}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            <div className="flex-1">
              <span className="text-xs font-semibold block">{opt.title}</span>
              <span className="text-[11px] leading-tight text-zinc-500 block mt-0.5">{opt.desc}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default PolicyConfigurator;
