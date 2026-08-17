import React, { useState, useEffect } from 'react';
import { CareTopBar } from '@/components/navigation/CareTopBar';
import { CareBottomNavigation } from '@/components/navigation/CareBottomNavigation';
import { CareStatus } from '@/components/ui/CareStatus';
import { CareButton } from '@/components/ui/CareButton';
import { CareCard } from '@/components/ui/CareCard';
import { CareModal } from '@/components/feedback/CareModal';
import { CareToast } from '@/components/feedback/CareToast';
import { CareSkeleton } from '@/components/feedback/CareSkeleton';
import { CareErrorState } from '@/components/feedback/CareErrorState';
import { CareInlineAlert } from '@/components/feedback/CareInlineAlert';

// Domain Components
import { CheckInCard } from '@/components/care/CheckInCard';
import { DecisionCard } from '@/components/care/DecisionCard';
import { MedicationCard } from '@/components/care/MedicationCard';
import { AppointmentCard } from '@/components/care/AppointmentCard';
import { CareRequestCard } from '@/components/care/CareRequestCard';
import { CareMemberCard } from '@/components/care/CareMemberCard';

// Service & Types
import { parentHomeService } from '@/services/parentHomeService';
import type { ParentHomeReadModel } from '@/types/home';
import {
  HeartHandshake,
  Pill,
  ShoppingBag,
  Car,
  Home as HomeIcon,
  Sliders,
  Phone,
} from 'lucide-react';

export interface ParentHomePageProps {
  onNavigate?: (path: string) => void;
}

type ViewStateMode = 'HANDLED' | 'ATTENTION' | 'CRITICAL' | 'LOADING' | 'OFFLINE' | 'ERROR';

export const ParentHomePage: React.FC<ParentHomePageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState<ParentHomeReadModel | null>(null);
  const [viewMode, setViewMode] = useState<ViewStateMode>('HANDLED');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const readModel = await parentHomeService.getParentHomeData('p-1');
        setData(readModel);
      } catch {
        setViewMode('ERROR');
      }
    };
    fetchData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleMedication = async (medId: string, currentTaken: boolean) => {
    await parentHomeService.acknowledgeMedication(medId, !currentTaken);
    setData((prev) => {
      if (!prev) return null;
      const updatedMeds = prev.dueMedications.map((m) =>
        m.id === medId ? { ...m, taken: !currentTaken } : m
      );
      return { ...prev, dueMedications: updatedMeds };
    });
    showToast(!currentTaken ? 'Medication recorded as taken ✓' : 'Medication status updated');
  };

  const handleCheckInSelect = async (feeling: 'GOOD' | 'NEED_HELP' | 'NEED_HELP_NOW') => {
    await parentHomeService.submitCheckIn({ parentId: 'p-1', feeling });
    setData((prev) => {
      if (!prev) return null;
      return { ...prev, checkInStatus: feeling === 'NEED_HELP_NOW' ? 'URGENT' : 'COMPLETED' };
    });

    if (feeling === 'GOOD') {
      showToast('Daily check-in recorded. Everything is fine! ✓');
    } else if (feeling === 'NEED_HELP') {
      showToast('Care request submitted. Your care team has been notified.');
    } else {
      showToast('Urgent help alert sent to David and Sarah.');
    }
  };

  const handleDecisionAction = async (decisionId: string, actionKey: string) => {
    await parentHomeService.respondToDecision(decisionId, actionKey);
    showToast(`Decision confirmed: ${actionKey.replace(/_/g, ' ')}`);
    setViewMode('HANDLED');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] pb-24 font-sans selection:bg-[#E8F4EF]">
      {/* Top Header Navigation */}
      <CareTopBar
        userName={data?.parentName || 'Susan Woodson'}
        userRole="Parent Member"
        notificationCount={viewMode === 'ATTENTION' || viewMode === 'CRITICAL' ? 1 : 0}
        onNotificationClick={() => showToast('CareSync Agent checked schedules at 09:04 AM')}
        onSettingsClick={() => onNavigate ? onNavigate('/design-system') : (window.location.hash = '#/design-system')}
      />

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        
        {/* QA State Simulator Selector */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7E5] shadow-care-sm flex items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[#66736F] flex items-center gap-1">
            <Sliders className="w-4 h-4 text-[#16866B]" /> Parent Home View QA State:
          </span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewStateMode)}
            className="bg-[#FAF7F1] border border-[#CBD5E1] rounded-xl px-3 py-1 font-bold text-[#1D2926]"
          >
            <option value="HANDLED">✓ All-Clear ("Everything is handled")</option>
            <option value="ATTENTION">⚠️ Needs Decision (Transport Card)</option>
            <option value="CRITICAL">🚨 Urgent Alert (Unanswered Check-In)</option>
            <option value="LOADING">⌛ Loading Skeleton State</option>
            <option value="OFFLINE">📡 Offline / Degraded State</option>
            <option value="ERROR">❌ Error / Retry State</option>
          </select>
        </div>

        {/* LOADING STATE */}
        {viewMode === 'LOADING' && (
          <div className="space-y-6">
            <CareSkeleton variant="card" className="h-32" />
            <CareSkeleton variant="card" className="h-56" />
            <CareSkeleton variant="card" className="h-44" />
          </div>
        )}

        {/* OFFLINE / DEGRADED STATE */}
        {viewMode === 'OFFLINE' && (
          <CareInlineAlert
            type="warning"
            title="CareSync Working Offline"
            description="You are currently offline. Local check-ins are saved and will sync automatically once connected. In an emergency, dial your care circle directly."
            action={
              <a href="tel:+15552345678" className="bg-[#D97706] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Call David
              </a>
            }
          />
        )}

        {/* ERROR STATE */}
        {viewMode === 'ERROR' && (
          <CareErrorState
            title="Unable to Load Today's Care"
            description="We encountered a temporary connection issue fetching your care status."
            onRetry={() => setViewMode('HANDLED')}
          />
        )}

        {/* NORMAL HOME CONTENT */}
        {viewMode !== 'LOADING' && viewMode !== 'ERROR' && data && (
          <>
            {/* Section 1: Personalized Greeting */}
            <div className="space-y-1 text-left">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3.5 py-1 rounded-full border border-[#16866B]/20">
                Today's Care Overview
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
                {data.greeting}
              </h1>
              <p className="text-base sm:text-lg text-[#66736F]">
                CareSync is quietly keeping your care coordinated around you.
              </p>
            </div>

            {/* Section 2: Signature CareStatus Banner */}
            <CareStatus
              status={
                viewMode === 'CRITICAL'
                  ? 'critical'
                  : viewMode === 'ATTENTION'
                  ? 'needs_attention'
                  : 'handled'
              }
              title={
                viewMode === 'CRITICAL'
                  ? 'Unanswered Check-In Alert'
                  : viewMode === 'ATTENTION'
                  ? 'CareSync needs your decision'
                  : "✓ You're all set"
              }
              subtitle={
                viewMode === 'CRITICAL'
                  ? 'Your morning check-in has not been recorded yet. Please confirm you are okay.'
                  : viewMode === 'ATTENTION'
                  ? 'Tomorrow\'s doctor visit transport requires your human decision.'
                  : 'Everything important is handled for today. All medications and check-ins are up to date.'
              }
              lastCheckedTime={data.lastCheckedTime}
              onReviewClick={viewMode !== 'HANDLED' ? () => showToast('Reviewing Decision Card...') : undefined}
            />

            {/* Section 3: "Ask for Help" Primary Action */}
            <CareCard variant="cream" padding="md" className="border-2 border-[#16866B]/20 shadow-care-md">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-12 h-12 rounded-full bg-[#16866B] text-white flex items-center justify-center shrink-0 shadow-care-sm">
                    <HeartHandshake className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[#1D2926]">Need something today?</h3>
                    <p className="text-sm text-[#66736F]">Request groceries, pharmacy pickup, rides, or chores.</p>
                  </div>
                </div>

                <CareButton
                  variant="primary"
                  size="parent"
                  icon={<HeartHandshake className="w-6 h-6" />}
                  onClick={() => setIsHelpModalOpen(true)}
                  className="w-full sm:w-auto shrink-0 shadow-care-lg"
                >
                  Ask for Help
                </CareButton>
              </div>
            </CareCard>

            {/* Section 4: Attention Decision Cards (Surfaced only when human decision is needed) */}
            {viewMode === 'ATTENTION' && data.attentionCards.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#D97706] block">
                  Action Required
                </span>
                {data.attentionCards.map((dec) => (
                  <DecisionCard
                    key={dec.id}
                    decision={dec}
                    onOptionSelect={(id, actionKey) => handleDecisionAction(id, actionKey)}
                  />
                ))}
              </div>
            )}

            {/* Section 5: Daily Check-In Card */}
            <div className="space-y-3">
              <CheckInCard
                onCheckInSelect={handleCheckInSelect}
                lastCheckInTime={data.lastCheckInTime}
              />
            </div>

            {/* Section 6: Today's Medication & Appointments Schedule */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-[#1D2926]">Today's Schedule</h3>
                <span className="text-xs font-semibold text-[#16866B] bg-[#E8F4EF] px-3 py-1 rounded-full">
                  {data.dueMedications.length} Medications • 1 Appointment
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {data.dueMedications.map((med) => (
                  <MedicationCard
                    key={med.id}
                    medication={med}
                    onToggleTaken={(id, currentTaken) => handleToggleMedication(id, currentTaken)}
                  />
                ))}

                {data.upcomingAppointments.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onRequestRide={(id) => showToast(`Requested transport assistance for appointment ${id}`)}
                  />
                ))}
              </div>
            </div>

            {/* Section 7: Care Requests Status */}
            {data.activeCareRequests.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-[#1D2926]">Active Care Requests</h3>
                {data.activeCareRequests.map((req) => (
                  <CareRequestCard
                    key={req.id}
                    request={req}
                    onViewDetails={(id) => showToast(`Viewing details for care request ${id}`)}
                  />
                ))}
              </div>
            )}

            {/* Section 8: Your Care Team Preview */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-[#1D2926]">Your Care Team</h3>
                  <p className="text-sm text-[#66736F]">People who help coordinate your care.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.careTeam.map((mem) => (
                  <CareMemberCard
                    key={mem.id}
                    member={mem}
                    onCallClick={(phone) => showToast(`Dialing ${mem.name} (${phone})...`)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* "Ask for Help" Modal */}
      <CareModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        title="What do you need help with?"
        description="Select a care task and your care circle will be notified."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {[
            { id: 'pharmacy', title: 'Pharmacy Pickup', icon: <Pill className="w-6 h-6 text-[#16866B]" /> },
            { id: 'grocery', title: 'Grocery Errand', icon: <ShoppingBag className="w-6 h-6 text-[#D97706]" /> },
            { id: 'ride', title: 'Ride / Transport', icon: <Car className="w-6 h-6 text-[#8B5CF6]" /> },
            { id: 'home', title: 'Household Help', icon: <HomeIcon className="w-6 h-6 text-[#10B981]" /> },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setIsHelpModalOpen(false);
                showToast(`Help request submitted for ${cat.title}! Your care team has been notified.`);
              }}
              className="p-4 rounded-2xl border-2 border-[#E5E7E5] hover:border-[#16866B] hover:bg-[#E8F4EF] flex items-center gap-3 text-left transition-all focus-care"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-care-sm">
                {cat.icon}
              </div>
              <span className="font-bold text-lg text-[#1D2926]">{cat.title}</span>
            </button>
          ))}
        </div>
      </CareModal>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 sm:right-8 z-50 max-w-md">
          <CareToast type="success" title="CareSync Status" message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <CareBottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
