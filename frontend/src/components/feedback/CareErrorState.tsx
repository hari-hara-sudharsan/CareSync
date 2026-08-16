import React from 'react';
import { cn } from '@/utils/cn';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { CareButton } from '@/components/ui/CareButton';

export interface CareErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const CareErrorState: React.FC<CareErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'We encountered an issue loading this section. Please try again.',
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-[#FEE2E2] border-2 border-[#EF4444]/30 rounded-[24px] p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-md mx-auto',
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-[#DC2626] text-white flex items-center justify-center shadow-care-sm">
        <AlertCircle className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-[#1D2926]">{title}</h3>
        <p className="text-base text-[#66736F]">{description}</p>
      </div>
      {onRetry && (
        <CareButton
          variant="danger"
          size="md"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={onRetry}
        >
          Try Again
        </CareButton>
      )}
    </div>
  );
};
