import React from 'react';
import type { CareMember } from '@/types';
import { CareCard } from '@/components/ui/CareCard';
import { CareAvatar } from '@/components/ui/CareAvatar';
import { CareBadge } from '@/components/ui/CareBadge';
import { Phone, ShieldCheck } from 'lucide-react';

export interface CareMemberCardProps {
  member: CareMember;
  onCallClick?: (phone: string) => void;
  className?: string;
}

export const CareMemberCard: React.FC<CareMemberCardProps> = ({
  member,
  onCallClick,
  className,
}) => {
  return (
    <CareCard variant="default" padding="md" className={className}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <CareAvatar
            src={member.avatarUrl}
            name={member.name}
            size="lg"
            status={member.isAvailable ? 'online' : 'offline'}
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#1D2926]">{member.name}</h3>
              {member.role === 'PRIMARY_GUARDIAN' && (
                <span title="Primary Guardian">
                  <ShieldCheck className="w-4 h-4 text-[#16866B]" />
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-[#66736F]">
              {member.relationship} • {member.role.replace(/_/g, ' ')}
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <CareBadge
                variant={member.isAvailable ? 'success' : 'neutral'}
                size="sm"
                dot
              >
                {member.isAvailable ? 'Available Now' : 'Busy / Away'}
              </CareBadge>
              {member.location && (
                <span className="text-xs text-[#8E9B97]">{member.location}</span>
              )}
            </div>
          </div>
        </div>

        {onCallClick && (
          <button
            onClick={() => onCallClick(member.phone)}
            className="w-12 h-12 rounded-full bg-[#E8F4EF] text-[#16866B] hover:bg-[#16866B] hover:text-white flex items-center justify-center transition-all duration-200 shadow-care-sm shrink-0"
            title={`Call ${member.name}`}
          >
            <Phone className="w-5 h-5" />
          </button>
        )}
      </div>
    </CareCard>
  );
};
