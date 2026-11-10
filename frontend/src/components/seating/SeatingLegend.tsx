import React from 'react';

export interface LegendItem {
  label: string;
  color: string;
}

interface SeatingLegendProps {
  batches?: Array<{ name: string; color?: string }>;
  items?: LegendItem[];
  compact?: boolean;
}

export const SeatingLegend: React.FC<SeatingLegendProps> = ({
  batches,
  items,
  compact = false,
}) => {
  const defaultItems: LegendItem[] = items || [
    { label: 'Batch Alpha (Even)', color: 'bg-zinc-900 border-zinc-950 text-white' },
    { label: 'Batch Beta (Odd)', color: 'bg-zinc-100 border-zinc-300 text-zinc-900' },
    { label: 'Batch Gamma', color: 'bg-zinc-800 border-zinc-900 text-zinc-100' },
    { label: 'Empty Seat', color: 'bg-zinc-50 border-zinc-200 text-zinc-400' },
    { label: 'Blocked / Defective', color: 'bg-rose-50 border-rose-200 text-rose-500' },
    { label: 'Locked Assignment', color: 'bg-amber-50 border-amber-300 text-amber-700' },
    { label: 'Marked Absent', color: 'bg-rose-100 border-rose-300 text-rose-800 line-through' },
  ];

  if (compact && batches && batches.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-xs pl-2 border-l border-zinc-200">
        {batches.map((b) => (
          <div key={b.name} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${b.color || 'bg-zinc-900 border border-zinc-950'}`} />
            <span className="text-[11px] font-semibold text-zinc-700">{b.name}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-600 bg-white p-3 rounded-lg border border-zinc-200">
      <span className="font-semibold text-zinc-700 mr-1">Legend:</span>
      {batches && batches.length > 0
        ? batches.map((b) => (
            <span
              key={b.name}
              className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${
                b.color || 'bg-zinc-900 border-zinc-950 text-white'
              }`}
            >
              {b.name}
            </span>
          ))
        : defaultItems.map((it) => (
            <span
              key={it.label}
              className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${it.color}`}
            >
              {it.label}
            </span>
          ))}
    </div>
  );
};

export default SeatingLegend;
