import React from 'react';
import { CareModal } from './CareModal';
import { CareButton } from '@/components/ui/CareButton';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export interface CareAlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
}

export const CareAlertDialog: React.FC<CareAlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const icon = variant === 'danger' ? <AlertCircle className="w-8 h-8 text-[#DC2626]" /> : <AlertTriangle className="w-8 h-8 text-[#D97706]" />;

  return (
    <CareModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <CareButton variant="ghost" size="md" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </CareButton>
          <CareButton variant={variant === 'danger' ? 'danger' : 'primary'} size="md" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </CareButton>
        </>
      }
    >
      <div className="flex items-start gap-4 pt-2">
        <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-[#1D2926]">{title}</h3>
          <p className="text-base text-[#66736F]">{description}</p>
        </div>
      </div>
    </CareModal>
  );
};
