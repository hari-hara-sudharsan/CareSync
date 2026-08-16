import React from 'react';
import type { VolunteerMatch } from '@/types';
import { CareCard } from '@/components/ui/CareCard';
import { CareAvatar } from '@/components/ui/CareAvatar';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareButton } from '@/components/ui/CareButton';
import { MapPin, ShieldCheck, Clock, CheckCircle } from 'lucide-react';

export interface VolunteerMatchCardProps {
  match: VolunteerMatch;
  onApprove?: (id: string) => void;
  className?: string;
}

export const VolunteerMatchCard: React.FC<VolunteerMatchCardProps> = ({
  match,
  onApprove,
  className,
}) => {
  return (
    <CareCard variant="default" padding="md" className={className}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <CareAvatar
              src={match.avatarUrl}
              name={match.name}
              size="lg"
              status="online"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#1D2926]">{match.name}</h3>
                {match.verificationStatus === 'VERIFIED' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16866B] bg-[#E8F4EF] px-2 py-0.5 rounded-full border border-[#16866B]/20">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#16866B]" /> Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-[#66736F] flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#16866B]" /> {match.distanceKm} km away
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-[#16866B]">
                  <CheckCircle className="w-3.5 h-3.5" /> {match.reliabilityPercent}% Reliability
                </span>
              </p>
            </div>
          </div>
          <CareBadge variant="soft" size="sm">
            {match.tasksCompleted} Tasks Done
          </CareBadge>
        </div>

        {/* Match Reason / Explanation */}
        <div className="bg-[#FAF7F1] p-3 rounded-xl border border-[#EBE5D8] space-y-1">
          <span className="text-xs font-bold text-[#16866B] uppercase tracking-wider block">
            Why Matched
          </span>
          <p className="text-sm text-[#1D2926] font-medium">{match.matchReason}</p>
          <div className="flex items-center gap-1.5 text-xs text-[#66736F] pt-1">
            <Clock className="w-3.5 h-3.5 text-[#16866B]" />
            <span>Available: {match.availabilityWindow}</span>
          </div>
        </div>

        {/* Approve CTA */}
        {onApprove && (
          <div className="pt-1">
            <CareButton
              variant="primary"
              size="md"
              fullWidth
              onClick={() => onApprove(match.id)}
            >
              Approve Volunteer Assignment
            </CareButton>
          </div>
        )}
      </div>
    </CareCard>
  );
};
