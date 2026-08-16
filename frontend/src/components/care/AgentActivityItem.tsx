import React from 'react';
import type { AgentActivity } from '@/types';
import { Bot, Clock, Wrench } from 'lucide-react';
import { CareBadge } from '@/components/ui/CareBadge';

export interface AgentActivityItemProps {
  activity: AgentActivity;
  className?: string;
}

export const AgentActivityItem: React.FC<AgentActivityItemProps> = ({
  activity,
  className,
}) => {
  const statusBadges = {
    SUCCESS: <CareBadge variant="success" size="sm">TOOL EXECUTION SUCCESS</CareBadge>,
    NEED_HUMAN: <CareBadge variant="warning" size="sm">DECISION SURFACED TO HUMAN</CareBadge>,
    IN_PROGRESS: <CareBadge variant="info" size="sm">AGENT RUNNING</CareBadge>,
    FAILED: <CareBadge variant="critical" size="sm">EXECUTION EXCEPTION</CareBadge>,
  };

  return (
    <div className={`bg-white border border-[#E5E7E5] rounded-2xl p-4 space-y-2 shadow-care-sm ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#E8F4EF] text-[#16866B] flex items-center justify-center font-bold">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#66736F] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#16866B]" /> {activity.timestamp} • Trigger: {activity.trigger}
            </span>
            <h4 className="text-base font-bold text-[#1D2926]">{activity.actionExecuted}</h4>
          </div>
        </div>
        {statusBadges[activity.status]}
      </div>

      <div className="flex items-center gap-2 bg-[#FAF7F1] p-2.5 rounded-xl border border-[#EBE5D8] text-xs font-mono text-[#1D2926]">
        <Wrench className="w-4 h-4 text-[#16866B] shrink-0" />
        <span className="truncate">Tool: {activity.toolCalled}</span>
      </div>

      <p className="text-sm text-[#66736F]">{activity.summary}</p>
    </div>
  );
};
