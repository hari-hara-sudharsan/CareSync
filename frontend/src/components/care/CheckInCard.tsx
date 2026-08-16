import React from 'react';
import { CareCard } from '@/components/ui/CareCard';
import { CareButton } from '@/components/ui/CareButton';
import { Smile, HelpCircle, AlertCircle, HeartHandshake } from 'lucide-react';

export interface CheckInCardProps {
  onCheckInSelect?: (feeling: 'GOOD' | 'NEED_HELP' | 'NEED_HELP_NOW') => void;
  lastCheckInTime?: string;
  className?: string;
}

export const CheckInCard: React.FC<CheckInCardProps> = ({
  onCheckInSelect,
  lastCheckInTime,
  className,
}) => {
  return (
    <CareCard variant="cream" padding="parent" className={className}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#16866B] text-white flex items-center justify-center shrink-0 shadow-care-sm">
            <HeartHandshake className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-[#1D2926]">Daily Care Check-In</h3>
            <p className="text-base text-[#66736F]">How are you feeling today?</p>
          </div>
        </div>

        {/* 3 Touch Pill Options */}
        <div className="grid grid-cols-1 gap-3 pt-2">
          <CareButton
            variant="pill"
            size="parent"
            icon={<Smile className="w-7 h-7 text-[#16866B]" />}
            onClick={() => onCheckInSelect?.('GOOD')}
            className="w-full bg-[#E8F4EF] hover:bg-[#16866B] hover:text-white border-2 border-[#16866B]/30 justify-start px-6 text-left"
          >
            <div className="flex flex-col">
              <span className="text-xl font-bold">I'm Good</span>
              <span className="text-xs font-normal opacity-80">Everything is fine with me today</span>
            </div>
          </CareButton>

          <CareButton
            variant="pill"
            size="parent"
            icon={<HelpCircle className="w-7 h-7 text-[#D97706]" />}
            onClick={() => onCheckInSelect?.('NEED_HELP')}
            className="w-full bg-[#FEF3C7] hover:bg-[#D97706] hover:text-white border-2 border-[#F59E0B]/30 justify-start px-6 text-left"
          >
            <div className="flex flex-col">
              <span className="text-xl font-bold text-[#1D2926] group-hover:text-white">I Need Some Help</span>
              <span className="text-xs font-normal text-[#66736F] group-hover:text-white">Medication, errand, or task help</span>
            </div>
          </CareButton>

          <CareButton
            variant="danger"
            size="parent"
            icon={<AlertCircle className="w-7 h-7" />}
            onClick={() => onCheckInSelect?.('NEED_HELP_NOW')}
            className="w-full justify-start px-6 text-left shadow-care-lg"
          >
            <div className="flex flex-col">
              <span className="text-xl font-bold">I Need Help Now</span>
              <span className="text-xs font-normal opacity-90">Urgent care circle notification</span>
            </div>
          </CareButton>
        </div>

        {lastCheckInTime && (
          <p className="text-xs text-center text-[#8E9B97] pt-1">
            Last check-in recorded at {lastCheckInTime}
          </p>
        )}
      </div>
    </CareCard>
  );
};
