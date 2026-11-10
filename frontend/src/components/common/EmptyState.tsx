import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-dashed border-zinc-200 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 mb-1">{title}</h3>
      {description && <p className="text-xs text-zinc-500 max-w-sm mb-4 leading-relaxed">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
