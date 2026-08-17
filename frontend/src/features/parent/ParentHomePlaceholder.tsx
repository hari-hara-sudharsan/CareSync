import React from 'react';
import { CareButton } from '@/components/ui/CareButton';
import { CareCard } from '@/components/ui/CareCard';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface ParentHomePlaceholderProps {
  onNavigate?: (path: string) => void;
}

export const ParentHomePlaceholder: React.FC<ParentHomePlaceholderProps> = ({ onNavigate }) => {
  const handleBackToOnboarding = () => {
    if (onNavigate) {
      onNavigate('/parent/onboarding');
    } else {
      window.location.hash = '#/parent/onboarding';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] flex flex-col justify-between p-6 max-w-lg mx-auto font-sans">
      <header className="py-4">
        <CareButton
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-5 h-5" />}
          onClick={handleBackToOnboarding}
        >
          Back to Onboarding
        </CareButton>
      </header>

      <main className="flex-1 flex flex-col justify-center my-auto">
        <CareCard variant="soft" padding="lg" className="space-y-6 text-center border-2 border-[#16866B] shadow-care-lg">
          <div className="w-16 h-16 rounded-full bg-[#16866B] text-white flex items-center justify-center mx-auto shadow-care-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-white px-3 py-1 rounded-full border border-[#16866B]/20">
              Phase 2D Navigation Contract
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1D2926]">
              Parent Home Experience
            </h2>
            <p className="text-base text-[#66736F]">
              Onboarding completed! The signature Parent Home experience ("✓ Everything is handled") will be implemented next in Phase 2D.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5] flex items-center justify-center gap-2 text-xs text-[#16866B] font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>CareSync Quiet Background Agent Ready</span>
          </div>

          <CareButton
            variant="primary"
            size="parent"
            fullWidth
            onClick={handleBackToOnboarding}
          >
            Review Onboarding Setup
          </CareButton>
        </CareCard>
      </main>

      <footer className="py-4 text-center text-xs text-[#8E9B97]">
        <p>CareSync Phase 2C • Onboarding Contract Completed</p>
      </footer>
    </div>
  );
};
