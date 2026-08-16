import React from 'react';
import { cn } from '@/utils/cn';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface CareToastProps {
  type?: 'success' | 'warning' | 'critical' | 'info';
  title: string;
  message?: string;
  onClose?: () => void;
  className?: string;
}

export const CareToast: React.FC<CareToastProps> = ({
  type = 'success',
  title,
  message,
  onClose,
  className,
}) => {
  const icons = {
    success: <CheckCircle2 className="w-6 h-6 text-[#16866B]" />,
    warning: <AlertTriangle className="w-6 h-6 text-[#D97706]" />,
    critical: <AlertCircle className="w-6 h-6 text-[#DC2626]" />,
    info: <Info className="w-6 h-6 text-[#0284C7]" />,
  };

  const bgStyles = {
    success: 'bg-[#E8F4EF] border-[#16866B]/30',
    warning: 'bg-[#FEF3C7] border-[#F59E0B]/30',
    critical: 'bg-[#FEE2E2] border-[#EF4444]/30',
    info: 'bg-[#E0F2FE] border-[#38BDF8]/30',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 sm:p-5 rounded-2xl border-2 shadow-care-md transition-all duration-200',
        bgStyles[type],
        className
      )}
    >
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 space-y-0.5">
        <h4 className="text-base font-bold text-[#1D2926]">{title}</h4>
        {message && <p className="text-sm text-[#66736F]">{message}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-[#66736F] hover:text-[#1D2926] p-1 rounded-lg hover:bg-white/50 transition-colors"
          aria-label="Dismiss toast"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
