import React, { useState, useEffect } from 'react';
import { CareButton } from '@/components/ui/CareButton';
import { CareCard } from '@/components/ui/CareCard';
import { CareInput } from '@/components/ui/CareInput';
import { CareSelect } from '@/components/ui/CareSelect';
import { CareOTPInput } from '@/components/ui/CareOTPInput';
import { CareInlineAlert } from '@/components/feedback/CareInlineAlert';
import { CareModal } from '@/components/feedback/CareModal';
import { authService } from '@/services/authService';
import type { AuthState } from '@/types/auth';
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  ShieldCheck,
  HelpCircle,
  RefreshCw,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

export interface ParentLoginPageProps {
  onNavigate?: (path: string) => void;
}

const COUNTRY_CODES = [
  { value: '+1', label: '🇺🇸 United States (+1)' },
  { value: '+91', label: '🇮🇳 India (+91)' },
  { value: '+44', label: '🇬🇧 United Kingdom (+44)' },
  { value: '+61', label: '🇦🇺 Australia (+61)' },
  { value: '+1-CA', label: '🇨🇦 Canada (+1)' },
];

export const ParentLoginPage: React.FC<ParentLoginPageProps> = ({ onNavigate }) => {
  const [authState, setAuthState] = useState<AuthState>({
    step: 'PHONE_ENTRY',
    countryCode: '+1',
    phoneNumber: '',
    otpCode: '',
    isSendingOtp: false,
    isVerifyingOtp: false,
    resendCountdown: 60,
    canResend: false,
    errorCode: null,
    errorMessage: null,
    attemptCount: 0,
    maxAttempts: 5,
  });

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Resend Countdown Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (authState.step === 'OTP_VERIFICATION' && authState.resendCountdown > 0) {
      timer = setInterval(() => {
        setAuthState((prev) => {
          if (prev.resendCountdown <= 1) {
            return { ...prev, resendCountdown: 0, canResend: true };
          }
          return { ...prev, resendCountdown: prev.resendCountdown - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authState.step, authState.resendCountdown]);

  const handleBackToWelcome = () => {
    if (onNavigate) {
      onNavigate('/parent/welcome');
    } else {
      window.location.hash = '#/parent/welcome';
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = authState.phoneNumber.replace(/\D/g, '');

    if (cleanPhone.length < 10) {
      setAuthState((prev) => ({
        ...prev,
        errorCode: 'INVALID_PHONE',
        errorMessage: 'Please enter a valid 10-digit phone number.',
      }));
      return;
    }

    setAuthState((prev) => ({ ...prev, isSendingOtp: true, errorCode: null, errorMessage: null }));

    const res = await authService.sendOtp({
      countryCode: authState.countryCode,
      phoneNumber: cleanPhone,
    });

    if (res.success) {
      setAuthState((prev) => ({
        ...prev,
        step: 'OTP_VERIFICATION',
        isSendingOtp: false,
        resendCountdown: 60,
        canResend: false,
        otpCode: '',
        attemptCount: 0,
        errorCode: null,
        errorMessage: null,
      }));
    } else {
      setAuthState((prev) => ({
        ...prev,
        isSendingOtp: false,
        errorCode: res.errorCode || 'SERVER_UNAVAILABLE',
        errorMessage: res.errorMessage || 'Unable to request verification code. Please try again.',
      }));
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (authState.otpCode.length < 6) {
      setAuthState((prev) => ({
        ...prev,
        errorCode: 'INCORRECT_OTP',
        errorMessage: 'Please enter the complete 6-digit code sent to your phone.',
      }));
      return;
    }

    setAuthState((prev) => ({ ...prev, isVerifyingOtp: true, errorCode: null, errorMessage: null }));

    const res = await authService.verifyOtp({
      countryCode: authState.countryCode,
      phoneNumber: authState.phoneNumber,
      otpCode: authState.otpCode,
    });

    if (res.success) {
      setAuthState((prev) => ({ ...prev, isVerifyingOtp: false, step: 'SUCCESS', errorCode: null, errorMessage: null }));

      // Navigate to Parent Onboarding/Home after successful authentication
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('/parent/onboarding');
        } else {
          window.location.hash = '#/parent/onboarding';
        }
      }, 800);
    } else {
      setAuthState((prev) => ({
        ...prev,
        isVerifyingOtp: false,
        errorCode: res.errorCode || 'INCORRECT_OTP',
        errorMessage: res.errorMessage || 'Verification failed. Please check the code and try again.',
      }));
    }
  };

  const handleResendOtp = async () => {
    if (!authState.canResend) return;

    setAuthState((prev) => ({ ...prev, isSendingOtp: true, errorCode: null, errorMessage: null }));

    const res = await authService.resendOtp({
      countryCode: authState.countryCode,
      phoneNumber: authState.phoneNumber,
    });

    if (res.success) {
      setAuthState((prev) => ({
        ...prev,
        isSendingOtp: false,
        resendCountdown: 60,
        canResend: false,
        otpCode: '',
        errorCode: null,
        errorMessage: null,
      }));
    } else {
      setAuthState((prev) => ({
        ...prev,
        isSendingOtp: false,
        errorCode: res.errorCode || 'SERVER_UNAVAILABLE',
        errorMessage: res.errorMessage || 'Unable to resend code right now.',
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-[#E8F4EF]">
      {/* Top Header */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between py-2">
        <button
          onClick={handleBackToWelcome}
          className="inline-flex items-center gap-2 text-base font-bold text-[#16866B] hover:text-[#126E58] bg-white px-4 py-2 rounded-full border border-[#E5E7E5] shadow-care-sm transition-all focus-care"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#16866B] text-white flex items-center justify-center font-black text-base">
            C
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#1D2926]">CareSync</span>
        </div>

        <button
          onClick={() => setIsHelpModalOpen(true)}
          className="p-2.5 rounded-full text-[#66736F] hover:text-[#1D2926] hover:bg-white transition-colors focus-care"
          title="Need Help?"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </header>

      {/* Main Form Container */}
      <main className="max-w-xl w-full mx-auto my-auto py-6 space-y-6">

        {/* Auth Error Banner */}
        {authState.errorMessage && (
          <CareInlineAlert
            type={authState.errorCode === 'TOO_MANY_ATTEMPTS' || authState.errorCode === 'ACCOUNT_LOCKED' ? 'critical' : 'warning'}
            title={
              authState.errorCode === 'NETWORK_UNAVAILABLE'
                ? 'Authentication Disconnected'
                : authState.errorCode === 'TOO_MANY_ATTEMPTS'
                ? 'Security Lockout'
                : 'Authentication Issue'
            }
            description={authState.errorMessage}
          />
        )}

        {/* STEP 1: Phone Entry Screen */}
        {authState.step === 'PHONE_ENTRY' && (
          <CareCard variant="default" padding="lg" className="space-y-6 shadow-care-lg">
            <div className="space-y-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full">
                Parent Sign In
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
                Welcome back
              </h1>
              <p className="text-base sm:text-lg text-[#66736F]">
                Let's get you back to your care. Enter your phone number to receive a secure 6-digit code.
              </p>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="block font-bold text-[#1D2926] text-base">Country & Region</label>
                <CareSelect
                  options={COUNTRY_CODES}
                  value={authState.countryCode}
                  onChange={(e) => setAuthState((prev) => ({ ...prev, countryCode: e.target.value }))}
                  inputSize="parent"
                />
              </div>

              <CareInput
                label="Mobile Phone Number"
                placeholder="(555) 000-0000"
                type="tel"
                inputMode="numeric"
                value={authState.phoneNumber}
                onChange={(e) => setAuthState((prev) => ({ ...prev, phoneNumber: e.target.value, errorCode: null, errorMessage: null }))}
                inputSize="parent"
                icon={<Phone className="w-6 h-6 text-[#16866B]" />}
              />

              <CareButton
                type="submit"
                variant="primary"
                size="parent"
                fullWidth
                loading={authState.isSendingOtp}
                disabled={!authState.phoneNumber.trim()}
                icon={<ArrowRight className="w-6 h-6" />}
                iconPosition="right"
              >
                {authState.isSendingOtp ? 'Sending Code...' : 'Continue to Verification'}
              </CareButton>
            </form>

            <div className="pt-4 border-t border-[#F0ECE1] space-y-3 text-center">
              <button
                onClick={() => setIsHelpModalOpen(true)}
                className="text-base font-bold text-[#16866B] hover:underline inline-flex items-center gap-1"
              >
                <UserCheck className="w-4 h-4" /> Sign in as Guardian or Caregiver instead
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-[#8E9B97]">
                <ShieldCheck className="w-4 h-4 text-[#16866B]" />
                <span>Encrypted & private — your number is strictly used for secure access.</span>
              </div>
            </div>
          </CareCard>
        )}

        {/* STEP 2: OTP Verification Screen */}
        {authState.step === 'OTP_VERIFICATION' && (
          <CareCard variant="default" padding="lg" className="space-y-6 shadow-care-lg">
            <div className="space-y-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full">
                Step 2 of 2
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
                Enter Verification Code
              </h1>
              <p className="text-base sm:text-lg text-[#66736F]">
                We sent a 6-digit security code to{' '}
                <span className="font-bold text-[#1D2926]">
                  {authState.countryCode} {authState.phoneNumber}
                </span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <CareOTPInput
                length={6}
                value={authState.otpCode}
                onChange={(code) => setAuthState((prev) => ({ ...prev, otpCode: code, errorCode: null, errorMessage: null }))}
                error={authState.errorCode ? authState.errorMessage || undefined : undefined}
              />

              <CareButton
                type="submit"
                variant="primary"
                size="parent"
                fullWidth
                loading={authState.isVerifyingOtp}
                disabled={authState.otpCode.length < 6}
                icon={<CheckCircle2 className="w-6 h-6" />}
              >
                {authState.isVerifyingOtp ? 'Verifying Code...' : 'Verify & Sign In'}
              </CareButton>
            </form>

            <div className="pt-4 border-t border-[#F0ECE1] space-y-4 text-center">
              {/* Resend OTP button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!authState.canResend || authState.isSendingOtp}
                  className="font-bold text-[#16866B] disabled:text-[#8E9B97] hover:underline inline-flex items-center gap-1.5 focus-care"
                >
                  <RefreshCw className={`w-4 h-4 ${authState.isSendingOtp ? 'animate-spin' : ''}`} />
                  {authState.canResend ? 'Resend Verification Code' : `Resend code in ${authState.resendCountdown}s`}
                </button>

                <button
                  type="button"
                  onClick={() => setAuthState((prev) => ({ ...prev, step: 'PHONE_ENTRY', otpCode: '', errorCode: null, errorMessage: null }))}
                  className="text-[#66736F] hover:text-[#1D2926] font-medium underline"
                >
                  Change Phone Number
                </button>
              </div>
            </div>
          </CareCard>
        )}

        {/* STEP 3: Success Transition */}
        {authState.step === 'SUCCESS' && (
          <CareCard variant="soft" padding="lg" className="space-y-4 text-center border-2 border-[#16866B] animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-[#16866B] text-white flex items-center justify-center mx-auto shadow-care-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1D2926]">
              Verification Successful!
            </h2>
            <p className="text-base text-[#66736F]">
              Welcome back to CareSync. Transferring to your care setup...
            </p>
          </CareCard>
        )}
      </main>

      {/* Help & Support Modal Dialog */}
      <CareModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        title="Need Help Signing In?"
        description="If you are experiencing difficulty receiving your verification code or logging into CareSync:"
      >
        <div className="space-y-3 text-base text-[#1D2926]">
          <div className="bg-[#FAF7F1] p-4 rounded-2xl border border-[#E5E7E5] space-y-1">
            <p className="font-bold text-[#16866B]">1. Check Mobile Signal</p>
            <p className="text-sm text-[#66736F]">Ensure your mobile device can receive SMS text messages.</p>
          </div>
          <div className="bg-[#FAF7F1] p-4 rounded-2xl border border-[#E5E7E5] space-y-1">
            <p className="font-bold text-[#16866B]">2. Ask a Guardian or Caregiver</p>
            <p className="text-sm text-[#66736F]">Family members can assist you in verifying your phone registration.</p>
          </div>
        </div>
      </CareModal>

      {/* Footer */}
      <footer className="max-w-xl w-full mx-auto py-3 text-center text-xs text-[#8E9B97]">
        <p>© 2026 CareSync Platform • Secure Authentication Architecture</p>
      </footer>
    </div>
  );
};
