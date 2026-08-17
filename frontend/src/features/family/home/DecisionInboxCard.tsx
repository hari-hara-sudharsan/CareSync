import React from 'react';
import type { DecisionCardData, DecisionPriority } from '@/types/family';
import { CareCard } from '@/components/ui/CareCard';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareButton } from '@/components/ui/CareButton';
import { AlertCircle, Clock, Car, HeartHandshake, Sparkles } from 'lucide-react';

export interface DecisionInboxCardProps {
  decision: DecisionCardData;
  onRespond: (decisionId: string, actionKey: string) => Promise<void>;
  isSubmitting?: boolean;
}

export const DecisionInboxCard: React.FC<DecisionInboxCardProps> = ({
  decision,
  onRespond,
  isSubmitting = false,
}) => {
  const renderPriorityBadge = (priority: DecisionPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return <CareBadge variant="critical" size="md">🔴 CRITICAL DECISION</CareBadge>;
      case 'HIGH':
        return <CareBadge variant="warning" size="md">⚠️ HIGH PRIORITY</CareBadge>;
      case 'MEDIUM':
        return <CareBadge variant="info" size="md">ℹ️ MEDIUM</CareBadge>;
      default:
        return <CareBadge variant="neutral" size="md">LOW</CareBadge>;
    }
  };

  const renderTypeIcon = (type: string) => {
    switch (type) {
      case 'TRANSPORTATION_CONFIRMATION':
        return <Car className="w-6 h-6 text-[#DC2626]" />;
      case 'VOLUNTEER_APPROVAL':
        return <HeartHandshake className="w-6 h-6 text-[#D97706]" />;
      default:
        return <AlertCircle className="w-6 h-6 text-[#16866B]" />;
    }
  };

  return (
    <CareCard
      variant="default"
      padding="lg"
      className={`space-y-4 text-left border-2 transition-all ${
        decision.priority === 'CRITICAL'
          ? 'border-[#EF4444] bg-[#FEF2F2]/30 shadow-care-md'
          : 'border-[#F59E0B] bg-[#FFFBEB]/30 shadow-care-sm'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#E5E7E5] pb-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-care-sm ${
              decision.priority === 'CRITICAL' ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#FEF3C7] text-[#D97706]'
            }`}
          >
            {renderTypeIcon(decision.type)}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {renderPriorityBadge(decision.priority)}
              <span className="text-xs font-bold text-[#66736F]">
                {decision.parentName}
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-[#1D2926]">{decision.title}</h3>
          </div>
        </div>

        {decision.expiresAt && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#DC2626] bg-white px-3 py-1 rounded-full border border-[#EF4444]/30 shrink-0">
            <Clock className="w-3.5 h-3.5" /> Expiration: {decision.expiresAt}
          </div>
        )}
      </div>

      {/* Summary */}
      <p className="text-base text-[#1D2926] leading-relaxed bg-white p-3.5 rounded-2xl border border-[#E5E7E5]">
        {decision.summary}
      </p>

      {/* Agent Reason / Context Explanation */}
      {decision.reason && (
        <div className="bg-[#E8F4EF] p-3 rounded-xl border border-[#16866B]/30 flex items-start gap-2 text-xs text-[#1D2926]">
          <Sparkles className="w-4 h-4 text-[#16866B] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#16866B]">Why this decision exists: </span>
            {decision.reason}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
        {decision.actions.map((act) => {
          const isPrimary = act.variant === 'primary';
          return (
            <CareButton
              key={act.key}
              variant={act.variant}
              size="md"
              loading={isSubmitting}
              onClick={() => onRespond(decision.id, act.key)}
              className={isPrimary ? 'sm:flex-1 w-full shadow-care-sm' : 'w-full sm:w-auto'}
            >
              {act.label}
            </CareButton>
          );
        })}
      </div>
    </CareCard>
  );
};
