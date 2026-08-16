import React from 'react';
import { CareCard } from './CareCard';
import { CareBadge } from './CareBadge';

export interface CareStatusCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  status: 'handled' | 'completed' | 'available' | 'needs_attention' | 'pending' | 'urgent' | 'escalated' | 'scheduled';
  statusText: string;
  footerText?: string;
  className?: string;
}

export const CareStatusCard: React.FC<CareStatusCardProps> = ({
  title,
  subtitle,
  icon,
  status,
  statusText,
  footerText,
  className,
}) => {
  const badgeVariants = {
    handled: 'success' as const,
    completed: 'success' as const,
    available: 'success' as const,
    needs_attention: 'warning' as const,
    pending: 'warning' as const,
    urgent: 'critical' as const,
    escalated: 'critical' as const,
    scheduled: 'neutral' as const,
  };

  const bgVariants = {
    handled: 'soft' as const,
    completed: 'soft' as const,
    available: 'soft' as const,
    needs_attention: 'highlight' as const,
    pending: 'cream' as const,
    urgent: 'highlight' as const,
    escalated: 'highlight' as const,
    scheduled: 'default' as const,
  };

  return (
    <CareCard variant={bgVariants[status]} padding="md" className={className}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#16866B] flex items-center justify-center shrink-0 shadow-care-sm">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1D2926]">{title}</h3>
              {subtitle && <p className="text-sm text-[#66736F]">{subtitle}</p>}
            </div>
          </div>
          <CareBadge variant={badgeVariants[status]} size="sm" dot>
            {statusText}
          </CareBadge>
        </div>

        {footerText && (
          <p className="text-xs text-[#8E9B97] pt-2 border-t border-[#E5E7E5]">
            {footerText}
          </p>
        )}
      </div>
    </CareCard>
  );
};
