import React from 'react';
import type { DecisionCardData } from '@/types';
import { CareCard } from '@/components/ui/CareCard';
import { CareButton } from '@/components/ui/CareButton';
import { CareBadge } from '@/components/ui/CareBadge';
import { Bot, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

export interface DecisionCardProps {
  decision: DecisionCardData;
  onOptionSelect?: (decisionId: string, actionKey: string) => void;
  className?: string;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  decision,
  onOptionSelect,
  className,
}) => {
  const urgencyVariants = {
    MEDIUM: 'warning' as const,
    HIGH: 'critical' as const,
    CRITICAL: 'critical' as const,
  };

  return (
    <CareCard
      variant={decision.urgency === 'CRITICAL' ? 'highlight' : 'default'}
      padding="lg"
      className={className}
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0ECE1] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 shadow-care-sm">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#D97706] flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" /> CareSync Human-In-The-Loop Decision
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1D2926]">
                {decision.title}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CareBadge variant={urgencyVariants[decision.urgency]} size="md" dot>
              {decision.urgency} URGENCY
            </CareBadge>
            {decision.expiresIn && (
              <span className="text-xs font-medium text-[#66736F] flex items-center gap-1 bg-[#FAF7F1] px-2.5 py-1 rounded-full border border-[#E5E7E5]">
                <Clock className="w-3.5 h-3.5" /> Expires in {decision.expiresIn}
              </span>
            )}
          </div>
        </div>

        {/* Governance & Explainability Banner */}
        <div className="bg-[#FFFBEB] border-2 border-[#FCD34D] p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-care-sm">
          <div className="flex items-center gap-2 text-[#92400E]">
            <Bot className="w-5 h-5 shrink-0 text-[#D97706]" />
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">
              AI Recommends — Human Coordinator Approval Required
            </span>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]">
            94% Match Confidence
          </span>
        </div>

        {/* What happened & Why Surfaced */}
        <div className="space-y-3 bg-[#FAF7F1] p-4 rounded-2xl border border-[#EBE5D8]">
          <div>
            <h4 className="text-sm font-bold text-[#1D2926] uppercase tracking-wide">
              What Happened
            </h4>
            <p className="text-base text-[#66736F] mt-0.5">{decision.description}</p>
          </div>

          <div className="pt-2 border-t border-[#E5E7E5]">
            <h4 className="text-sm font-bold text-[#16866B] uppercase tracking-wide flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[#16866B]" /> Why CareSync Surfaced This
            </h4>
            <p className="text-base text-[#1D2926] font-medium mt-0.5">{decision.whySurfaced}</p>
          </div>

          <div className="pt-2 border-t border-[#E5E7E5]">
            <h4 className="text-sm font-bold text-[#1D2926] uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#16866B]" /> AI Recommendation & Matching Rationale
            </h4>
            <p className="text-base font-semibold text-[#16866B] mt-0.5">
              {decision.recommendation}
            </p>

            {/* Matching Rationale Checklist */}
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-[#2D3A36]">
              <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-[#E5E7E5]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16866B] shrink-0" />
                <span>Availability & Schedule Matched</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-[#E5E7E5]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16866B] shrink-0" />
                <span>Geographic Proximity &lt; 5 Miles</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-[#E5E7E5]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16866B] shrink-0" />
                <span>Care Capability Verified</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-[#E5E7E5]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16866B] shrink-0" />
                <span>Historical High Quality Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-2 pt-1">
          <span className="text-xs font-bold text-[#66736F] uppercase tracking-wider block">
            Select an Action
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {decision.options.map((opt) => (
              <CareButton
                key={opt.action}
                variant={opt.variant || 'primary'}
                size="md"
                onClick={() => onOptionSelect?.(decision.id, opt.action)}
                className="w-full text-center"
              >
                {opt.label}
              </CareButton>
            ))}
          </div>
        </div>
      </div>
    </CareCard>
  );
};
