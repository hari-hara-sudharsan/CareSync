import React from 'react';
import { CareModal } from '@/components/feedback/CareModal';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareButton } from '@/components/ui/CareButton';
import type { CareRequest } from '@/types/care-request';
import {
  Users,
  HeartHandshake,
  MapPin,
  History,
  Phone,
} from 'lucide-react';

export interface CareRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: CareRequest | null;
  onAssign: (requestId: string, assigneeId: string) => Promise<void>;
  isSubmitting?: boolean;
}

export const CareRequestDetailModal: React.FC<CareRequestDetailModalProps> = ({
  isOpen,
  onClose,
  request,
  onAssign,
  isSubmitting = false,
}) => {
  if (!request) return null;

  const familyCandidates = request.candidates?.filter((c) => c.type === 'FAMILY') || [];
  const volunteerCandidates = request.candidates?.filter((c) => c.type === 'VOLUNTEER') || [];

  return (
    <CareModal
      isOpen={isOpen}
      onClose={onClose}
      title={request.title}
      description={`Care request for ${request.parentName} • Requested for ${request.requestedTime}`}
    >
      <div className="space-y-6 text-left text-[#1D2926]">
        
        {/* Status & Category Badges */}
        <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-[#E5E7E5]">
          <CareBadge variant={request.priority === 'CRITICAL' ? 'critical' : 'warning'} size="md">
            {request.priority} Priority
          </CareBadge>
          <CareBadge variant="primary" size="md">
            Category: {request.category}
          </CareBadge>
          <CareBadge variant={request.status === 'ASSIGNED' ? 'success' : 'warning'} size="md">
            Status: {request.status}
          </CareBadge>
        </div>

        {/* Request Description & Location */}
        <div className="bg-[#FAF7F1] p-4 rounded-2xl border border-[#E5E7E5] space-y-2">
          <p className="text-sm font-semibold text-[#1D2926] leading-relaxed">{request.description}</p>
          {request.locationName && (
            <p className="text-xs font-bold text-[#66736F] flex items-center gap-1.5 pt-1">
              <MapPin className="w-4 h-4 text-[#16866B]" /> {request.locationName} ({request.address})
            </p>
          )}
        </div>

        {/* Assigned State (if currently assigned) */}
        {request.assignedTo && (
          <div className="bg-[#E8F4EF] p-4 rounded-2xl border border-[#16866B]/30 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-extrabold uppercase text-[#16866B]">Current Assignee</span>
              <p className="font-extrabold text-base text-[#1D2926]">{request.assignedTo.name}</p>
              <p className="text-xs text-[#66736F]">{request.assignedTo.role} • Assigned {request.assignedTo.assignedAt}</p>
            </div>

            {request.assignedTo.phone && (
              <a
                href={`tel:${request.assignedTo.phone}`}
                className="bg-[#16866B] text-white px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-care-sm"
              >
                <Phone className="w-4 h-4" /> Call Assignee
              </a>
            )}
          </div>
        )}

        {/* SECTION 1: FAMILY-FIRST ASSIGNMENT SEAM */}
        {!request.assignedTo && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-[#1D2926] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#16866B]" /> Family-First Candidates
              </h4>
              <CareBadge variant="success" size="sm">Family-First Policy</CareBadge>
            </div>

            <div className="space-y-2">
              {familyCandidates.map((cand) => (
                <div
                  key={cand.id}
                  className="p-3.5 rounded-2xl border-2 border-[#E5E7E5] bg-white flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-sm text-[#1D2926]">{cand.name}</p>
                    <p className="text-xs text-[#66736F]">{cand.relationship} • {cand.locationLabel}</p>
                  </div>

                  <CareButton
                    variant="primary"
                    size="sm"
                    loading={isSubmitting}
                    onClick={() => onAssign(request.id, cand.id)}
                  >
                    Assign {cand.name.split(' ')[0]}
                  </CareButton>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: VOLUNTEER FALLBACK SEAM */}
        {!request.assignedTo && volunteerCandidates.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-[#1D2926] flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-[#D97706]" /> Verified Community Volunteers (Fallback)
              </h4>
              <CareBadge variant="warning" size="sm">Volunteer Network</CareBadge>
            </div>

            <div className="space-y-2">
              {volunteerCandidates.map((vol) => (
                <div
                  key={vol.id}
                  className="p-3.5 rounded-2xl border-2 border-dashed border-[#D97706]/40 bg-[#FFFBEB]/30 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-[#1D2926]">{vol.name}</p>
                      <span className="text-xs font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                        ★ {vol.rating} ({vol.matchScore}% Match)
                      </span>
                    </div>
                    <p className="text-xs text-[#66736F]">{vol.relationship} • {vol.locationLabel}</p>
                  </div>

                  <CareButton
                    variant="soft"
                    size="sm"
                    loading={isSubmitting}
                    onClick={() => onAssign(request.id, vol.id)}
                  >
                    Assign Volunteer
                  </CareButton>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: ASSIGNMENT HISTORY */}
        {request.history && request.history.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#E5E7E5]">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#8E9B97] flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#16866B]" /> Assignment History & Activity
            </h4>

            <div className="space-y-2 text-xs">
              {request.history.map((h) => (
                <div key={h.id} className="p-2.5 rounded-xl bg-[#FAF7F1] border border-[#E5E7E5] flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#1D2926]">{h.assigneeName} ({h.assigneeRole})</span>
                    <span className="text-[#66736F]"> — {h.status}</span>
                    {h.reason && <p className="text-[#DC2626] font-semibold mt-0.5">Reason: {h.reason}</p>}
                  </div>
                  <span className="text-[#8E9B97] text-[10px]">{h.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </CareModal>
  );
};
