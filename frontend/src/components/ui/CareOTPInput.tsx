import React, { useRef } from 'react';
import { cn } from '@/utils/cn';

export interface CareOTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  inputSize?: 'md' | 'parent';
}

export const CareOTPInput: React.FC<CareOTPInputProps> = ({
  length = 6,
  value,
  onChange,
  label,
  error,
  disabled = false,
  inputSize = 'parent',
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, '');
    const newChars = (value || '').split('');
    newChars[index] = val.slice(-1);
    const combined = newChars.join('').slice(0, length);
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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      const focusIndex = Math.min(pastedData.length, length - 1);
      inputsRef.current[focusIndex]?.focus();
    }
  };

  const sizes = {
    md: 'w-11 h-13 text-xl font-bold rounded-xl',
    parent: 'w-12 sm:w-14 h-16 sm:h-18 text-2xl font-extrabold rounded-2xl',
  };

  return (
    <div className="space-y-3">
      {label && <label className="block font-bold text-[#1D2926] text-base sm:text-lg text-center">{label}</label>}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {Array.from({ length }).map((_, i) => {
          const isFilled = Boolean(value && value[i]);
          return (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={(value && value[i]) || ''}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onPaste={handlePaste}
              disabled={disabled}
              aria-label={`Digit ${i + 1} of ${length}`}
              className={cn(
                'text-center bg-white border-2 text-[#1D2926] focus-care transition-all shadow-care-sm select-none',
                sizes[inputSize],
                error ? 'border-[#DC2626] focus:ring-[#DC2626]/30' : isFilled ? 'border-[#16866B] bg-[#E8F4EF]/50' : 'border-[#E5E7E5] focus:border-[#16866B]',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            />
          );
        })}
      </div>
      {error && <p className="text-sm sm:text-base font-semibold text-[#DC2626] text-center animate-fade-in">{error}</p>}
    </div>
  );
};
