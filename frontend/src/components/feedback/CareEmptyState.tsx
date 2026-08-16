import React from 'react';
import { cn } from '@/utils/cn';
import { Sparkles } from 'lucide-react';
import { CareButton } from '@/components/ui/CareButton';

export interface CareEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const CareEmptyState: React.FC<CareEmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-[#FAF7F1] border-2 border-dashed border-[#E5E7E5] rounded-[24px] p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-[#E8F4EF] text-[#16866B] flex items-center justify-center shadow-care-sm">
        {icon || <Sparkles className="w-8 h-8" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-xl sm:text-2xl font-bold text-[#1D2926]">{title}</h3>
        <p className="text-base text-[#66736F] max-w-sm">{description}</p>
      </div>
      {actionLabel && onAction && (
        <CareButton variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </CareButton>
      )}
    </div>
  );
};
