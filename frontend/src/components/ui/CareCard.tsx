import React from 'react';
import { cn } from '@/utils/cn';

export interface CareCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'cream' | 'soft' | 'bordered' | 'accent' | 'highlight';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'parent';
  radius?: 'lg' | 'xl' | '2xl' | 'full';
  interactive?: boolean;
}

export const CareCard: React.FC<CareCardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  radius = '2xl',
  interactive = false,
  className,
  ...props
}) => {
  const baseStyles = 'transition-all duration-200 relative overflow-hidden';

  const variants = {
    default: 'bg-white text-[#1D2926] shadow-care-md border border-[#F0ECE1]',
    cream: 'bg-[#FAF7F1] text-[#1D2926] border border-[#EBE5D8]',
    soft: 'bg-[#E8F4EF] text-[#1D2926] border border-[#D0E7DC]',
    bordered: 'bg-white text-[#1D2926] border-2 border-[#16866B]/20',
    accent: 'bg-[#16866B] text-white shadow-care-lg',
    highlight: 'bg-[#FEF3C7] text-[#1D2926] border-2 border-[#F59E0B]/40',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-3.5 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
    parent: 'p-6 sm:p-8 space-y-4',
  };

  const radiuses = {
    lg: 'rounded-2xl',
    xl: 'rounded-[20px]',
    '2xl': 'rounded-[24px]',
    full: 'rounded-[32px]',
  };

  return (
    <div
      className={cn(
        baseStyles,
        variants[variant],
        paddings[padding],
        radiuses[radius],
        interactive && 'cursor-pointer hover:shadow-care-lg hover:-translate-y-0.5 active:translate-y-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
