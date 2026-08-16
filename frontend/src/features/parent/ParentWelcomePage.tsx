import React from 'react';
import { CareButton } from '@/components/ui/CareButton';
import { WELCOME_CONTENT } from './constants';
import { ArrowRight, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';

export interface ParentWelcomePageProps {
  onNavigate?: (path: string) => void;
}

export const ParentWelcomePage: React.FC<ParentWelcomePageProps> = ({ onNavigate }) => {
  const handleGetStarted = () => {
    if (onNavigate) {
      onNavigate('/parent/login');
    } else {
      window.location.hash = '#/parent/login';
    }
  };

  const handleSignIn = () => {
    if (onNavigate) {
      onNavigate('/parent/login');
    } else {
      window.location.hash = '#/parent/login';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] flex flex-col justify-between selection:bg-[#E8F4EF] selection:text-[#16866B] font-sans antialiased">
      {/* Top Header Bar */}
      <header className="w-full px-5 sm:px-10 py-5 flex items-center justify-between z-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#16866B] text-white flex items-center justify-center font-black text-xl shadow-care-sm">
            C
          </div>
          <div>
            <span className="font-extrabold text-2xl tracking-tight text-[#1D2926] block leading-none">
              {WELCOME_CONTENT.brand}
            </span>
            <span className="text-xs text-[#66736F] font-medium leading-tight">
              {WELCOME_CONTENT.tagline}
            </span>
          </div>
        </div>

        {/* Developer QA shortcut link to /design-system */}
        <button
          onClick={() => onNavigate ? onNavigate('/design-system') : (window.location.hash = '#/design-system')}
          className="text-xs font-semibold text-[#16866B] bg-[#E8F4EF] hover:bg-[#16866B] hover:text-white px-3.5 py-1.5 rounded-full transition-all duration-200 border border-[#16866B]/20 focus-care"
          title="Open Design System Showcase"
        >
          Design System QA
        </button>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-5 sm:px-10 py-4 sm:py-8 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
          
          {/* Mobile Image (Top 40-45% of screen on mobile) */}
          <div className="lg:hidden w-full flex justify-center">
            <div className="relative w-full max-w-md aspect-[4/3] rounded-[28px] overflow-hidden shadow-care-md border-2 border-[#EBE5D8] group">
              <img
                src="/assets/parent_welcome_illustration.jpg"
                alt="Aging parent smiling comfortably with a caring family member in a warm home"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1D2926]/30 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-[#16866B] flex items-center gap-1.5 shadow-care-sm border border-[#16866B]/20">
                <HeartHandshake className="w-4 h-4 text-[#16866B]" />
                <span>Supported & Connected</span>
              </div>
            </div>
          </div>

          {/* Left Column (Content & CTAs) */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8 text-left max-w-xl mx-auto lg:mx-0">
            
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 bg-[#E8F4EF] border border-[#16866B]/30 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold text-[#16866B] shadow-care-sm animate-fade-in">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16866B] animate-pulse" />
              <span>{WELCOME_CONTENT.trustBadge}</span>
            </div>

            {/* Headline & Supporting Text */}
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#1D2926] tracking-tight leading-[1.15]">
                {WELCOME_CONTENT.headline}
              </h1>
              <p className="text-lg sm:text-xl text-[#66736F] leading-relaxed">
                {WELCOME_CONTENT.supportingMessage}
              </p>
            </div>

            {/* CTAs Section */}
            <div className="space-y-3 pt-2">
              <CareButton
                variant="primary"
                size="parent"
                fullWidth
                icon={<ArrowRight className="w-6 h-6" />}
                iconPosition="right"
                onClick={handleGetStarted}
                aria-label="Get Started with CareSync"
                className="shadow-care-lg"
              >
                {WELCOME_CONTENT.primaryCta}
              </CareButton>

              <button
                onClick={handleSignIn}
                className="w-full py-3.5 text-center text-base sm:text-lg font-bold text-[#16866B] hover:text-[#126E58] hover:bg-[#E8F4EF] rounded-2xl transition-colors focus-care select-none min-h-[48px] flex items-center justify-center gap-2"
              >
                <span>{WELCOME_CONTENT.secondaryCta}</span>
              </button>
            </div>

            {/* Subtle Reassurance Footer */}
            <div className="pt-4 border-t border-[#EBE5D8] flex items-center gap-3 text-xs sm:text-sm text-[#8E9B97]">
              <ShieldCheck className="w-5 h-5 text-[#16866B] shrink-0" />
              <span>Private, secure family coordination. No complex setups required.</span>
            </div>
          </div>

          {/* Right Column (Desktop / Tablet Image Showcase) */}
          <div className="hidden lg:flex lg:col-span-6 justify-end relative">
            <div className="relative w-full max-w-lg aspect-[4/3] rounded-[36px] overflow-hidden shadow-care-lg border-4 border-white group">
              <img
                src="/assets/parent_welcome_illustration.jpg"
                alt="Aging parent smiling comfortably with a caring family member in a warm home"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1D2926]/20 via-transparent to-transparent pointer-events-none" />

              {/* Floating Reassurance Pill Badge */}
              <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-care-md border border-[#E5E7E5] flex items-center gap-3 animate-slide-up">
                <div className="w-10 h-10 rounded-full bg-[#16866B] text-white flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1D2926]">✓ Everything is handled</p>
                  <p className="text-xs text-[#66736F]">Quiet coordination in the background</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer copyright */}
      <footer className="w-full px-5 py-4 text-center text-xs text-[#8E9B97] border-t border-[#EBE5D8]">
        <p>© 2026 CareSync Platform. Designed for family care and peace of mind.</p>
      </footer>
    </div>
  );
};
