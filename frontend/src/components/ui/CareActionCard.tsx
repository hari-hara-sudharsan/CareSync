import React from 'react';
import { cn } from '@/utils/cn';
import { CareCard } from './CareCard';
import { CareButton } from './CareButton';
import { ArrowRight } from 'lucide-react';

export interface CareActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  badgeText?: string;
  className?: string;
}

export const CareActionCard: React.FC<CareActionCardProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  badgeText,
  className,
}) => {
  return (
    <CareCard variant="default" padding="lg" interactive className={cn('group', className)}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F4EF] text-[#16866B] flex items-center justify-center shrink-0 shadow-care-sm group-hover:scale-105 transition-transform">
            {icon}
          </div>
          {badgeText && (
            <span className="text-xs font-bold text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full uppercase tracking-wider">
              {badgeText}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-bold text-[#1D2926]">{title}</h3>
          <p className="text-base text-[#66736F]">{description}</p>
        </div>

        <div className="pt-2">
          <CareButton
            variant="pill"
            size="parent"
            icon={<ArrowRight className="w-5 h-5" />}
            iconPosition="right"
            onClick={onAction}
            className="w-full justify-between px-6"
          >
            {actionLabel}
          </CareButton>
        </div>
      </div>
    </CareCard>
  );
};
