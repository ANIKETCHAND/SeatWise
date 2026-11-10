import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-2.5 ${className}`}>
      <Loader2 className={`animate-spin text-zinc-900 ${sizeClasses[size]}`} />
      {label && <p className="text-xs font-medium text-zinc-500">{label}</p>}
    </div>
  );
};

export default LoadingSpinner;
