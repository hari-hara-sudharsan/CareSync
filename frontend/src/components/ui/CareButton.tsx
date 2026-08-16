import React from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

export interface CareButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'outline' | 'danger' | 'pill';
  size?: 'sm' | 'md' | 'lg' | 'parent';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
}

export const CareButton: React.FC<CareButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  loading = false,
  disabled,
  className,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus-care disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer';

  const variants = {
    primary: 'bg-[#16866B] text-white hover:bg-[#126E58] shadow-care-sm hover:shadow-care-md',
    secondary: 'bg-[#1D2926] text-white hover:bg-[#111A18] shadow-care-sm',
    soft: 'bg-[#E8F4EF] text-[#16866B] hover:bg-[#D4EBE1] font-semibold',
    pill: 'bg-[#E8F4EF] text-[#1D2926] hover:bg-[#16866B] hover:text-white rounded-full font-semibold shadow-care-sm border border-[#CDE5DB]',
    ghost: 'bg-transparent text-[#1D2926] hover:bg-[#E8F4EF] hover:text-[#16866B]',
    outline: 'bg-transparent text-[#1D2926] border-2 border-[#16866B] hover:bg-[#E8F4EF]',
    danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-care-sm',
  };

  const sizes = {
    sm: 'text-sm h-9 px-4 rounded-xl gap-2',
    md: 'text-base h-11 px-5 rounded-2xl gap-2.5 min-h-[44px]', // 44px min touch target
    lg: 'text-lg h-13 px-6 rounded-2xl gap-3 min-h-[48px]',
    parent: 'text-lg sm:text-xl h-14 sm:h-16 px-8 rounded-full gap-3 font-semibold min-h-[56px] shadow-care-md', // 56px high parent button
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="inline-flex shrink-0">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="inline-flex shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
