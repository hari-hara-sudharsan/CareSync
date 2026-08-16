import React, { useEffect } from 'react';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react';
import { CareIconButton } from '@/components/ui/CareIconButton';

export interface CareBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const CareBottomSheet: React.FC<CareBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#1D2926]/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet Container */}
      <div
        className={cn(
          'relative w-full max-w-xl bg-white rounded-t-[32px] shadow-care-lg border-t-2 border-[#E5E7E5] p-6 space-y-6 z-10 animate-slide-up max-h-[85vh] overflow-y-auto',
          className
        )}
      >
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-[#CBD5E1] rounded-full mx-auto" />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#F0ECE1] pb-3">
          {title && <h3 className="text-xl sm:text-2xl font-bold text-[#1D2926]">{title}</h3>}
          <CareIconButton variant="ghost" size="md" icon={<X className="w-6 h-6" />} label="Close sheet" onClick={onClose} />
        </div>

        {/* Content */}
        <div className="space-y-4">{children}</div>

        {/* Footer */}
        {footer && <div className="pt-2 border-t border-[#E5E7E5]">{footer}</div>}
      </div>
    </div>
  );
};
