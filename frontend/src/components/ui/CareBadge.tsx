import React from 'react';
import { cn } from '@/utils/cn';

export interface CareBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'critical' | 'info' | 'neutral' | 'primary' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const CareBadge: React.FC<CareBadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full shrink-0 select-none';

  const variants = {
    success: 'bg-[#E8F4EF] text-[#16866B] border border-[#16866B]/20',
    warning: 'bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30',
    critical: 'bg-[#FEE2E2] text-[#DC2626] border border-[#EF4444]/30',
    info: 'bg-[#E0F2FE] text-[#0284C7] border border-[#38BDF8]/30',
    neutral: 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]',
    primary: 'bg-[#16866B] text-white',
    soft: 'bg-[#FAF7F1] text-[#1D2926] border border-[#E5E7E5]',
  };

  const dotColors = {
    success: 'bg-[#16866B]',
    warning: 'bg-[#D97706]',
    critical: 'bg-[#DC2626]',
    info: 'bg-[#0284C7]',
    neutral: 'bg-[#64748B]',
    primary: 'bg-white',
    soft: 'bg-[#16866B]',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-sm px-3.5 py-1 gap-2',
    lg: 'text-base px-4 py-1.5 gap-2.5 font-semibold',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {dot && <span className={cn('w-2 h-2 rounded-full animate-pulse', dotColors[variant])} />}
      {children}
    </span>
  );
};
