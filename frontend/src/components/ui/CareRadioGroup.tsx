import React from 'react';
import { cn } from '@/utils/cn';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface CareRadioGroupProps {
  name: string;
  options: RadioOption[];
  selectedValue?: string;
  onChange: (value: string) => void;
  label?: string;
  inputSize?: 'md' | 'parent';
  className?: string;
}

export const CareRadioGroup: React.FC<CareRadioGroupProps> = ({
  name,
  options,
  selectedValue,
  onChange,
  label,
  inputSize = 'md',
  className,
}) => {
  return (
    <div className={cn('space-y-2.5', className)}>
      {label && <label className="block font-medium text-[#1D2926] text-sm sm:text-base">{label}</label>}
      <div className="grid grid-cols-1 gap-2.5">
        {options.map((opt) => {
          const isSelected = selectedValue === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                'flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none min-h-[52px]',
                isSelected ? 'bg-[#E8F4EF] border-[#16866B] shadow-care-sm' : 'bg-white border-[#E5E7E5] hover:border-[#16866B]/40'
              )}
            >
              <div className="flex items-center gap-3.5">
                {opt.icon && <div className="text-[#16866B] shrink-0">{opt.icon}</div>}
                <div>
                  <span className={cn('font-bold text-[#1D2926]', inputSize === 'parent' ? 'text-lg sm:text-xl' : 'text-base')}>
                    {opt.label}
                  </span>
                  {opt.description && <p className="text-sm text-[#66736F]">{opt.description}</p>}
                </div>
              </div>

              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <div
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  isSelected ? 'border-[#16866B] bg-[#16866B]' : 'border-[#8E9B97] bg-white'
                )}
              >
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};
