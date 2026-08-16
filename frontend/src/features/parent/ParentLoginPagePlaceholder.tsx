import React from 'react';
import { CareButton } from '@/components/ui/CareButton';
import { CareCard } from '@/components/ui/CareCard';
import { ArrowLeft, Lock } from 'lucide-react';

export interface ParentLoginPagePlaceholderProps {
  onNavigate?: (path: string) => void;
}

export const ParentLoginPagePlaceholder: React.FC<ParentLoginPagePlaceholderProps> = ({ onNavigate }) => {
  const handleBack = () => {
    if (onNavigate) {
      onNavigate('/parent/welcome');
    } else {
      window.location.hash = '#/parent/welcome';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] flex flex-col justify-between p-6 max-w-lg mx-auto">
      <header className="py-4">
        <CareButton
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-5 h-5" />}
          onClick={handleBack}
        >
          Back to Welcome
        </CareButton>
      </header>

      <main className="flex-1 flex flex-col justify-center my-auto">
        <CareCard variant="cream" padding="lg" className="space-y-6 text-center border-2 border-[#16866B]/30">
          <div className="w-16 h-16 rounded-full bg-[#E8F4EF] text-[#16866B] flex items-center justify-center mx-auto shadow-care-sm">
            <Lock className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full">
              Phase 2B Navigation Contract
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1D2926]">
              Parent Sign In
            </h2>
            <p className="text-base text-[#66736F]">
              The Parent Sign In experience will be implemented next in Phase 2B.
            </p>
          </div>

          <CareButton
            variant="primary"
            size="parent"
            fullWidth
            onClick={handleBack}
          >
            Return to Welcome Screen
          </CareButton>
        </CareCard>
      </main>

      <footer className="py-4 text-center text-xs text-[#8E9B97]">
        <p>CareSync Phase 2A • Navigation contract placeholder</p>
      </footer>
    </div>
  );
};
