import React from 'react';
import { cn } from '@/utils/cn';

export interface CareInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  inputSize?: 'md' | 'parent';
}

export const CareInput = React.forwardRef<HTMLInputElement, CareInputProps>(
  ({ label, error, helperText, icon, inputSize = 'md', className, id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    const sizes = {
      md: 'h-12 px-4 text-base rounded-xl min-h-[44px]',
      parent: 'h-14 sm:h-16 px-5 text-lg sm:text-xl rounded-2xl min-h-[56px]',
    };

    return (
      <div className="w-full space-y-2">
        {label && (
          <label htmlFor={inputId} className="block font-medium text-[#1D2926] text-sm sm:text-base">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-4 text-[#66736F] pointer-events-none shrink-0">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-white border-2 border-[#E5E7E5] text-[#1D2926] placeholder-[#8E9B97] transition-all duration-200 focus-care',
              icon && 'pl-11',
              error ? 'border-[#DC2626] focus:ring-[#DC2626]/30' : 'focus:border-[#16866B]',
              sizes[inputSize],
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-sm font-medium text-[#DC2626]">{error}</p>}
        {helperText && !error && <p className="text-sm text-[#66736F]">{helperText}</p>}
      </div>
    );
  }
);

CareInput.displayName = 'CareInput';
