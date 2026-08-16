import React, { useState } from 'react';
// UI Base Primitives
import { CareButton } from '@/components/ui/CareButton';
import { CareCard } from '@/components/ui/CareCard';
import { CareInput } from '@/components/ui/CareInput';
import { CareAvatar } from '@/components/ui/CareAvatar';
import { CareStatus } from '@/components/ui/CareStatus';
import { CareTextarea } from '@/components/ui/CareTextarea';
import { CareSelect } from '@/components/ui/CareSelect';
import { CareCheckbox } from '@/components/ui/CareCheckbox';
import { CareRadioGroup } from '@/components/ui/CareRadioGroup';
import { CareSwitch } from '@/components/ui/CareSwitch';
import { CareSearchInput } from '@/components/ui/CareSearchInput';
import { CareOTPInput } from '@/components/ui/CareOTPInput';

// Card System Primitives
import { CareStatusCard } from '@/components/ui/CareStatusCard';
import { CareActionCard } from '@/components/ui/CareActionCard';
import { CareInfoCard } from '@/components/ui/CareInfoCard';
import { CareAlertCard } from '@/components/ui/CareAlertCard';

// Avatar System Primitives
import { AvatarGroup } from '@/components/ui/AvatarGroup';
import { CareMemberAvatar } from '@/components/ui/CareMemberAvatar';

// Feedback & Dialog Primitives
import { CareModal } from '@/components/feedback/CareModal';
import { CareAlertDialog } from '@/components/feedback/CareAlertDialog';
import { CareBottomSheet } from '@/components/feedback/CareBottomSheet';
import { CareToast } from '@/components/feedback/CareToast';
import { CareInlineAlert } from '@/components/feedback/CareInlineAlert';
import { CareEmptyState } from '@/components/feedback/CareEmptyState';
import { CareErrorState } from '@/components/feedback/CareErrorState';
import { CareSkeleton } from '@/components/feedback/CareSkeleton';

// Navigation Primitives
import { CareSectionHeader } from '@/components/navigation/CareSectionHeader';
import { CareTopBar } from '@/components/navigation/CareTopBar';
import { CareBottomNavigation } from '@/components/navigation/CareBottomNavigation';

// Domain Components
import { CheckInCard } from '@/components/care/CheckInCard';
import { DecisionCard } from '@/components/care/DecisionCard';
import { VolunteerMatchCard } from '@/components/care/VolunteerMatchCard';
import { MedicationCard } from '@/components/care/MedicationCard';
import { AppointmentCard } from '@/components/care/AppointmentCard';
import { CareRequestCard } from '@/components/care/CareRequestCard';
import { CareMemberCard } from '@/components/care/CareMemberCard';
import { AgentActivityItem } from '@/components/care/AgentActivityItem';

// Types
import type { CareRequest, DecisionCardData, VolunteerMatch, Medication, Appointment, CareMember, AgentActivity } from '@/types';

import {
  Sparkles,
  Heart,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  User,
  Sliders,
  Pill,
  Info,
} from 'lucide-react';

export const DesignSystemPage: React.FC = () => {
  const [isParentMode, setIsParentMode] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('home');

  // Form states
  const [searchValue, setSearchValue] = useState('');
  const [otpValue, setOtpValue] = useState('429');
  const [selectedRadio, setSelectedRadio] = useState('family');
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [switchChecked, setSwitchChecked] = useState(true);

  // Sample Domain Data
  const sampleDecision: DecisionCardData = {
    id: 'dec-101',
    title: 'Pharmacy Pickup Needed Today',
    parentName: 'Susan Woodson',
    description: 'Susan requires her hypertension refill today at 5:00 PM. Family members (David & Sarah) are unavailable due to work.',
    whySurfaced: 'CareSync matched 3 nearby verified volunteers, but volunteer task assignment requires human guardian approval.',
    recommendation: 'Assign Priya (1.4 km away, 94% reliability, 14 past successful errands).',
    urgency: 'MEDIUM',
    options: [
      { label: 'Approve Priya', action: 'approve_priya', variant: 'primary' },
      { label: 'Select Alternative', action: 'choose_other', variant: 'soft' },
      { label: 'Handle Myself', action: 'handle_self', variant: 'outline' },
    ],
    expiresIn: '2 hours',
  };

  const sampleVolunteer: VolunteerMatch = {
    id: 'vol-42',
    name: 'Priya Sharma',
    distanceKm: 1.4,
    reliabilityPercent: 94,
    tasksCompleted: 14,
    availabilityWindow: 'Today until 6:00 PM',
    matchReason: 'Nearby, available now, specialized in senior pharmacy pickups, 100% on-time record.',
    verificationStatus: 'VERIFIED',
  };

  const sampleMedication: Medication = {
    id: 'med-1',
    name: 'Lisinopril',
    dosage: '10mg Tablet',
    time: '09:00 AM Daily',
    taken: false,
    instructions: 'Take 1 tablet with warm water after breakfast',
    prescribedBy: 'Dr. Sarah Jenkins',
  };

  const sampleAppointment: Appointment = {
    id: 'apt-1',
    title: 'Cardiology Check-Up',
    doctorName: 'Dr. Robert Chen',
    location: 'St. Jude Medical Center, Suite 402',
    dateTime: 'Tomorrow at 10:30 AM',
    type: 'SPECIALIST',
    notes: 'Fast for 8 hours prior to bloodwork.',
    transportRequired: true,
  };

  const sampleRequest: CareRequest = {
    id: 'req-88',
    title: 'Pick up weekly prescriptions',
    category: 'MEDICATION',
    parentId: 'p-1',
    parentName: 'Susan Woodson',
    description: 'Collect Lisinopril and Vitamin D3 from CVS Pharmacy on Main St.',
    status: 'AWAITING_APPROVAL',
    urgency: 'HIGH',
    createdAt: '10 mins ago',
    dueBy: 'Today, 5:00 PM',
  };

  const sampleMember: CareMember = {
    id: 'mem-1',
    name: 'David Woodson',
    relationship: 'Son',
    phone: '+1 (555) 234-5678',
    role: 'PRIMARY_GUARDIAN',
    isAvailable: true,
    location: '2.5 km away',
  };

  const sampleActivity: AgentActivity = {
    id: 'act-1',
    timestamp: '09:04 AM',
    trigger: 'Daily Medication Schedule Check',
    actionExecuted: 'Evaluated care network & generated Decision Card #101',
    toolCalled: 'calculate_match_candidates(parent_id="p-1", task="pharmacy")',
    status: 'NEED_HUMAN',
    summary: 'Family members unavailable. Ranked 3 verified volunteers and surfaced recommendation card to David.',
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className={`min-h-screen bg-[#FAF7F1] text-[#1D2926] pb-24 ${isParentMode ? 'text-lg' : 'text-base'}`}>
      {/* Top Header Navigation */}
      <CareTopBar
        userName="Susan Woodson"
        userRole="Parent Member"
        notificationCount={2}
        onNotificationClick={() => showToast('CareSync Agent checked schedules at 09:04 AM')}
        onSettingsClick={() => showToast('Settings clicked')}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-12">
        {/* 1. BRAND SECTION */}
        <section className="bg-[#16866B] text-white rounded-[32px] p-6 sm:p-10 shadow-care-lg space-y-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
            <Sparkles className="w-64 h-64 text-white" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 bg-white/20 px-3.5 py-1 rounded-full text-xs sm:text-sm font-semibold tracking-wider uppercase backdrop-blur-md">
                <ShieldCheck className="w-4 h-4" /> Section 1: Brand & Core Identity
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                CareSync — Premium Calm Care
              </h1>
              <p className="text-lg sm:text-xl text-[#E8F4EF] opacity-90">
                CareSync builds the coordination network that makes reliable caregiving possible even when family members cannot be physically present.
              </p>
            </div>

            {/* Persona Switcher Toggle */}
            <div className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-md space-y-2 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1">
                <Sliders className="w-4 h-4" /> Accessibility Mode
              </span>
              <div className="flex items-center gap-2">
                <CareButton
                  variant={isParentMode ? 'primary' : 'pill'}
                  size="sm"
                  onClick={() => setIsParentMode(true)}
                  className={isParentMode ? 'bg-white text-[#16866B] hover:bg-white' : 'text-white border-white/40'}
                >
                  Parent UI (Large Touch)
                </CareButton>
                <CareButton
                  variant={!isParentMode ? 'primary' : 'pill'}
                  size="sm"
                  onClick={() => setIsParentMode(false)}
                  className={!isParentMode ? 'bg-white text-[#16866B] hover:bg-white' : 'text-white border-white/40'}
                >
                  Caregiver Standard
                </CareButton>
              </div>
            </div>
          </div>
        </section>

        {/* 2. COLORS SECTION */}
        <section className="space-y-4">
          <CareSectionHeader
            title="2. Colors & Semantic Tokens"
            subtitle="Extensible semantic design tokens for background, surfaces, status, and high-contrast text."
            stepIndicator="COLORS"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <div className="bg-[#FAF7F1] p-4 rounded-2xl border border-[#E5E7E5] space-y-2">
              <div className="w-full h-16 rounded-xl bg-[#FAF7F1] border border-[#E5E7E5] shadow-sm" />
              <div><p className="font-bold text-sm">Warm Cream</p><p className="text-xs text-[#66736F]">#FAF7F1 • Background</p></div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5] space-y-2">
              <div className="w-full h-16 rounded-xl bg-white border border-[#E5E7E5] shadow-sm" />
              <div><p className="font-bold text-sm">Pure White</p><p className="text-xs text-[#66736F]">#FFFFFF • Surface</p></div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5] space-y-2">
              <div className="w-full h-16 rounded-xl bg-[#16866B] shadow-sm" />
              <div><p className="font-bold text-sm text-[#16866B]">Care Green</p><p className="text-xs text-[#66736F]">#16866B • Primary</p></div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5] space-y-2">
              <div className="w-full h-16 rounded-xl bg-[#E8F4EF] border border-[#16866B]/20 shadow-sm" />
              <div><p className="font-bold text-sm">Soft Care Green</p><p className="text-xs text-[#66736F]">#E8F4EF • Soft Surface</p></div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5] space-y-2">
              <div className="w-full h-16 rounded-xl bg-[#1D2926] shadow-sm" />
              <div><p className="font-bold text-sm">Primary Text</p><p className="text-xs text-[#66736F]">#1D2926 • High Contrast</p></div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5] space-y-2">
              <div className="w-full h-16 rounded-xl bg-[#D97706] shadow-sm" />
              <div><p className="font-bold text-sm text-[#D97706]">Warm Amber</p><p className="text-xs text-[#66736F]">#D97706 • Warning</p></div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5] space-y-2">
              <div className="w-full h-16 rounded-xl bg-[#DC2626] shadow-sm" />
              <div><p className="font-bold text-sm text-[#DC2626]">Muted Red</p><p className="text-xs text-[#66736F]">#DC2626 • Critical</p></div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5] space-y-2">
              <div className="w-full h-16 rounded-xl bg-[#0284C7] shadow-sm" />
              <div><p className="font-bold text-sm text-[#0284C7]">Soft Sky</p><p className="text-xs text-[#66736F]">#0284C7 • Informational</p></div>
            </div>
          </div>
        </section>

        {/* 3. TYPOGRAPHY SECTION */}
        <section className="space-y-4">
          <CareSectionHeader
            title="3. Typography Scale (Inter)"
            subtitle="Generous readability hierarchy tuned for elderly parents and fast scanning for caregivers."
            stepIndicator="TYPOGRAPHY"
          />
          <CareCard variant="default" padding="lg" className="space-y-4">
            <div className="border-b border-[#F0ECE1] pb-2"><span className="text-xs text-[#66736F]">Display • 36px</span><h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2926]">Care that stays connected.</h1></div>
            <div className="border-b border-[#F0ECE1] pb-2"><span className="text-xs text-[#66736F]">H1 • 30px</span><h1 className="text-2xl sm:text-3xl font-bold text-[#1D2926]">Everything is handled for today.</h1></div>
            <div className="border-b border-[#F0ECE1] pb-2"><span className="text-xs text-[#66736F]">H2 • 24px</span><h2 className="text-xl sm:text-2xl font-semibold text-[#1D2926]">Pharmacy Pickup for Lisinopril</h2></div>
            <div className="border-b border-[#F0ECE1] pb-2"><span className="text-xs text-[#66736F]">H3 • 20px</span><h3 className="text-lg sm:text-xl font-medium text-[#1D2926]">Daily Check-In & Medication Status</h3></div>
            <div className="border-b border-[#F0ECE1] pb-2"><span className="text-xs text-[#66736F]">Body Large • 18px</span><p className="text-lg text-[#1D2926]">Mom has acknowledged her morning medication. CareSync background agent is active.</p></div>
            <div><span className="text-xs text-[#66736F]">Secondary / Muted • 16px</span><p className="text-base text-[#66736F]">Last checked by CareSync Agent • 09:04 AM</p></div>
          </CareCard>
        </section>

        {/* 4. BUTTON SYSTEM SECTION */}
        <section className="space-y-4">
          <CareSectionHeader
            title="4. Button System"
            subtitle="Parent Large CTAs (52–56px high), pill buttons, outline, ghost, loading, and disabled states."
            stepIndicator="BUTTONS"
          />
          <CareCard variant="default" padding="lg" className="space-y-6">
            <div className="space-y-3">
              <span className="text-sm font-bold text-[#16866B] uppercase tracking-wider block">Parent Primary CTAs (52–56px Height, Min 44px Touch Target)</span>
              <div className="flex flex-wrap items-center gap-4">
                <CareButton variant="primary" size="parent" icon={<Heart className="w-6 h-6" />}>Parent Primary Action</CareButton>
                <CareButton variant="pill" size="parent" icon={<CheckCircle2 className="w-6 h-6 text-[#16866B]" />}>Pill Touch Button</CareButton>
                <CareButton variant="secondary" size="parent">Secondary Action</CareButton>
                <CareButton variant="danger" size="parent" icon={<AlertTriangle className="w-6 h-6" />}>SOS / Urgent Help</CareButton>
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-[#F0ECE1]">
              <span className="text-sm font-bold text-[#66736F] uppercase tracking-wider block">Standard Caregiver Button Variants</span>
              <div className="flex flex-wrap items-center gap-3">
                <CareButton variant="primary" size="md">Primary</CareButton>
                <CareButton variant="soft" size="md">Soft Primary</CareButton>
                <CareButton variant="outline" size="md">Outline</CareButton>
                <CareButton variant="ghost" size="md">Ghost</CareButton>
                <CareButton variant="primary" size="md" loading>Loading</CareButton>
                <CareButton variant="primary" size="md" disabled>Disabled</CareButton>
              </div>
            </div>
          </CareCard>
        </section>

        {/* 5. FORM SYSTEM SECTION */}
        <section className="space-y-4">
          <CareSectionHeader
            title="5. Complete Form System"
            subtitle="Inputs, Textarea, Select, Checkbox, Radio Group, Switch, Search Input, and OTP Verification Code."
            stepIndicator="FORMS"
          />
          <CareCard variant="default" padding="lg" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CareInput label="Parent Full Name" placeholder="e.g. Susan Woodson" inputSize="parent" icon={<User className="w-6 h-6" />} helperText="Parent large 56px input." />
              <CareInput label="Caregiver Email Address" placeholder="david@example.com" inputSize="md" error="Please enter a valid email address." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#F0ECE1]">
              <CareTextarea label="Special Care Instructions" placeholder="Describe any medical or dietary needs..." helperText="Provide clear notes for caregivers or volunteers." />
              <CareSelect
                label="Select Care Category"
                options={[
                  { value: 'medication', label: 'Medication Pickup / Reminder' },
                  { value: 'appointment', label: 'Doctor Visit Transport' },
                  { value: 'errand', label: 'Household Errand' },
                  { value: 'companionship', label: 'Social Visit / Conversation' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#F0ECE1]">
              <CareCheckbox
                label="Family-First Care Network Assignment"
                description="Check availability of sons, daughters, and guardians before matching volunteers."
                checked={checkboxChecked}
                onChange={(e) => setCheckboxChecked(e.target.checked)}
                inputSize="parent"
              />
              <CareSwitch
                label="Agent Automatic Escalation"
                description="Allow CareSync agent to trigger volunteer search if task is unanswered after 30 mins."
                checked={switchChecked}
                onChange={setSwitchChecked}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#F0ECE1]">
              <CareRadioGroup
                name="care-network-type"
                label="Care Network Assignment Strategy"
                selectedValue={selectedRadio}
                onChange={setSelectedRadio}
                options={[
                  { value: 'family', label: 'Family First Strategy', description: 'Always assign family members prior to volunteers.' },
                  { value: 'volunteer', label: 'Verified Volunteer Matching', description: 'Match nearest verified community volunteer.' },
                ]}
              />
              <div className="space-y-4">
                <CareSearchInput value={searchValue} onChange={setSearchValue} />
                <CareOTPInput value={otpValue} onChange={setOtpValue} label="Parent 4-Digit Verification Code" />
              </div>
            </div>
          </CareCard>
        </section>

        {/* 6. CARD SYSTEM SECTION */}
        <section className="space-y-4">
          <CareSectionHeader
            title="6. Card System Primitives"
            subtitle="CareCard, CareStatusCard, CareActionCard, CareInfoCard, and CareAlertCard."
            stepIndicator="CARDS"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CareStatusCard
              title="Medication Handled"
              subtitle="Lisinopril 10mg taken at 09:00 AM"
              icon={<Pill className="w-5 h-5 text-[#16866B]" />}
              status="handled"
              statusText="Handled"
              footerText="Confirmed by Susan • Verified by CareSync Agent"
            />
            <CareActionCard
              title="Ask for Caregiver Help"
              description="Request assistance for groceries, pharmacy pickup, or doctor appointments."
              icon={<Heart className="w-7 h-7" />}
              actionLabel="Create Help Request"
              badgeText="Fast Response"
              onAction={() => showToast('Create Help Request clicked')}
            />
            <CareInfoCard
              title="Weather Advisory for Seniors"
              description="Rain is expected this afternoon. Transport volunteers carry umbrellas."
              icon={<Info className="w-5 h-5 text-[#16866B]" />}
            />
            <CareAlertCard
              type="warning"
              title="Unanswered Check-In Alert"
              description="Parent check-in is pending past 09:30 AM."
              action={<CareButton variant="primary" size="sm" onClick={() => showToast('Notifying family...')}>Notify Circle</CareButton>}
            />
          </div>
        </section>

        {/* 7. STATUS SYSTEM SECTION */}
        <section className="space-y-4">
          <CareSectionHeader
            title="7. Status System (Never Color Alone)"
            subtitle="Every status includes icon + explicit text + visual container treatment."
            stepIndicator="STATUS"
          />
          <CareStatus
            status="handled"
            title="✓ Everything is handled."
            subtitle="All morning medications, check-ins, and appointments are confirmed."
            lastCheckedTime="09:04 AM"
          />
          <CareStatus
            status="needs_attention"
            title="CareSync needs your decision"
            subtitle="Pharmacy pickup for Susan requires human approval for volunteer assignment."
            onReviewClick={() => showToast('Opening Decision Card #101')}
          />
        </section>

        {/* 8. AVATAR SYSTEM SECTION */}
        <section className="space-y-4">
          <CareSectionHeader
            title="8. Avatar System Primitives"
            subtitle="CareAvatar, AvatarGroup, and CareMemberAvatar."
            stepIndicator="AVATARS"
          />
          <CareCard variant="default" padding="lg" className="space-y-6">
            <div className="flex flex-wrap items-center gap-8">
              <div>
                <span className="text-xs text-[#66736F] font-bold uppercase tracking-wider block mb-2">Avatar Sizes & Status</span>
                <div className="flex items-center gap-4">
                  <CareAvatar name="Susan Woodson" size="2xl" status="online" />
                  <CareAvatar name="David Woodson" size="xl" status="online" />
                  <CareAvatar name="Priya Sharma" size="lg" status="busy" />
                  <CareAvatar name="Sarah Jenkins" size="md" status="offline" />
                </div>
              </div>

              <div>
                <span className="text-xs text-[#66736F] font-bold uppercase tracking-wider block mb-2">Avatar Group Overflow</span>
                <AvatarGroup
                  avatars={[
                    { name: 'Susan Woodson' },
                    { name: 'David Woodson' },
                    { name: 'Priya Sharma' },
                    { name: 'Dr. Chen' },
                    { name: 'Sarah Jenkins' },
                  ]}
                  max={3}
                />
              </div>

              <div>
                <span className="text-xs text-[#66736F] font-bold uppercase tracking-wider block mb-2">Care Member Avatar Badge</span>
                <CareMemberAvatar name="David Woodson" role="PRIMARY_GUARDIAN" size="lg" />
              </div>
            </div>
          </CareCard>
        </section>

        {/* 9. DOMAIN COMPONENT SHOWCASE */}
        <section className="space-y-6">
          <CareSectionHeader
            title="9. Real Product Domain Components"
            subtitle="Functional widgets for Decision Cards, Volunteer Matching, Medication & Care Circle."
            stepIndicator="DOMAIN"
          />

          <CheckInCard onCheckInSelect={(f) => showToast(`Selected check-in: ${f}`)} lastCheckInTime="Today, 08:30 AM" />
          <DecisionCard decision={sampleDecision} onOptionSelect={(id, action) => showToast(`Action: ${action} on ${id}`)} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VolunteerMatchCard match={sampleVolunteer} onApprove={(id) => showToast(`Approved volunteer ${id}`)} />
            <MedicationCard medication={sampleMedication} onToggleTaken={(id, current) => showToast(`Toggled ${id}: ${!current}`)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AppointmentCard appointment={sampleAppointment} onRequestRide={(id) => showToast(`Requested ride for ${id}`)} />
            <CareRequestCard request={sampleRequest} onViewDetails={(id) => showToast(`Details for ${id}`)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CareMemberCard member={sampleMember} onCallClick={(p) => showToast(`Calling ${p}...`)} />
            <AgentActivityItem activity={sampleActivity} />
          </div>
        </section>

        {/* 10–14. DIALOGS, ALERTS & FEEDBACK STATES */}
        <section className="space-y-6">
          <CareSectionHeader
            title="10–14. Dialogs, Alerts, Loading & System Feedback"
            subtitle="Modals, Confirmation Alerts, Bottom Sheets, Toasts, Inline Alerts, Skeletons, Empty & Error States."
            stepIndicator="FEEDBACK"
          />

          <CareCard variant="default" padding="lg" className="space-y-4">
            <h4 className="font-bold text-[#1D2926]">Dialog & Sheet Triggers</h4>
            <div className="flex flex-wrap items-center gap-4">
              <CareButton variant="primary" size="md" onClick={() => setIsModalOpen(true)}>Open Care Modal</CareButton>
              <CareButton variant="danger" size="md" onClick={() => setIsAlertOpen(true)}>Open Alert Dialog</CareButton>
              <CareButton variant="soft" size="md" onClick={() => setIsSheetOpen(true)}>Open Bottom Sheet</CareButton>
              <CareButton variant="pill" size="md" onClick={() => showToast('CareSync Agent active at 09:04 AM')}>Trigger Toast</CareButton>
            </div>
          </CareCard>

          <CareInlineAlert
            type="info"
            title="Agent Operating Policy"
            description="CareSync agent will surface Decision Cards whenever a task assignment involves an unfamiliar volunteer."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CareEmptyState
              title="No Pending Care Requests"
              description="Everything is currently handled by your care circle."
              actionLabel="Ask for Help"
              onAction={() => showToast('Ask for Help clicked')}
            />
            <CareErrorState
              title="Unable to Sync Care Network"
              description="A temporary network glitch occurred reaching the agent."
              onRetry={() => showToast('Retrying...')}
            />
          </div>

          <CareCard variant="default" padding="lg" className="space-y-3">
            <h4 className="font-bold text-[#1D2926]">Skeleton Placeholder Loading States</h4>
            <CareSkeleton variant="circle" />
            <CareSkeleton variant="text" className="w-3/4" />
            <CareSkeleton variant="card" />
          </CareCard>
        </section>

        {/* 15. ACCESSIBILITY & CARE LANGUAGE */}
        <section className="space-y-4">
          <CareSectionHeader
            title="15. Accessibility & Human Care Language"
            subtitle="Parent-first vocabulary eliminating clinical jargon in favor of reassuring, simple terms."
            stepIndicator="ACCESSIBILITY"
          />
          <CareCard variant="cream" padding="lg" className="space-y-4">
            <h4 className="font-bold text-xl text-[#1D2926]">Care Language Dictionary</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
              <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5]"><span className="text-xs text-[#DC2626] font-mono block">Avoid Technical Jargon</span><p className="font-semibold text-lg line-through text-[#66736F]">Create CareRequest</p><p className="font-bold text-xl text-[#16866B] mt-1">"Ask for Help"</p></div>
              <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5]"><span className="text-xs text-[#DC2626] font-mono block">Avoid Technical Jargon</span><p className="font-semibold text-lg line-through text-[#66736F]">Care Network Graph</p><p className="font-bold text-xl text-[#16866B] mt-1">"Your Care Team"</p></div>
              <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5]"><span className="text-xs text-[#DC2626] font-mono block">Avoid Technical Jargon</span><p className="font-semibold text-lg line-through text-[#66736F]">Task Orchestration Success</p><p className="font-bold text-xl text-[#16866B] mt-1">"Everything is handled"</p></div>
              <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5]"><span className="text-xs text-[#DC2626] font-mono block">Avoid Technical Jargon</span><p className="font-semibold text-lg line-through text-[#66736F]">HITL Escalation Pipeline</p><p className="font-bold text-xl text-[#16866B] mt-1">"CareSync needs your attention"</p></div>
            </div>
          </CareCard>
        </section>
      </main>

      {/* Dialog Components */}
      <CareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Approve Volunteer Task Assignment"
        description="Assign Priya Sharma to pick up Susan's Lisinopril prescription today."
      >
        <p className="text-base text-[#66736F]">Priya is 1.4 km away with 94% recent reliability.</p>
      </CareModal>

      <CareAlertDialog
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onConfirm={() => { setIsAlertOpen(false); showToast('Volunteer suspended!'); }}
        title="Confirm Volunteer Suspension"
        description="Are you sure you want to suspend this volunteer from receiving task assignments?"
        confirmLabel="Suspend Volunteer"
      />

      <CareBottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} title="Select Care Category">
        <p className="text-base text-[#66736F]">Choose the type of help required for your parent today.</p>
      </CareBottomSheet>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 sm:right-8 z-50 max-w-md">
          <CareToast type="success" title="CareSync Action Executed" message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <CareBottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
