import React from 'react';
import { CareCard } from './CareCard';

export interface CareInfoCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const CareInfoCard: React.FC<CareInfoCardProps> = ({
  title,
  description,
  icon,
  footer,
  className,
}) => {
  return (
    <CareCard variant="cream" padding="md" className={className}>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-2xl bg-[#E8F4EF] text-[#16866B] flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-[#1D2926]">{title}</h4>
            <p className="text-base text-[#66736F]">{description}</p>
          </div>
        </div>
        {footer && <div className="pt-2 border-t border-[#EBE5D8]">{footer}</div>}
      </div>
    </CareCard>
  );
};
