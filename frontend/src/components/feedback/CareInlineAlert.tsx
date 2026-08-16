import React from 'react';
import { cn } from '@/utils/cn';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface CareInlineAlertProps {
  type?: 'success' | 'warning' | 'critical' | 'info';
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const CareInlineAlert: React.FC<CareInlineAlertProps> = ({
  type = 'info',
  title,
  description,
  action,
  className,
}) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#16866B]" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#D97706]" />,
    critical: <AlertCircle className="w-5 h-5 text-[#DC2626]" />,
    info: <Info className="w-5 h-5 text-[#0284C7]" />,
  };

  const bgStyles = {
    success: 'bg-[#E8F4EF] border-[#16866B]/30 text-[#1D2926]',
    warning: 'bg-[#FEF3C7] border-[#F59E0B]/30 text-[#1D2926]',
    critical: 'bg-[#FEE2E2] border-[#EF4444]/30 text-[#1D2926]',
    info: 'bg-[#E0F2FE] border-[#38BDF8]/30 text-[#1D2926]',
  };

  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-2xl border-2 text-sm', bgStyles[type], className)}>
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 space-y-0.5">
        <h5 className="font-bold text-base">{title}</h5>
        {description && <p className="text-sm opacity-90">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
