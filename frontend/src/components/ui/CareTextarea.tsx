import React from 'react';
import { cn } from '@/utils/cn';

export interface CareTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  inputSize?: 'md' | 'parent';
}

export const CareTextarea = React.forwardRef<HTMLTextAreaElement, CareTextareaProps>(
  ({ label, error, helperText, inputSize = 'md', className, id, rows = 4, ...props }, ref) => {
    const inputId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    const sizes = {
      md: 'p-4 text-base rounded-2xl min-h-[100px]',
      parent: 'p-5 text-lg sm:text-xl rounded-2xl min-h-[140px]',
    };

    return (
      <div className="w-full space-y-2">
        {label && (
          <label htmlFor={inputId} className="block font-medium text-[#1D2926] text-sm sm:text-base">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          className={cn(
            'w-full bg-white border-2 border-[#E5E7E5] text-[#1D2926] placeholder-[#8E9B97] transition-all duration-200 focus-care resize-y',
            error ? 'border-[#DC2626] focus:ring-[#DC2626]/30' : 'focus:border-[#16866B]',
            sizes[inputSize],
            className
          )}
          {...props}
        />
        {error && <p className="text-sm font-medium text-[#DC2626]">{error}</p>}
        {helperText && !error && <p className="text-sm text-[#66736F]">{helperText}</p>}
      </div>
    );
  }
);

CareTextarea.displayName = 'CareTextarea';
