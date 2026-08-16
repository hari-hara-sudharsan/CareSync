import React, { useEffect } from 'react';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react';
import { CareIconButton } from '@/components/ui/CareIconButton';

export interface CareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'parent';
  className?: string;
}

export const CareModal: React.FC<CareModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    parent: 'max-w-xl sm:max-w-2xl text-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1D2926]/50 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={cn(
          'relative w-full bg-white rounded-[28px] shadow-care-lg border border-[#E5E7E5] p-6 sm:p-8 space-y-6 z-10 animate-scale-up',
          sizes[size],
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {title && <h2 className="text-2xl font-bold text-[#1D2926]">{title}</h2>}
            {description && <p className="text-base text-[#66736F]">{description}</p>}
          </div>
          <CareIconButton
            variant="ghost"
            size="md"
            icon={<X className="w-6 h-6" />}
            label="Close modal"
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div className="space-y-4">{children}</div>

        {/* Footer */}
        {footer && <div className="pt-2 border-t border-[#E5E7E5] flex flex-col sm:flex-row items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};
