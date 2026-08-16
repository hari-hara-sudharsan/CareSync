import React from 'react';
import { cn } from '@/utils/cn';

export interface CareSectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  stepIndicator?: string;
  className?: string;
}

export const CareSectionHeader: React.FC<CareSectionHeaderProps> = ({
  title,
  subtitle,
  action,
  stepIndicator,
  className,
}) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2', className)}>
      <div className="space-y-1">
        {stepIndicator && (
          <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full">
            {stepIndicator}
          </span>
        )}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1D2926] tracking-tight">{title}</h2>
        {subtitle && <p className="text-base text-[#66736F]">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
