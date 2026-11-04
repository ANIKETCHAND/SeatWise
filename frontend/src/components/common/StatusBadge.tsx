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
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  enrolled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  valid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  allocated: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  scheduled: 'bg-purple-50 text-purple-700 border-purple-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  graduated: 'bg-slate-100 text-slate-600 border-slate-200',
  absent: 'bg-rose-50 text-rose-700 border-rose-200',
  invalid: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  label,
  className = '',
}) => {
  const key = (variant || status || 'inactive').toLowerCase();
  const styles = variantStyles[key] || 'bg-slate-100 text-slate-600 border-slate-200';
  const displayLabel = label || status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${styles} ${className}`}
    >
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
