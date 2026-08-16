import React from 'react';
import { cn } from '@/utils/cn';
import { Search, X } from 'lucide-react';

export interface CareSearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  inputSize?: 'md' | 'parent';
}

export const CareSearchInput: React.FC<CareSearchInputProps> = ({
  value,
  onChange,
  onClear,
  inputSize = 'md',
  placeholder = 'Search requests, care members, or medicine...',
  className,
  ...props
}) => {
  const sizes = {
    md: 'h-12 text-base rounded-xl pl-11 pr-10 min-h-[44px]',
    parent: 'h-14 sm:h-16 text-lg sm:text-xl rounded-2xl pl-12 pr-12 min-h-[56px]',
  };

  return (
    <div className="relative flex items-center w-full">
      <Search className="absolute left-4 w-5 h-5 text-[#66736F] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full bg-white border-2 border-[#E5E7E5] text-[#1D2926] placeholder-[#8E9B97] transition-all duration-200 focus-care focus:border-[#16866B]',
          sizes[inputSize],
          className
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-4 text-[#66736F] hover:text-[#1D2926] p-1 rounded-full hover:bg-[#FAF7F1]"
          aria-label="Clear search"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
