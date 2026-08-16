import React from 'react';
import { CareButton } from '@/components/ui/CareButton';
import { CareCard } from '@/components/ui/CareCard';
import { ArrowLeft, UserCheck } from 'lucide-react';

export interface ParentOnboardingPlaceholderProps {
  onNavigate?: (path: string) => void;
}

export const ParentOnboardingPlaceholder: React.FC<ParentOnboardingPlaceholderProps> = ({ onNavigate }) => {
  const handleBackToLogin = () => {
    if (onNavigate) {
      onNavigate('/parent/login');
    } else {
      window.location.hash = '#/parent/login';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] flex flex-col justify-between p-6 max-w-lg mx-auto">
      <header className="py-4">
        <CareButton
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-5 h-5" />}
          onClick={handleBackToLogin}
        >
          Back to Login
        </CareButton>
      </header>

      <main className="flex-1 flex flex-col justify-center my-auto">
        <CareCard variant="soft" padding="lg" className="space-y-6 text-center border-2 border-[#16866B]">
          <div className="w-16 h-16 rounded-full bg-[#16866B] text-white flex items-center justify-center mx-auto shadow-care-sm">
            <UserCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-white px-3 py-1 rounded-full border border-[#16866B]/20">
              Phase 2C Navigation Contract
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1D2926]">
              Parent Onboarding
            </h2>
            <p className="text-base text-[#66736F]">
              Authentication verified! The Parent Onboarding experience will be implemented next in Phase 2C.
            </p>
          </div>

          <CareButton
            variant="primary"
            size="parent"
            fullWidth
            onClick={handleBackToLogin}
          >
            Return to Authentication
          </CareButton>
        </CareCard>
      </main>

      <footer className="py-4 text-center text-xs text-[#8E9B97]">
        <p>CareSync Phase 2B • Auth Contract Completed</p>
      </footer>
    </div>
  );
};
