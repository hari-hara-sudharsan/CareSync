import React from 'react';
import { cn } from '@/utils/cn';

export interface CareSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const CareSwitch: React.FC<CareSwitchProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 bg-white border border-[#E5E7E5] rounded-2xl min-h-[52px]',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      <div className="space-y-0.5 pr-4">
        <span className="font-bold text-[#1D2926] text-base sm:text-lg block">{label}</span>
        {description && <p className="text-sm text-[#66736F]">{description}</p>}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'w-14 h-8 rounded-full p-1 transition-colors duration-200 focus-care cursor-pointer shrink-0',
          checked ? 'bg-[#16866B]' : 'bg-[#CBD5E1]'
        )}
      >
        <div
          className={cn(
            'w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
};
