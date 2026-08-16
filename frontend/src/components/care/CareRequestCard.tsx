import React from 'react';
import type { CareRequest } from '@/types';
import { CareCard } from '@/components/ui/CareCard';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareButton } from '@/components/ui/CareButton';
import { Clock, User, ArrowRight, Pill, Calendar, ShoppingBag, Car, Heart, Shield } from 'lucide-react';

export interface CareRequestCardProps {
  request: CareRequest;
  onViewDetails?: (id: string) => void;
  onAssignClick?: (id: string) => void;
  className?: string;
}

export const CareRequestCard: React.FC<CareRequestCardProps> = ({
  request,
  onViewDetails,
  onAssignClick,
  className,
}) => {
  const categoryIcons = {
    MEDICATION: <Pill className="w-5 h-5 text-[#16866B]" />,
    APPOINTMENT: <Calendar className="w-5 h-5 text-[#0284C7]" />,
    ERRAND: <ShoppingBag className="w-5 h-5 text-[#D97706]" />,
    TRAVEL: <Car className="w-5 h-5 text-[#8B5CF6]" />,
    COMPANIONSHIP: <Heart className="w-5 h-5 text-[#EC4899]" />,
    HOME_HELP: <Shield className="w-5 h-5 text-[#10B981]" />,
    SAFETY: <Shield className="w-5 h-5 text-[#DC2626]" />,
  };

  const statusVariants: Record<CareRequest['status'], 'success' | 'warning' | 'critical' | 'info' | 'neutral' | 'primary' | 'soft'> = {
    CREATED: 'neutral',
    CLASSIFIED: 'info',
    PENDING_ASSIGNMENT: 'warning',
    AWAITING_APPROVAL: 'warning',
    ASSIGNED: 'info',
    ACCEPTED: 'primary',
    IN_PROGRESS: 'primary',
    COMPLETED: 'success',
    PARENT_CONFIRMED: 'success',
    CLOSED: 'neutral',
    DECLINED: 'critical',
    TIMEOUT: 'critical',
    FAILED: 'critical',
    ESCALATED: 'critical',
  };

  return (
    <CareCard variant="default" padding="md" className={className}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F4EF] flex items-center justify-center shrink-0">
              {categoryIcons[request.category]}
            </div>
            <div>
              <span className="text-xs font-semibold text-[#66736F] uppercase tracking-wider">
                {request.category} • {request.parentName}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#1D2926] leading-tight">
                {request.title}
              </h3>
            </div>
          </div>
          <CareBadge variant={statusVariants[request.status]} size="sm" dot>
            {request.status.replace(/_/g, ' ')}
          </CareBadge>
        </div>

        {/* Description */}
        <p className="text-base text-[#66736F] line-clamp-2">{request.description}</p>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-[#66736F] pt-1 border-t border-[#F0ECE1]">
          {request.dueBy && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#16866B]" />
              <span>Due: {request.dueBy}</span>
            </div>
          )}

          {request.assignedTo ? (
            <div className="flex items-center gap-1.5 bg-[#E8F4EF] px-2.5 py-0.5 rounded-full text-[#16866B] font-medium text-xs">
              <User className="w-3.5 h-3.5" />
              <span>Assigned: {request.assignedTo.name} ({request.assignedTo.role})</span>
            </div>
          ) : (
            <span className="text-xs font-medium text-[#D97706] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full">
              Unassigned
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {onAssignClick && !request.assignedTo && (
            <CareButton
              variant="pill"
              size="sm"
              onClick={() => onAssignClick(request.id)}
            >
              Assign Caregiver
            </CareButton>
          )}
          {onViewDetails && (
            <CareButton
              variant="ghost"
              size="sm"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
              onClick={() => onViewDetails(request.id)}
            >
              Details
            </CareButton>
          )}
        </div>
      </div>
    </CareCard>
  );
};
