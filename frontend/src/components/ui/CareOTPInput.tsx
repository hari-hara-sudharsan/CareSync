import React, { useRef } from 'react';
import { cn } from '@/utils/cn';

export interface CareOTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

export const CareOTPInput: React.FC<CareOTPInputProps> = ({
  length = 4,
  value,
  onChange,
  label = 'Verification Code',
  error,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, '');
    const newChars = value.split('');
    newChars[index] = val.slice(-1);
    const combined = newChars.join('');
    onChange(combined);

    if (val && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block font-medium text-[#1D2926] text-sm sm:text-base text-center">{label}</label>}
      <div className="flex items-center justify-center gap-3">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={cn(
              'w-14 h-16 sm:w-16 sm:h-18 text-center text-2xl font-bold rounded-2xl border-2 bg-white text-[#1D2926] focus-care transition-all shadow-care-sm',
              error ? 'border-[#DC2626]' : 'border-[#E5E7E5] focus:border-[#16866B]'
            )}
          />
        ))}
      </div>
      {error && <p className="text-sm font-medium text-[#DC2626] text-center">{error}</p>}
    </div>
  );
};
