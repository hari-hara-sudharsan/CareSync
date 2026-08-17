import React, { useState } from 'react';
import { CareButton } from '@/components/ui/CareButton';
import { CareCard } from '@/components/ui/CareCard';
import { CareInput } from '@/components/ui/CareInput';
import { CareSelect } from '@/components/ui/CareSelect';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareInlineAlert } from '@/components/feedback/CareInlineAlert';
import { onboardingService } from '@/services/onboardingService';
import type {
  CareSituationType,
  CareNeedType,
  CareMemberInvite,
  ParentOnboardingProfile,
} from '@/types/onboarding';
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Users,
  UserCheck,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Smile,
  ShieldCheck,
  Pill,
  Calendar,
  ShoppingBag,
  Car,
  Home,
  MessageSquare,
  HelpingHand,
} from 'lucide-react';

export interface ParentOnboardingPageProps {
  onNavigate?: (path: string) => void;
}

const LANGUAGES = [
  { value: 'en', label: '🇺🇸 English' },
  { value: 'es', label: '🇪🇸 Spanish (Español)' },
  { value: 'hi', label: '🇮🇳 Hindi (हिंदी)' },
  { value: 'zh', label: '🇨🇳 Mandarin (中文)' },
  { value: 'tl', label: '🇵🇭 Tagalog' },
  { value: 'fr', label: '🇫🇷 French (Français)' },
];

const CARE_SITUATIONS: { type: CareSituationType; title: string; subtitle: string; icon: React.ReactNode }[] = [
  {
    type: 'FAMILY',
    title: 'Family Members',
    subtitle: 'Daughter, son, spouse, or family guardian',
    icon: <Users className="w-7 h-7 text-[#16866B]" />,
  },
  {
    type: 'FRIENDS',
    title: 'Friends & Neighbors',
    subtitle: 'Trusted local friends or neighbors',
    icon: <Smile className="w-7 h-7 text-[#0284C7]" />,
  },
  {
    type: 'PROFESSIONAL_CAREGIVER',
    title: 'Professional Caregiver',
    subtitle: 'Home nurse, care aide, or hired helper',
    icon: <UserCheck className="w-7 h-7 text-[#8B5CF6]" />,
  },
  {
    type: 'COMMUNITY_VOLUNTEER',
    title: 'Community Volunteer',
    subtitle: 'Verified local neighborhood volunteers',
    icon: <Heart className="w-7 h-7 text-[#EC4899]" />,
  },
  {
    type: 'SELF_MANAGED',
    title: 'I Usually Manage Myself',
    subtitle: 'Independent living with backup coordination',
    icon: <ShieldCheck className="w-7 h-7 text-[#10B981]" />,
  },
  {
    type: 'NEED_VOLUNTEER_MATCH',
    title: 'I Need Help Finding Someone',
    subtitle: 'Connect me with verified community helpers',
    icon: <HelpingHand className="w-7 h-7 text-[#D97706]" />,
  },
];

const CARE_NEEDS: { type: CareNeedType; title: string; subtitle: string; icon: React.ReactNode }[] = [
  {
    type: 'MEDICATION_REMINDERS',
    title: 'Medication Reminders',
    subtitle: 'Daily schedule tracking & refill notifications',
    icon: <Pill className="w-6 h-6 text-[#16866B]" />,
  },
  {
    type: 'DOCTOR_APPOINTMENTS',
    title: 'Doctor Appointments',
    subtitle: 'Specialist visits & transport planning',
    icon: <Calendar className="w-6 h-6 text-[#0284C7]" />,
  },
  {
    type: 'DAILY_CHECK_INS',
    title: 'Daily Safety Check-Ins',
    subtitle: 'Simple 1-tap "I\'m Good" morning check-in',
    icon: <ShieldCheck className="w-6 h-6 text-[#10B981]" />,
  },
  {
    type: 'ERRANDS',
    title: 'Grocery & Pharmacy Errands',
    subtitle: 'Help picking up medicine or essentials',
    icon: <ShoppingBag className="w-6 h-6 text-[#D97706]" />,
  },
  {
    type: 'TRANSPORTATION',
    title: 'Transportation & Rides',
    subtitle: 'Rides to medical appointments or errands',
    icon: <Car className="w-6 h-6 text-[#8B5CF6]" />,
  },
  {
    type: 'COMPANIONSHIP',
    title: 'Companionship & Conversation',
    subtitle: 'Friendly check-in visits or calls',
    icon: <MessageSquare className="w-6 h-6 text-[#EC4899]" />,
  },
  {
    type: 'HOUSEHOLD_HELP',
    title: 'Household Assistance',
    subtitle: 'Light chores or home maintenance help',
    icon: <Home className="w-6 h-6 text-[#16866B]" />,
  },
];

export const ParentOnboardingPage: React.FC<ParentOnboardingPageProps> = ({ onNavigate }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile Form State
  const [profile, setProfile] = useState<ParentOnboardingProfile>({
    fullName: '',
    preferredName: 'Susan',
    preferredLanguage: 'en',
    timezone: 'America/New_York',
    careSituation: undefined,
    careNeeds: ['MEDICATION_REMINDERS', 'DAILY_CHECK_INS'],
    trustedMembers: [],
    isCompleted: false,
  });

  // Invite Form State (Step 4)
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRelation, setInviteRelation] = useState('Son');

  const handleNextStep = async () => {
    setErrorMessage(null);

    if (currentStep === 1) {
      if (!profile.preferredName.trim()) {
        setErrorMessage('Please enter your preferred name so we know what to call you.');
        return;
      }
      setIsSaving(true);
      await onboardingService.saveProfile({
        fullName: profile.fullName || profile.preferredName,
        preferredName: profile.preferredName,
        preferredLanguage: profile.preferredLanguage,
        timezone: profile.timezone,
      });
      setIsSaving(false);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!profile.careSituation) {
        setErrorMessage('Please select who helps with your care today.');
        return;
      }
      setIsSaving(true);
      await onboardingService.saveCareSituation({ careSituation: profile.careSituation });
      setIsSaving(false);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (profile.careNeeds.length === 0) {
        setErrorMessage('Please select at least one item you would like CareSync to help with.');
        return;
      }
      setIsSaving(true);
      await onboardingService.saveCarePreferences({ careNeeds: profile.careNeeds });
      setIsSaving(false);
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setIsSaving(true);
      await onboardingService.completeOnboarding('p-1');
      setIsSaving(false);
      setCurrentStep(5); // Completion State

      // Navigate to Phase 2D Parent Home contract placeholder
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('/parent/home');
        } else {
          window.location.hash = '#/parent/home';
        }
      }, 1500);
    }
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      if (onNavigate) {
        onNavigate('/parent/login');
      } else {
        window.location.hash = '#/parent/login';
      }
    }
  };

  const toggleCareNeed = (need: CareNeedType) => {
    setProfile((prev) => {
      const exists = prev.careNeeds.includes(need);
      const updated = exists ? prev.careNeeds.filter((n) => n !== need) : [...prev.careNeeds, need];
      return { ...prev, careNeeds: updated };
    });
  };

  const handleAddMember = async () => {
    if (!inviteName.trim() || !invitePhone.trim()) {
      setErrorMessage('Please enter both the caregiver name and phone number.');
      return;
    }
    setErrorMessage(null);

    const newInvite: CareMemberInvite = {
      name: inviteName,
      phone: invitePhone,
      relationship: inviteRelation,
      helpPermissions: profile.careNeeds,
    };

    setIsSaving(true);
    await onboardingService.inviteCareMember({ invite: newInvite });
    setIsSaving(false);

    setProfile((prev) => ({ ...prev, trustedMembers: [...prev.trustedMembers, newInvite] }));
    setInviteName('');
    setInvitePhone('');
  };

  const handleRemoveMember = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      trustedMembers: prev.trustedMembers.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] flex flex-col justify-between p-4 sm:p-8 font-sans">
      {/* Top Header Navigation */}
      <header className="max-w-2xl w-full mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevStep}
            className="inline-flex items-center gap-2 text-base font-bold text-[#16866B] hover:text-[#126E58] bg-white px-4 py-2 rounded-full border border-[#E5E7E5] shadow-care-sm transition-all focus-care"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{currentStep === 1 ? 'Back to Login' : 'Previous'}</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#16866B] text-white flex items-center justify-center font-black text-base">
              C
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[#1D2926]">CareSync</span>
          </div>

          {currentStep < 5 && (
            <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full border border-[#16866B]/20">
              Step {currentStep} of 4
            </span>
          )}
        </div>

        {/* Visual Progress Bar */}
        {currentStep < 5 && (
          <div className="w-full bg-[#E5E7E5] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#16866B] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* Main Form Content Container */}
      <main className="max-w-2xl w-full mx-auto my-auto py-6 space-y-6">
        
        {/* Error Alert */}
        {errorMessage && (
          <CareInlineAlert type="warning" title="Care Setup Notice" description={errorMessage} />
        )}

        {/* STEP 1: Basic Profile */}
        {currentStep === 1 && (
          <CareCard variant="default" padding="lg" className="space-y-6 shadow-care-lg">
            <div className="space-y-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full">
                Step 1: Your Profile
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
                What should we call you?
              </h1>
              <p className="text-base sm:text-lg text-[#66736F]">
                We use your preferred name when sending reminders and coordinating care.
              </p>
            </div>

            <div className="space-y-5">
              <CareInput
                label="Preferred First Name"
                placeholder="e.g. Susan, Mom, Grandma"
                value={profile.preferredName}
                onChange={(e) => setProfile({ ...profile, preferredName: e.target.value })}
                inputSize="parent"
                icon={<Smile className="w-6 h-6 text-[#16866B]" />}
              />

              <CareInput
                label="Full Name (Optional)"
                placeholder="e.g. Susan Woodson"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                inputSize="md"
              />

              <CareSelect
                label="Preferred Language"
                options={LANGUAGES}
                value={profile.preferredLanguage}
                onChange={(e) => setProfile({ ...profile, preferredLanguage: e.target.value })}
                inputSize="parent"
              />

              <CareButton
                variant="primary"
                size="parent"
                fullWidth
                loading={isSaving}
                icon={<ArrowRight className="w-6 h-6" />}
                iconPosition="right"
                onClick={handleNextStep}
              >
                Continue to Care Situation
              </CareButton>
            </div>
          </CareCard>
        )}

        {/* STEP 2: Care Situation */}
        {currentStep === 2 && (
          <CareCard variant="default" padding="lg" className="space-y-6 shadow-care-lg">
            <div className="space-y-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full">
                Step 2: Care Situation
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
                Who helps you with your care?
              </h1>
              <p className="text-base sm:text-lg text-[#66736F]">
                CareSync supports parents with family care circles as well as parents seeking community volunteers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CARE_SITUATIONS.map((sit) => {
                const isSelected = profile.careSituation === sit.type;
                return (
                  <button
                    key={sit.type}
                    type="button"
                    onClick={() => setProfile({ ...profile, careSituation: sit.type })}
                    className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 focus-care cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#E8F4EF] border-[#16866B] shadow-care-md scale-[1.02]'
                        : 'bg-white border-[#E5E7E5] hover:border-[#16866B]/40'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-care-sm shrink-0">
                        {sit.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-[#1D2926]">{sit.title}</h3>
                        <p className="text-xs sm:text-sm text-[#66736F] mt-1">{sit.subtitle}</p>
                      </div>
                    </div>

                    <div className="pt-3 flex justify-end">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'bg-[#16866B] border-[#16866B] text-white' : 'border-[#8E9B97]'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <CareButton
              variant="primary"
              size="parent"
              fullWidth
              loading={isSaving}
              disabled={!profile.careSituation}
              icon={<ArrowRight className="w-6 h-6" />}
              iconPosition="right"
              onClick={handleNextStep}
            >
              Continue to Care Preferences
            </CareButton>
          </CareCard>
        )}

        {/* STEP 3: Care Needs & Preferences */}
        {currentStep === 3 && (
          <CareCard variant="default" padding="lg" className="space-y-6 shadow-care-lg">
            <div className="space-y-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full">
                Step 3: Care Preferences
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
                What would you like help with?
              </h1>
              <p className="text-base sm:text-lg text-[#66736F]">
                Select the care tasks you would like CareSync to quietly coordinate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CARE_NEEDS.map((need) => {
                const isChecked = profile.careNeeds.includes(need.type);
                return (
                  <button
                    key={need.type}
                    type="button"
                    onClick={() => toggleCareNeed(need.type)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 focus-care flex items-start gap-3.5 cursor-pointer ${
                      isChecked
                        ? 'bg-[#E8F4EF] border-[#16866B] shadow-care-sm'
                        : 'bg-white border-[#E5E7E5] hover:border-[#16866B]/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-care-sm">
                      {need.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base text-[#1D2926]">{need.title}</h4>
                      <p className="text-xs text-[#66736F] mt-0.5">{need.subtitle}</p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        isChecked ? 'bg-[#16866B] border-[#16866B] text-white' : 'border-[#8E9B97]'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <CareButton
              variant="primary"
              size="parent"
              fullWidth
              loading={isSaving}
              disabled={profile.careNeeds.length === 0}
              icon={<ArrowRight className="w-6 h-6" />}
              iconPosition="right"
              onClick={handleNextStep}
            >
              Continue to Care Team Setup
            </CareButton>
          </CareCard>
        )}

        {/* STEP 4: Trusted Care Team Invitation */}
        {currentStep === 4 && (
          <CareCard variant="default" padding="lg" className="space-y-6 shadow-care-lg">
            <div className="space-y-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full">
                Step 4: Care Circle (Optional)
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
                Let's add the people you trust
              </h1>
              <p className="text-base sm:text-lg text-[#66736F]">
                Add family members or guardians who assist you. You can also skip this step and add them later.
              </p>
            </div>

            {/* List of Added Members */}
            {profile.trustedMembers.length > 0 && (
              <div className="space-y-3 bg-[#FAF7F1] p-4 rounded-2xl border border-[#E5E7E5]">
                <h4 className="text-sm font-bold uppercase text-[#16866B]">Your Added Care Team ({profile.trustedMembers.length})</h4>
                <div className="space-y-2">
                  {profile.trustedMembers.map((mem, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E5E7E5]">
                      <div>
                        <p className="font-bold text-[#1D2926]">{mem.name} ({mem.relationship})</p>
                        <p className="text-xs text-[#66736F]">{mem.phone}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(idx)}
                        className="text-[#DC2626] hover:bg-[#FEE2E2] p-2 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Member Form */}
            <div className="space-y-4 bg-white p-5 rounded-2xl border-2 border-[#E5E7E5]">
              <h4 className="text-base font-bold text-[#1D2926] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#16866B]" /> Add Family Member or Caregiver
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CareInput
                  label="Caregiver Name"
                  placeholder="e.g. David Woodson"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  inputSize="md"
                />
                <CareInput
                  label="Phone Number"
                  placeholder="(555) 234-5678"
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  inputSize="md"
                />
              </div>

              <CareSelect
                label="Relationship to You"
                value={inviteRelation}
                onChange={(e) => setInviteRelation(e.target.value)}
                options={[
                  { value: 'Son', label: 'Son' },
                  { value: 'Daughter', label: 'Daughter' },
                  { value: 'Spouse', label: 'Spouse' },
                  { value: 'Sibling', label: 'Sibling / Brother / Sister' },
                  { value: 'Guardian', label: 'Primary Guardian' },
                  { value: 'Professional Caregiver', label: 'Professional Caregiver' },
                  { value: 'Friend', label: 'Friend / Neighbor' },
                ]}
                inputSize="md"
              />

              <CareButton
                variant="soft"
                size="md"
                fullWidth
                icon={<Plus className="w-5 h-5" />}
                onClick={handleAddMember}
                loading={isSaving}
              >
                Add Person to Care Circle
              </CareButton>
            </div>

            <div className="space-y-3 pt-2">
              <CareButton
                variant="primary"
                size="parent"
                fullWidth
                loading={isSaving}
                icon={<CheckCircle2 className="w-6 h-6" />}
                onClick={handleNextStep}
              >
                Complete Care Setup
              </CareButton>

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-3 text-center text-base font-bold text-[#66736F] hover:text-[#1D2926] hover:bg-white rounded-xl transition-colors"
              >
                Skip for now & finish setup
              </button>
            </div>
          </CareCard>
        )}

        {/* STEP 5: Completion Screen */}
        {currentStep === 5 && (
          <CareCard variant="soft" padding="lg" className="space-y-6 text-center border-2 border-[#16866B] animate-scale-up shadow-care-lg">
            <div className="w-20 h-20 rounded-full bg-[#16866B] text-white flex items-center justify-center mx-auto shadow-care-md">
              <Sparkles className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <CareBadge variant="success" size="lg" dot>
                CARE SETUP COMPLETED
              </CareBadge>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2926]">
                You're all set, {profile.preferredName}!
              </h1>
              <p className="text-lg text-[#66736F] max-w-md mx-auto">
                CareSync is ready to quietly keep your everyday care coordinated and connected.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E5E7E5] text-left space-y-3 max-w-md mx-auto shadow-care-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#16866B]">Your Care Profile Summary</h4>
              <p className="text-sm text-[#1D2926] font-semibold">Care Situation: <span className="font-bold text-[#16866B]">{profile.careSituation?.replace(/_/g, ' ')}</span></p>
              <p className="text-sm text-[#1D2926] font-semibold">Active Care Preferences: <span className="font-bold text-[#16866B]">{profile.careNeeds.length} items</span></p>
              <p className="text-sm text-[#1D2926] font-semibold">Trusted Members Added: <span className="font-bold text-[#16866B]">{profile.trustedMembers.length} people</span></p>
            </div>
          </CareCard>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-2xl w-full mx-auto py-3 text-center text-xs text-[#8E9B97]">
        <p>© 2026 CareSync Platform • Progressive Parent Onboarding Architecture</p>
      </footer>
    </div>
  );
};
