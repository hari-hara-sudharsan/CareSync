import React from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface CareSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  inputSize?: 'md' | 'parent';
}

export const CareSelect = React.forwardRef<HTMLSelectElement, CareSelectProps>(
  ({ label, options, error, helperText, inputSize = 'md', className, id, ...props }, ref) => {
    const inputId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    const sizes = {
      md: 'h-12 pl-4 pr-10 text-base rounded-xl min-h-[44px]',
      parent: 'h-14 sm:h-16 pl-5 pr-12 text-lg sm:text-xl rounded-2xl min-h-[56px]',
    };

    return (
      <div className="w-full space-y-2">
        {label && (
          <label htmlFor={inputId} className="block font-medium text-[#1D2926] text-sm sm:text-base">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-white border-2 border-[#E5E7E5] text-[#1D2926] appearance-none transition-all duration-200 focus-care cursor-pointer',
              error ? 'border-[#DC2626] focus:ring-[#DC2626]/30' : 'focus:border-[#16866B]',
              sizes[inputSize],
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 text-[#66736F] pointer-events-none">
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
        {error && <p className="text-sm font-medium text-[#DC2626]">{error}</p>}
        {helperText && !error && <p className="text-sm text-[#66736F]">{helperText}</p>}
      </div>
    );
  }
);

CareSelect.displayName = 'CareSelect';
