import React, { useState } from 'react';
import { CareButton } from '@/components/ui/CareButton';
import { CareCard } from '@/components/ui/CareCard';
import { CareInput } from '@/components/ui/CareInput';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareInlineAlert } from '@/components/feedback/CareInlineAlert';
import { checkInService } from '@/services/checkInService';
import type {
  CheckInMood,
  CheckInStep,
  CareNeedCategory,
  ConcernCategory,
  RequestUrgency,
  CheckInResult,
} from '@/types/checkin';
import {
  ArrowLeft,
  ArrowRight,
  Smile,
  Meh,
  Frown,
  AlertTriangle,
  Pill,
  Calendar,
  Car,
  ShoppingBag,
  Home as HomeIcon,
  MessageSquare,
  HelpingHand,
  CheckCircle2,
  PhoneCall,
  ShieldCheck,
  Phone,
  Sparkles,
} from 'lucide-react';

export interface ParentCheckInPageProps {
  onNavigate?: (path: string) => void;
}

const CARE_NEED_OPTIONS: { category: CareNeedCategory; title: string; subtitle: string; icon: React.ReactNode }[] = [
  { category: 'MEDICATION', title: 'Medication', subtitle: 'Refill, reminders, or questions', icon: <Pill className="w-6 h-6 text-[#16866B]" /> },
  { category: 'APPOINTMENT', title: 'Doctor Appointment', subtitle: 'Scheduling or specialist visit', icon: <Calendar className="w-6 h-6 text-[#0284C7]" /> },
  { category: 'TRANSPORTATION', title: 'Transportation / Ride', subtitle: 'Ride to doctor, pharmacy, or clinic', icon: <Car className="w-6 h-6 text-[#8B5CF6]" /> },
  { category: 'ERRANDS', title: 'Groceries / Pharmacy Pickup', subtitle: 'Food, prescription, or home essentials', icon: <ShoppingBag className="w-6 h-6 text-[#D97706]" /> },
  { category: 'HOUSEHOLD', title: 'Household Task', subtitle: 'Light chores, repairs, or maintenance', icon: <HomeIcon className="w-6 h-6 text-[#10B981]" /> },
  { category: 'COMPANIONSHIP', title: 'Companionship / Visit', subtitle: 'Friendly chat or home check-in visit', icon: <MessageSquare className="w-6 h-6 text-[#EC4899]" /> },
  { category: 'OTHER', title: 'Something Else', subtitle: 'Describe your custom care request', icon: <HelpingHand className="w-6 h-6 text-[#16866B]" /> },
];

const CONCERN_OPTIONS: { category: ConcernCategory; title: string; subtitle: string }[] = [
  { category: 'UNWELL', title: 'Feeling unwell or physically exhausted', subtitle: 'Nausea, dizziness, fatigue, or discomfort' },
  { category: 'FALL_MOBILITY', title: 'Fall or mobility difficulty', subtitle: 'Trouble walking, standing, or recent slip' },
  { category: 'MISSED_MED', title: 'Missed or confusing medication', subtitle: 'Unsure about dose or forgot to take prescription' },
  { category: 'APPOINTMENT_ISSUE', title: 'Doctor appointment problem', subtitle: 'Transport cancelled or appointment conflict' },
  { category: 'UNSAFE', title: 'Feeling unsafe or anxious', subtitle: 'Worry about home safety or security' },
  { category: 'OTHER', title: 'Other personal concern', subtitle: 'Something else on your mind' },
];

export const ParentCheckInPage: React.FC<ParentCheckInPageProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<CheckInStep>('MOOD_SELECTION');
  const [mood, setMood] = useState<CheckInMood | null>(null);
  const [selectedNeedCategory, setSelectedNeedCategory] = useState<CareNeedCategory | null>(null);
  const [selectedConcernCategory, setSelectedConcernCategory] = useState<ConcernCategory | null>(null);
  const [whenNeeded, setWhenNeeded] = useState<string>('Today');
  const [contactTarget, setContactTarget] = useState<string>('Primary Guardian (David Woodson)');
  const [wellNotes, setWellNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectMood = (selectedMood: CheckInMood) => {
    setMood(selectedMood);
    setErrorMessage(null);

    if (selectedMood === 'WELL') {
      setStep('WELL_FOLLOW_UP');
    } else if (selectedMood === 'NEED_HELP') {
      setStep('NEED_HELP_CATEGORIES');
    } else if (selectedMood === 'CONCERN') {
      setStep('CONCERN_CATEGORIES');
    } else if (selectedMood === 'URGENT') {
      setStep('URGENT_SAFETY_SELECTION');
    }
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    if (step === 'MOOD_SELECTION') {
      if (onNavigate) {
        onNavigate('/parent/home');
      } else {
        window.location.hash = '#/parent/home';
      }
    } else {
      setStep('MOOD_SELECTION');
    }
  };

  const handleSubmitCheckIn = async (urgencyOverride?: RequestUrgency) => {
    if (!mood) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const urgency: RequestUrgency =
        urgencyOverride ||
        (mood === 'URGENT' ? 'CRITICAL' : mood === 'CONCERN' ? 'HIGH' : mood === 'NEED_HELP' ? 'MEDIUM' : 'LOW');

      const res = await checkInService.submitCheckIn({
        parentId: 'p-1',
        mood,
        needCategory: selectedNeedCategory || undefined,
        concernCategory: selectedConcernCategory || undefined,
        urgency,
        notes: wellNotes || undefined,
        whenNeeded,
        contactTarget,
      });

      setResult(res);
      setIsSubmitting(false);
      setStep('SUCCESS');

      // Auto return to Parent Home after 2 seconds
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('/parent/home');
        } else {
          window.location.hash = '#/parent/home';
        }
      }, 2500);
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Unable to process check-in right now. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-[#E8F4EF]">
      {/* Header Bar */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between py-2">
        <button
          onClick={handlePrevStep}
          className="inline-flex items-center gap-2 text-base font-bold text-[#16866B] hover:text-[#126E58] bg-white px-4 py-2 rounded-full border border-[#E5E7E5] shadow-care-sm transition-all focus-care"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{step === 'MOOD_SELECTION' ? 'Back to Home' : 'Start Over'}</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#16866B] text-white flex items-center justify-center font-black text-base">
            C
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#1D2926]">CareSync Check-In</span>
        </div>

        <CareBadge variant="primary" size="md">
          Daily Safety
        </CareBadge>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl w-full mx-auto my-auto py-6 space-y-6">
        
        {/* Error Alert */}
        {errorMessage && (
          <CareInlineAlert type="warning" title="Check-In Issue" description={errorMessage} />
        )}

        {/* STEP 1: Mood Selection ("How are you feeling today?") */}
        {step === 'MOOD_SELECTION' && (
          <CareCard variant="default" padding="lg" className="space-y-6 shadow-care-lg">
            <div className="space-y-2 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full border border-[#16866B]/20">
                Daily Check-In
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1D2926] tracking-tight">
                How are you feeling today?
              </h1>
              <p className="text-base sm:text-lg text-[#66736F]">
                Tap the option that best describes how you're feeling right now.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: I'm doing well */}
              <button
                type="button"
                onClick={() => handleSelectMood('WELL')}
                className="p-6 rounded-3xl border-2 border-[#16866B]/30 bg-white hover:bg-[#E8F4EF] hover:border-[#16866B] transition-all duration-200 focus-care text-left space-y-3 cursor-pointer shadow-care-sm group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#E8F4EF] text-[#16866B] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Smile className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#1D2926]">I'm doing well</h3>
                  <p className="text-sm text-[#66736F] mt-1">Everything is fine, no extra help needed today.</p>
                </div>
              </button>

              {/* Option 2: I could use some help */}
              <button
                type="button"
                onClick={() => handleSelectMood('NEED_HELP')}
                className="p-6 rounded-3xl border-2 border-[#0284C7]/30 bg-white hover:bg-[#E0F2FE] hover:border-[#0284C7] transition-all duration-200 focus-care text-left space-y-3 cursor-pointer shadow-care-sm group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Meh className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#1D2926]">I could use some help</h3>
                  <p className="text-sm text-[#66736F] mt-1">I need assistance with an errand, ride, or chore.</p>
                </div>
              </button>

              {/* Option 3: Something isn't right */}
              <button
                type="button"
                onClick={() => handleSelectMood('CONCERN')}
                className="p-6 rounded-3xl border-2 border-[#D97706]/30 bg-white hover:bg-[#FEF3C7] hover:border-[#D97706] transition-all duration-200 focus-care text-left space-y-3 cursor-pointer shadow-care-sm group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Frown className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#1D2926]">Something isn't right</h3>
                  <p className="text-sm text-[#66736F] mt-1">I'm feeling unwell or concerned about something.</p>
                </div>
              </button>

              {/* Option 4: I need help now */}
              <button
                type="button"
                onClick={() => handleSelectMood('URGENT')}
                className="p-6 rounded-3xl border-2 border-[#DC2626]/40 bg-[#FEF2F2] hover:bg-[#FEE2E2] hover:border-[#DC2626] transition-all duration-200 focus-care text-left space-y-3 cursor-pointer shadow-care-sm group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#DC2626] text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-care-sm">
                  <AlertTriangle className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#DC2626]">I need help now</h3>
                  <p className="text-sm text-[#991B1B] mt-1">Urgent care alert or immediate family contact needed.</p>
                </div>
              </button>
            </div>
          </CareCard>
        )}

        {/* BRANCH 1: "I'm doing well" Follow-Up */}
        {step === 'WELL_FOLLOW_UP' && (
          <CareCard variant="default" padding="lg" className="space-y-6 shadow-care-lg">
            <div className="space-y-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full">
                Check-In: Doing Well
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D2926]">
                That's wonderful to hear!
              </h2>
              <p className="text-base sm:text-lg text-[#66736F]">
                Is there anything small you'd like CareSync to keep an eye on today? (Optional)
              </p>
            </div>

            <CareInput
              label="Optional Note for Care Circle"
              placeholder="e.g. Took my morning medicines, going for a short walk."
              value={wellNotes}
              onChange={(e) => setWellNotes(e.target.value)}
              inputSize="parent"
            />

            <CareButton
              variant="primary"
              size="parent"
              fullWidth
              loading={isSubmitting}
              icon={<CheckCircle2 className="w-6 h-6" />}
              onClick={() => handleSubmitCheckIn('LOW')}
            >
              Complete Daily Check-In
            </CareButton>
          </CareCard>
        )}

        {/* BRANCH 2A: "I could use some help" Categories */}
        {step === 'NEED_HELP_CATEGORIES' && (
          <CareCard variant="default" padding="lg" className="space-y-6 shadow-care-lg">
            <div className="space-y-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0284C7] bg-[#E0F2FE] px-3 py-1 rounded-full">
                Step 2 of 3: Need Help
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D2926]">
                What do you need help with?
              </h2>
              <p className="text-base sm:text-lg text-[#66736F]">
                Select the care category so CareSync can coordinate with family or community helpers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CARE_NEED_OPTIONS.map((opt) => (
                <button
                  key={opt.category}
                  type="button"
                  onClick={() => {
                    setSelectedNeedCategory(opt.category);
                    setStep('NEED_HELP_TIMING');
                  }}
                  className="p-4 rounded-2xl border-2 border-[#E5E7E5] bg-white hover:border-[#0284C7] hover:bg-[#E0F2FE]/50 transition-all flex items-start gap-3.5 text-left focus-care cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-care-sm">
                    {opt.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-[#1D2926]">{opt.title}</h4>
                    <p className="text-xs text-[#66736F] mt-0.5">{opt.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </CareCard>
        )}

        {/* BRANCH 2B: "I could use some help" Timing */}
        {step === 'NEED_HELP_TIMING' && (
          <CareCard variant="default" padding="lg" className="space-y-6 shadow-care-lg">
            <div className="space-y-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0284C7] bg-[#E0F2FE] px-3 py-1 rounded-full">
                Step 3 of 3: Timing
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D2926]">
                When do you need this help?
              </h2>
              <p className="text-base sm:text-lg text-[#66736F]">
                Selected Category: <span className="font-bold text-[#0284C7]">{selectedNeedCategory}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['Today', 'Tomorrow', 'Later this week', 'Flexible'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setWhenNeeded(t)}
                  className={`p-4 rounded-2xl border-2 font-bold text-center transition-all ${
                    whenNeeded === t
                      ? 'bg-[#E0F2FE] border-[#0284C7] text-[#0284C7]'
                      : 'bg-white border-[#E5E7E5] text-[#1D2926]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <CareButton
              variant="primary"
              size="parent"
              fullWidth
              loading={isSubmitting}
              icon={<ArrowRight className="w-6 h-6" />}
              iconPosition="right"
              onClick={() => handleSubmitCheckIn('MEDIUM')}
            >
              Submit Care Request
            </CareButton>
          </CareCard>
        )}

        {/* BRANCH 3A: "Something isn't right" Categories */}
        {step === 'CONCERN_CATEGORIES' && (
          <CareCard variant="default" padding="lg" className="space-y-6 shadow-care-lg">
            <div className="space-y-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D97706] bg-[#FEF3C7] px-3 py-1 rounded-full">
                Concern Check-In
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D2926]">
                We're here for you. What type of concern is on your mind?
              </h2>
              <p className="text-base sm:text-lg text-[#66736F]">
                CareSync does not provide medical diagnoses. Select a concern category so we can alert your trusted contacts.
              </p>
            </div>

            <div className="space-y-3">
              {CONCERN_OPTIONS.map((c) => (
                <button
                  key={c.category}
                  type="button"
                  onClick={() => {
                    setSelectedConcernCategory(c.category);
                    setStep('CONCERN_CONTACT');
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-[#E5E7E5] bg-white hover:border-[#D97706] hover:bg-[#FEF3C7]/40 transition-all text-left focus-care cursor-pointer"
                >
                  <h4 className="font-bold text-lg text-[#1D2926]">{c.title}</h4>
                  <p className="text-xs sm:text-sm text-[#66736F] mt-0.5">{c.subtitle}</p>
                </button>
              ))}
            </div>
          </CareCard>
        )}

        {/* BRANCH 3B: "Something isn't right" Contact Target */}
        {step === 'CONCERN_CONTACT' && (
          <CareCard variant="default" padding="lg" className="space-y-6 shadow-care-lg">
            <div className="space-y-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D97706] bg-[#FEF3C7] px-3 py-1 rounded-full">
                Escalation Contact
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D2926]">
                Who would you like CareSync to contact?
              </h2>
              <p className="text-base sm:text-lg text-[#66736F]">
                Selected Concern: <span className="font-bold text-[#D97706]">{selectedConcernCategory}</span>
              </p>
            </div>

            <div className="space-y-3">
              {[
                'Primary Guardian (David Woodson - Son)',
                'Full Care Circle (David, Sarah, Priya)',
                'Primary Doctor / Clinic Staff',
              ].map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => setContactTarget(target)}
                  className={`w-full p-4 rounded-2xl border-2 font-bold text-left transition-all ${
                    contactTarget === target
                      ? 'bg-[#FEF3C7] border-[#D97706] text-[#D97706]'
                      : 'bg-white border-[#E5E7E5] text-[#1D2926]'
                  }`}
                >
                  {target}
                </button>
              ))}
            </div>

            <CareButton
              variant="primary"
              size="parent"
              fullWidth
              loading={isSubmitting}
              icon={<ArrowRight className="w-6 h-6" />}
              iconPosition="right"
              onClick={() => handleSubmitCheckIn('HIGH')}
            >
              Alert {contactTarget.split(' ')[0]} Now
            </CareButton>
          </CareCard>
        )}

        {/* BRANCH 4: "I need help now" Safety & Escalation */}
        {step === 'URGENT_SAFETY_SELECTION' && (
          <CareCard variant="soft" padding="lg" className="space-y-6 border-2 border-[#DC2626] shadow-care-lg bg-[#FEF2F2]/30">
            <div className="space-y-2 text-center sm:text-left">
              <CareBadge variant="critical" size="lg" dot>
                URGENT HELP REQUESTED
              </CareBadge>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#DC2626]">
                Immediate Assistance & Safety Choice
              </h2>
              <p className="text-base sm:text-lg text-[#1D2926]">
                CareSync can immediately alert your family care circle. If you are experiencing a life-threatening medical emergency, please use emergency services.
              </p>
            </div>

            {/* Path 1: Emergency Services */}
            <div className="p-5 rounded-2xl bg-white border-2 border-[#DC2626]/40 space-y-3 text-left shadow-care-sm">
              <div className="flex items-center gap-3 text-[#DC2626]">
                <PhoneCall className="w-7 h-7 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-xl">Medical Emergency / Life Threat</h3>
                  <p className="text-xs sm:text-sm text-[#66736F]">Dial regional 911 / emergency services immediately.</p>
                </div>
              </div>
              <a
                href="tel:911"
                className="w-full py-4 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 text-lg shadow-care-md focus-care"
              >
                <Phone className="w-6 h-6" /> Call Emergency Services (911)
              </a>
            </div>

            {/* Path 2: Urgent Family / Volunteer Escalation */}
            <div className="p-5 rounded-2xl bg-white border-2 border-[#D97706]/40 space-y-3 text-left shadow-care-sm">
              <div className="flex items-center gap-3 text-[#D97706]">
                <ShieldCheck className="w-7 h-7 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-xl">Urgent Caregiving Need</h3>
                  <p className="text-xs sm:text-sm text-[#66736F]">Alert David, Sarah, and nearby community volunteers right now.</p>
                </div>
              </div>
              <CareButton
                variant="danger"
                size="parent"
                fullWidth
                loading={isSubmitting}
                icon={<AlertTriangle className="w-6 h-6" />}
                onClick={() => handleSubmitCheckIn('CRITICAL')}
              >
                Alert Family & Volunteer Coordinator
              </CareButton>
            </div>
          </CareCard>
        )}

        {/* STEP 5: Success Transition */}
        {step === 'SUCCESS' && result && (
          <CareCard variant="soft" padding="lg" className="space-y-6 text-center border-2 border-[#16866B] animate-scale-up shadow-care-lg">
            <div className="w-20 h-20 rounded-full bg-[#16866B] text-white flex items-center justify-center mx-auto shadow-care-md">
              <Sparkles className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <CareBadge variant="success" size="lg" dot>
                CHECK-IN RECORDED
              </CareBadge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1D2926]">
                Check-In Complete!
              </h2>
              <p className="text-base text-[#66736F] max-w-md mx-auto">
                CareSync has logged your response and updated your care status for today.
              </p>
            </div>

            {result.escalationStatus && result.escalationStatus !== 'NONE' && (
              <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5] text-sm font-bold text-[#16866B]">
                Status: {result.escalationStatus.replace(/_/g, ' ')}
              </div>
            )}
          </CareCard>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-2xl w-full mx-auto py-3 text-center text-xs text-[#8E9B97]">
        <p>© 2026 CareSync Platform • Parent Check-In & Safety Architecture</p>
      </footer>
    </div>
  );
};
