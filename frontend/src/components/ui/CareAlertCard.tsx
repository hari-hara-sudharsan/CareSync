import React from 'react';
import { CareCard } from './CareCard';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export interface CareAlertCardProps {
  type?: 'warning' | 'critical' | 'info' | 'success';
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const CareAlertCard: React.FC<CareAlertCardProps> = ({
  type = 'warning',
  title,
  description,
  action,
  className,
}) => {
  const icons = {
    warning: <AlertTriangle className="w-6 h-6 text-[#D97706]" />,
    critical: <AlertCircle className="w-6 h-6 text-[#DC2626]" />,
    info: <Info className="w-6 h-6 text-[#0284C7]" />,
    success: <CheckCircle2 className="w-6 h-6 text-[#16866B]" />,
  };

  const variants = {
    warning: 'highlight' as const,
    critical: 'highlight' as const,
    info: 'soft' as const,
    success: 'soft' as const,
  };

  return (
    <CareCard variant={variants[type]} padding="md" className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="shrink-0 mt-0.5">{icons[type]}</div>
          <div className="space-y-0.5">
            <h4 className="text-lg font-bold text-[#1D2926]">{title}</h4>
            <p className="text-base text-[#66736F]">{description}</p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </CareCard>
  );
};
