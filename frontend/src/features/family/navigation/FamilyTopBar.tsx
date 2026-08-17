import React from 'react';
import type { SupportedParent } from '@/types/family';
import { CareBadge } from '@/components/ui/CareBadge';
import { Bell, Heart } from 'lucide-react';

export interface FamilyTopBarProps {
  caregiverName: string;
  activeParentId: string;
  supportedParents: SupportedParent[];
  onSelectParent: (parentId: string) => void;
  attentionCount?: number;
  onNotificationClick?: () => void;
  onNavigateParentView?: () => void;
}

export const FamilyTopBar: React.FC<FamilyTopBarProps> = ({
  activeParentId,
  supportedParents,
  onSelectParent,
  attentionCount = 0,
  onNotificationClick,
  onNavigateParentView,
}) => {

  return (
    <header className="bg-white border-b border-[#E5E7E5] sticky top-0 z-30 shadow-care-sm text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        
        {/* Active Parent Context Selector Bar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F4EF] text-[#16866B] flex items-center justify-center font-bold text-lg shrink-0 shadow-care-sm">
            👵
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8E9B97]">
              Active Parent Care Context
            </span>
            <div className="flex items-center gap-2">
              <select
                value={activeParentId}
                onChange={(e) => onSelectParent(e.target.value)}
                className="bg-[#FAF7F1] border border-[#CBD5E1] rounded-xl px-3 py-1 font-extrabold text-sm sm:text-base text-[#1D2926] focus-care cursor-pointer"
              >
                {supportedParents.map((p) => (
                  <option key={p.parentId} value={p.parentId}>
                    {p.name} ({p.relationship}{p.age ? `, Age ${p.age}` : ''})
                  </option>
                ))}
              </select>

              <CareBadge variant="success" size="sm">
                Active Care Circle
              </CareBadge>
            </div>
          </div>
        </div>

        {/* Right Header Tools */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNotificationClick}
            className="p-2.5 rounded-full bg-[#FAF7F1] text-[#66736F] hover:text-[#1D2926] hover:bg-[#E8F4EF] transition-all relative focus-care"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {attentionCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse" />
            )}
          </button>

          {onNavigateParentView && (
            <button
              onClick={onNavigateParentView}
              className="hidden sm:inline-flex items-center gap-2 text-xs font-bold text-[#16866B] bg-[#E8F4EF] hover:bg-[#16866B] hover:text-white px-3.5 py-2 rounded-full transition-all border border-[#16866B]/20 focus-care"
            >
              <Heart className="w-4 h-4" /> Switch to Parent UI
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
