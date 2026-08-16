import React from 'react';
import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';

export interface CareCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
  inputSize?: 'md' | 'parent';
}

export const CareCheckbox = React.forwardRef<HTMLInputElement, CareCheckboxProps>(
  ({ label, description, checked, onChange, disabled, className, inputSize = 'md', id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          'flex items-start gap-3.5 p-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none min-h-[48px]',
          checked ? 'bg-[#E8F4EF] border-[#16866B]' : 'bg-white border-[#E5E7E5] hover:border-[#16866B]/40',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            type="checkbox"
            id={checkboxId}
            ref={ref}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div
            className={cn(
              'rounded-xl border-2 flex items-center justify-center transition-all duration-200',
              inputSize === 'parent' ? 'w-7 h-7' : 'w-6 h-6',
              checked ? 'bg-[#16866B] border-[#16866B] text-white' : 'bg-white border-[#8E9B97]'
            )}
          >
            {checked && <Check className={inputSize === 'parent' ? 'w-5 h-5' : 'w-4 h-4'} />}
          </div>
        </div>

        <div className="space-y-0.5">
          <span className={cn('font-bold text-[#1D2926]', inputSize === 'parent' ? 'text-lg sm:text-xl' : 'text-base')}>
            {label}
          </span>
          {description && <p className="text-sm text-[#66736F]">{description}</p>}
        </div>
      </label>
    );
  }
);

CareCheckbox.displayName = 'CareCheckbox';
