import React from 'react';
import type { Medication } from '@/types';
import { CareCard } from '@/components/ui/CareCard';
import { CareButton } from '@/components/ui/CareButton';
import { Pill, CheckCircle2, Clock, Info } from 'lucide-react';

export interface MedicationCardProps {
  medication: Medication;
  onToggleTaken?: (id: string, currentTaken: boolean) => void;
  className?: string;
}

export const MedicationCard: React.FC<MedicationCardProps> = ({
  medication,
  onToggleTaken,
  className,
}) => {
  return (
    <CareCard
      variant={medication.taken ? 'soft' : 'default'}
      padding="md"
      className={className}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Info */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-care-sm ${
              medication.taken
                ? 'bg-[#16866B] text-white'
                : 'bg-[#FEF3C7] text-[#D97706]'
            }`}
          >
            <Pill className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-[#1D2926]">{medication.name}</h3>
              <span className="text-sm font-semibold text-[#66736F] bg-[#FAF7F1] px-2.5 py-0.5 rounded-full border border-[#E5E7E5]">
                {medication.dosage}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#66736F]">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-4 h-4 text-[#16866B]" /> {medication.time}
              </span>
              {medication.prescribedBy && (
                <span>• Prescribed by {medication.prescribedBy}</span>
              )}
            </div>
            {medication.instructions && (
              <p className="text-xs text-[#8E9B97] flex items-center gap-1 pt-0.5">
                <Info className="w-3.5 h-3.5" /> {medication.instructions}
              </p>
            )}
          </div>
        </div>

        {/* Action Toggle Pill */}
        {onToggleTaken && (
          <CareButton
            variant={medication.taken ? 'soft' : 'primary'}
            size="parent"
            icon={medication.taken ? <CheckCircle2 className="w-6 h-6 text-[#16866B]" /> : <Pill className="w-6 h-6" />}
            onClick={() => onToggleTaken(medication.id, medication.taken)}
            className="w-full sm:w-auto shrink-0 min-w-[160px]"
          >
            {medication.taken ? 'Taken' : 'Take Medicine'}
          </CareButton>
        )}
      </div>
    </CareCard>
  );
};
