import React from 'react';

export type StatusVariant =
  | 'active'
  | 'inactive'
  | 'draft'
  | 'published'
  | 'allocated'
  | 'present'
  | 'absent'
  | 'scheduled'
  | 'completed'
  | 'enrolled'
  | 'graduated'
  | 'valid'
  | 'invalid';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  label?: string;
  className?: string;
}

const variantStyles: Record<string, string> = {
  active: 'bg-black text-white border-black font-semibold',
  enrolled: 'bg-black text-white border-black font-semibold',
  published: 'bg-black text-white border-black font-semibold',
  present: 'bg-black text-white border-black font-semibold',
  valid: 'bg-black text-white border-black font-semibold',
  completed: 'bg-zinc-800 text-zinc-100 border-zinc-800',
  allocated: 'bg-zinc-100 text-zinc-900 border-zinc-300 font-semibold',
  draft: 'bg-zinc-100 text-zinc-800 border-zinc-300',
  scheduled: 'bg-zinc-100 text-zinc-800 border-zinc-300',
  inactive: 'bg-zinc-50 text-zinc-500 border-zinc-200',
  graduated: 'bg-zinc-50 text-zinc-500 border-zinc-200',
  absent: 'bg-zinc-200 text-zinc-900 border-zinc-400 font-bold',
  invalid: 'bg-zinc-200 text-zinc-900 border-zinc-400 font-bold',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  label,
  className = '',
}) => {
  const key = (variant || status || 'inactive').toLowerCase();
  const styles = variantStyles[key] || 'bg-zinc-100 text-zinc-800 border-zinc-300';
  const displayLabel = label || status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono border capitalize ${styles} ${className}`}
    >
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
