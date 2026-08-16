import React from 'react';
import { cn } from '@/utils/cn';

export interface CareIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'soft' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'parent';
  icon: React.ReactNode;
  badgeCount?: number;
  label: string; // Accessible aria-label requirement
}

export const CareIconButton: React.FC<CareIconButtonProps> = ({
  variant = 'default',
  size = 'md',
  icon,
  badgeCount,
  label,
  className,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center rounded-full transition-all duration-200 focus-care active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer shrink-0';

  const variants = {
    default: 'bg-white text-[#1D2926] border border-[#E5E7E5] hover:bg-[#FAF7F1] shadow-care-sm',
    primary: 'bg-[#16866B] text-white hover:bg-[#126E58] shadow-care-sm',
    soft: 'bg-[#E8F4EF] text-[#16866B] hover:bg-[#D4EBE1]',
    ghost: 'bg-transparent text-[#1D2926] hover:bg-[#E8F4EF]',
    outline: 'bg-transparent border-2 border-[#16866B] text-[#16866B] hover:bg-[#E8F4EF]',
  };

  const sizes = {
    sm: 'w-9 h-9 min-w-[36px] min-h-[36px]',
    md: 'w-11 h-11 min-w-[44px] min-h-[44px]', // 44px min touch target
    lg: 'w-13 h-13 min-w-[52px] min-h-[52px]',
    parent: 'w-14 h-14 min-w-[56px] min-h-[56px]', // 56px parent touch target
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-[#DC2626] text-white text-xs font-bold flex items-center justify-center shadow-sm">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  );
};
