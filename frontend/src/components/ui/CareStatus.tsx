import React from 'react';
import { cn } from '@/utils/cn';
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { CareButton } from './CareButton';

export interface CareStatusProps {
  status: 'handled' | 'needs_attention' | 'critical';
  title?: string;
  subtitle?: string;
  lastCheckedTime?: string;
  onReviewClick?: () => void;
  reviewLabel?: string;
  className?: string;
}

export const CareStatus: React.FC<CareStatusProps> = ({
  status,
  title,
  subtitle,
  lastCheckedTime = '09:04 AM',
  onReviewClick,
  reviewLabel = 'Review Recommendation',
  className,
}) => {
  if (status === 'handled') {
    return (
      <div
        className={cn(
          'bg-[#E8F4EF] border-2 border-[#16866B]/30 rounded-[24px] p-5 sm:p-6 text-[#1D2926] shadow-care-sm transition-all duration-200',
          className
        )}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[#16866B] text-white flex items-center justify-center shrink-0 shadow-care-sm mt-0.5">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-[#16866B]">
                CareSync Status
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-[#66736F] bg-white/80 px-2.5 py-0.5 rounded-full border border-[#16866B]/20">
                <ShieldCheck className="w-3.5 h-3.5 text-[#16866B]" /> Active
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#1D2926]">
              {title || "✓ Everything is handled."}
            </h3>
            <p className="text-base text-[#66736F]">
              {subtitle || "All medications, appointments, and check-ins are up to date."}
            </p>
            <p className="text-xs text-[#8E9B97] pt-1">
              Last checked by CareSync Agent • {lastCheckedTime}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isCritical = status === 'critical';

  return (
    <div
      className={cn(
        'rounded-[24px] p-5 sm:p-6 shadow-care-md border-2 transition-all duration-200 animate-pulse-subtle',
        isCritical
          ? 'bg-[#FEE2E2] border-[#EF4444]/40 text-[#1D2926]'
          : 'bg-[#FEF3C7] border-[#F59E0B]/40 text-[#1D2926]',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'w-12 h-12 rounded-full text-white flex items-center justify-center shrink-0 shadow-care-sm mt-0.5 sm:mt-0',
              isCritical ? 'bg-[#DC2626]' : 'bg-[#D97706]'
            )}
          >
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <span
              className={cn(
                'text-xs font-bold uppercase tracking-wider',
                isCritical ? 'text-[#DC2626]' : 'text-[#D97706]'
              )}
            >
              {isCritical ? 'Urgent Attention Required' : 'CareSync Needs Your Attention'}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold">
              {title || 'CareSync needs your decision'}
            </h3>
            <p className="text-base text-[#66736F]">
              {subtitle || 'A care coordination task requires your human approval.'}
            </p>
          </div>
        </div>

        {onReviewClick && (
          <CareButton
            variant={isCritical ? 'danger' : 'primary'}
            size="md"
            icon={<ArrowRight className="w-5 h-5" />}
            iconPosition="right"
            onClick={onReviewClick}
            className="w-full sm:w-auto shrink-0"
          >
            {reviewLabel}
          </CareButton>
        )}
      </div>
    </div>
  );
};
