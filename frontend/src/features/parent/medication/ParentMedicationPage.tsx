import React, { useState, useEffect } from 'react';
import { CareBottomNavigation } from '@/components/navigation/CareBottomNavigation';
import { CareButton } from '@/components/ui/CareButton';
import { CareCard } from '@/components/ui/CareCard';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareModal } from '@/components/feedback/CareModal';
import { CareToast } from '@/components/feedback/CareToast';
import { CareSkeleton } from '@/components/feedback/CareSkeleton';
import { CareErrorState } from '@/components/feedback/CareErrorState';
import { CareInlineAlert } from '@/components/feedback/CareInlineAlert';

import { medicationService } from '@/services/medicationService';
import type {
  TodayMedicationTimelineResponse,
  MedicationTimelineItem,
  MedicationStatus,
} from '@/types/medication';
import {
  ArrowLeft,
  Pill,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sun,
  Moon,
  Info,
  Sliders,
  Phone,
  HeartHandshake,
} from 'lucide-react';

export interface ParentMedicationPageProps {
  onNavigate?: (path: string) => void;
}

type ViewStateMode = 'NORMAL' | 'ALL_TAKEN' | 'MISSED_WARNING' | 'LOADING' | 'OFFLINE' | 'ERROR';

export const ParentMedicationPage: React.FC<ParentMedicationPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('medication');
  const [timeline, setTimeline] = useState<TodayMedicationTimelineResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewStateMode>('NORMAL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [selectedItemForInstructions, setSelectedItemForInstructions] = useState<MedicationTimelineItem | null>(null);
  const [skipItemModal, setSkipItemModal] = useState<MedicationTimelineItem | null>(null);
  const [skipReason, setSkipReason] = useState<string>('Not feeling well');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await medicationService.getTodayMedicationTimeline('p-1');
        setTimeline(data);
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

  const handleBackToHome = () => {
    if (onNavigate) {
      onNavigate('/parent/home');
    } else {
      window.location.hash = '#/parent/home';
    }
  };

  const handleRecordTaken = async (item: MedicationTimelineItem) => {
    await medicationService.recordMedicationEvent({ eventId: item.event.id, status: 'TAKEN' });
    setTimeline((prev) => {
      if (!prev) return null;
      const updatedItems = prev.items.map((i) =>
        i.event.id === item.event.id
          ? {
              ...i,
              event: {
                ...i.event,
                status: 'TAKEN' as MedicationStatus,
                recordedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            }
          : i
      );
      const takenCount = updatedItems.filter((i) => i.event.status === 'TAKEN').length;
      return { ...prev, items: updatedItems, totalTaken: takenCount };
    });
    showToast(`${item.medication.name} recorded as taken ✓`);
  };

  const handleConfirmSkip = async () => {
    if (!skipItemModal) return;
    await medicationService.recordMedicationEvent({
      eventId: skipItemModal.event.id,
      status: 'SKIPPED',
      notes: skipReason,
    });

    setTimeline((prev) => {
      if (!prev) return null;
      const updatedItems = prev.items.map((i) =>
        i.event.id === skipItemModal.event.id
          ? {
              ...i,
              event: { ...i.event, status: 'SKIPPED' as MedicationStatus, notes: skipReason },
            }
          : i
      );
      return { ...prev, items: updatedItems };
    });

    setSkipItemModal(null);
    showToast(`${skipItemModal.medication.name} recorded as skipped`);
  };

  const renderStatusBadge = (status: MedicationStatus) => {
    switch (status) {
      case 'TAKEN':
        return <CareBadge variant="success" size="md" dot>Taken</CareBadge>;
      case 'DUE':
        return <CareBadge variant="primary" size="md" dot>Due Now</CareBadge>;
      case 'SCHEDULED':
        return <CareBadge variant="neutral" size="md">Scheduled</CareBadge>;
      case 'SKIPPED':
        return <CareBadge variant="warning" size="md">Skipped</CareBadge>;
      case 'MISSED':
        return <CareBadge variant="warning" size="md">Not Recorded</CareBadge>;
      case 'LATE':
        return <CareBadge variant="info" size="md">Taken Late</CareBadge>;
      case 'UNCONFIRMED':
        return <CareBadge variant="soft" size="md">Unconfirmed</CareBadge>;
      default:
        return <CareBadge variant="neutral" size="md">{status}</CareBadge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] pb-24 font-sans selection:bg-[#E8F4EF]">
      {/* Header Bar */}
      <header className="bg-white border-b border-[#E5E7E5] sticky top-0 z-20 shadow-care-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <button
            onClick={handleBackToHome}
            className="inline-flex items-center gap-2 text-base font-bold text-[#16866B] hover:text-[#126E58] bg-[#FAF7F1] px-4 py-2 rounded-full border border-[#E5E7E5] transition-all focus-care"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Home</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#16866B] text-white flex items-center justify-center font-black text-base">
              C
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[#1D2926]">Medications</span>
          </div>

          <CareBadge variant="primary" size="md">
            {timeline ? `${timeline.totalTaken} of ${timeline.totalScheduled} Taken` : 'Schedule'}
          </CareBadge>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* QA State Simulator Selector */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7E5] shadow-care-sm flex items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[#66736F] flex items-center gap-1">
            <Sliders className="w-4 h-4 text-[#16866B]" /> Medication View QA State:
          </span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewStateMode)}
            className="bg-[#FAF7F1] border border-[#CBD5E1] rounded-xl px-3 py-1 font-bold text-[#1D2926]"
          >
            <option value="NORMAL">Normal Timeline (1 Taken, 1 Due, 1 Scheduled)</option>
            <option value="ALL_TAKEN">✓ All Medications Taken Today</option>
            <option value="MISSED_WARNING">⚠️ Unrecorded Dose Alert</option>
            <option value="LOADING">⌛ Loading Skeleton State</option>
            <option value="OFFLINE">📡 Offline / Degraded State</option>
            <option value="ERROR">❌ Error / Retry State</option>
          </select>
        </div>

        {/* Hard Clinical Safety Disclaimer Banner */}
        <div className="bg-[#E8F4EF] p-4 rounded-2xl border border-[#16866B]/30 flex items-start gap-3 text-xs sm:text-sm text-[#1D2926]">
          <ShieldCheck className="w-5 h-5 text-[#16866B] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#16866B]">Safety & Clinical Boundary Notice</p>
            <p className="text-[#66736F] mt-0.5 leading-relaxed">
              CareSync strictly records your medication timeline as prescribed by your clinician. CareSync does not alter prescriptions or give medical advice. Consult your doctor or pharmacist for dosage questions.
            </p>
          </div>
        </div>

        {/* LOADING STATE */}
        {viewMode === 'LOADING' && (
          <div className="space-y-4">
            <CareSkeleton variant="card" className="h-28" />
            <CareSkeleton variant="card" className="h-44" />
            <CareSkeleton variant="card" className="h-44" />
          </div>
        )}

        {/* OFFLINE STATE */}
        {viewMode === 'OFFLINE' && (
          <CareInlineAlert
            type="warning"
            title="Working Offline"
            description="Medication recordings will sync automatically once reconnected. For urgent prescription questions, call your pharmacy or care team directly."
            action={
              <a href="tel:+15552345678" className="bg-[#D97706] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Call Pharmacy
              </a>
            }
          />
        )}

        {/* ERROR STATE */}
        {viewMode === 'ERROR' && (
          <CareErrorState
            title="Unable to Load Medication Timeline"
            description="We experienced a temporary connection issue fetching your medication schedule."
            onRetry={() => setViewMode('NORMAL')}
          />
        )}

        {/* NORMAL TIMELINE CONTENT */}
        {viewMode !== 'LOADING' && viewMode !== 'ERROR' && timeline && (
          <>
            {/* Title & Summary Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#E5E7E5] shadow-care-sm">
              <div className="space-y-1 text-left">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D2926]">
                  Today's Medication Timeline
                </h1>
                <p className="text-sm sm:text-base text-[#66736F]">
                  {timeline.dateLabel} • {viewMode === 'ALL_TAKEN' ? 'All 3 medications recorded' : `${timeline.totalTaken} of ${timeline.totalScheduled} completed`}
                </p>
              </div>

              <CareButton
                variant="soft"
                size="md"
                icon={<HeartHandshake className="w-5 h-5" />}
                onClick={() => setIsHelpModalOpen(true)}
                className="shrink-0"
              >
                Ask Refill Help
              </CareButton>
            </div>

            {/* Unrecorded Dose Warning State Banner */}
            {viewMode === 'MISSED_WARNING' && (
              <CareInlineAlert
                type="warning"
                title="Unrecorded Afternoon Medication"
                description="Metformin (500 mg) was scheduled for 1:00 PM and has not been recorded yet. Please confirm if you have taken or skipped this dose."
              />
            )}

            {/* TIMELINE LIST BY TIME OF DAY */}
            <div className="space-y-6">
              
              {/* MORNING SECTION */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-base font-extrabold text-[#16866B]">
                  <Sun className="w-5 h-5" />
                  <span>Morning Schedule</span>
                </div>

                {timeline.items
                  .filter((i) => i.schedule.timeOfDay === 'MORNING')
                  .map((item) => {
                    const isTaken = viewMode === 'ALL_TAKEN' || item.event.status === 'TAKEN';
                    return (
                      <CareCard
                        key={item.event.id}
                        variant={isTaken ? 'soft' : 'default'}
                        padding="md"
                        className={`space-y-4 transition-all duration-200 ${
                          isTaken ? 'border-[#16866B]/40 bg-[#E8F4EF]/40' : 'border-[#E5E7E5]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-[#E8F4EF] text-[#16866B] flex items-center justify-center shrink-0 shadow-care-sm">
                              <Pill className="w-7 h-7" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-extrabold text-xl text-[#1D2926]">{item.medication.name}</h3>
                                <span className="text-sm font-semibold text-[#66736F]">({item.medication.dosageLabel})</span>
                                {renderStatusBadge(isTaken ? 'TAKEN' : item.event.status)}
                              </div>
                              <p className="text-xs sm:text-sm text-[#66736F] mt-1 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-[#16866B]" /> {item.schedule.timeOfDayLabel}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedItemForInstructions(item)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#16866B] hover:underline"
                          >
                            <Info className="w-4 h-4" /> View Instructions
                          </button>
                        </div>

                        {/* Instructions summary */}
                        <p className="text-sm text-[#1D2926] bg-white p-3 rounded-xl border border-[#E5E7E5]">
                          {item.medication.instructions}
                        </p>

                        {/* Action Buttons */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                          {isTaken ? (
                            <div className="w-full py-3 bg-[#E8F4EF] text-[#16866B] font-bold rounded-2xl text-center flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5" /> Recorded as Taken at {item.event.recordedAt || '08:04 AM'}
                            </div>
                          ) : (
                            <>
                              <CareButton
                                variant="primary"
                                size="parent"
                                fullWidth
                                icon={<CheckCircle2 className="w-6 h-6" />}
                                onClick={() => handleRecordTaken(item)}
                              >
                                Mark as Taken
                              </CareButton>

                              <CareButton
                                variant="soft"
                                size="md"
                                fullWidth
                                onClick={() => setSkipItemModal(item)}
                              >
                                Mark as Skipped
                              </CareButton>
                            </>
                          )}
                        </div>
                      </CareCard>
                    );
                  })}
              </div>

              {/* AFTERNOON SECTION */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-base font-extrabold text-[#0284C7]">
                  <Sun className="w-5 h-5 text-[#0284C7]" />
                  <span>Afternoon Schedule</span>
                </div>

                {timeline.items
                  .filter((i) => i.schedule.timeOfDay === 'AFTERNOON')
                  .map((item) => {
                    const isTaken = viewMode === 'ALL_TAKEN';
                    const currentStatus = viewMode === 'MISSED_WARNING' ? 'MISSED' : isTaken ? 'TAKEN' : item.event.status;
                    return (
                      <CareCard
                        key={item.event.id}
                        variant={currentStatus === 'MISSED' ? 'bordered' : isTaken ? 'soft' : 'default'}
                        padding="md"
                        className="space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 shadow-care-sm">
                              <Pill className="w-7 h-7" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-extrabold text-xl text-[#1D2926]">{item.medication.name}</h3>
                                <span className="text-sm font-semibold text-[#66736F]">({item.medication.dosageLabel})</span>
                                {renderStatusBadge(currentStatus)}
                              </div>
                              <p className="text-xs sm:text-sm text-[#66736F] mt-1 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-[#0284C7]" /> {item.schedule.timeOfDayLabel}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedItemForInstructions(item)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#0284C7] hover:underline"
                          >
                            <Info className="w-4 h-4" /> View Instructions
                          </button>
                        </div>

                        <p className="text-sm text-[#1D2926] bg-white p-3 rounded-xl border border-[#E5E7E5]">
                          {item.medication.instructions}
                        </p>

                        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                          {isTaken ? (
                            <div className="w-full py-3 bg-[#E8F4EF] text-[#16866B] font-bold rounded-2xl text-center flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5" /> Recorded as Taken
                            </div>
                          ) : (
                            <>
                              <CareButton
                                variant="primary"
                                size="parent"
                                fullWidth
                                icon={<CheckCircle2 className="w-6 h-6" />}
                                onClick={() => handleRecordTaken(item)}
                              >
                                Mark as Taken
                              </CareButton>

                              <CareButton
                                variant="soft"
                                size="md"
                                fullWidth
                                onClick={() => setSkipItemModal(item)}
                              >
                                Mark as Skipped
                              </CareButton>
                            </>
                          )}
                        </div>
                      </CareCard>
                    );
                  })}
              </div>

              {/* EVENING SECTION */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-base font-extrabold text-[#8B5CF6]">
                  <Moon className="w-5 h-5 text-[#8B5CF6]" />
                  <span>Evening & Night Schedule</span>
                </div>

                {timeline.items
                  .filter((i) => i.schedule.timeOfDay === 'EVENING' || i.schedule.timeOfDay === 'NIGHT')
                  .map((item) => {
                    const isTaken = viewMode === 'ALL_TAKEN';
                    return (
                      <CareCard key={item.event.id} variant="default" padding="md" className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-[#F3E8FF] text-[#8B5CF6] flex items-center justify-center shrink-0 shadow-care-sm">
                              <Pill className="w-7 h-7" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-extrabold text-xl text-[#1D2926]">{item.medication.name}</h3>
                                <span className="text-sm font-semibold text-[#66736F]">({item.medication.dosageLabel})</span>
                                {renderStatusBadge(isTaken ? 'TAKEN' : item.event.status)}
                              </div>
                              <p className="text-xs sm:text-sm text-[#66736F] mt-1 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-[#8B5CF6]" /> {item.schedule.timeOfDayLabel}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedItemForInstructions(item)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#8B5CF6] hover:underline"
                          >
                            <Info className="w-4 h-4" /> View Instructions
                          </button>
                        </div>

                        <p className="text-sm text-[#1D2926] bg-white p-3 rounded-xl border border-[#E5E7E5]">
                          {item.medication.instructions}
                        </p>

                        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                          {isTaken ? (
                            <div className="w-full py-3 bg-[#E8F4EF] text-[#16866B] font-bold rounded-2xl text-center flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5" /> Recorded as Taken
                            </div>
                          ) : (
                            <>
                              <CareButton
                                variant="primary"
                                size="parent"
                                fullWidth
                                icon={<CheckCircle2 className="w-6 h-6" />}
                                onClick={() => handleRecordTaken(item)}
                              >
                                Mark as Taken
                              </CareButton>

                              <CareButton
                                variant="soft"
                                size="md"
                                fullWidth
                                onClick={() => setSkipItemModal(item)}
                              >
                                Mark as Skipped
                              </CareButton>
                            </>
                          )}
                        </div>
                      </CareCard>
                    );
                  })}
              </div>

            </div>
          </>
        )}
      </main>

      {/* Instructions View Modal */}
      <CareModal
        isOpen={Boolean(selectedItemForInstructions)}
        onClose={() => setSelectedItemForInstructions(null)}
        title={selectedItemForInstructions ? `${selectedItemForInstructions.medication.name} Instructions` : ''}
        description="Authoritative prescription record supplied by your clinician."
      >
        {selectedItemForInstructions && (
          <div className="space-y-4 text-left text-[#1D2926]">
            <div className="bg-[#FAF7F1] p-4 rounded-2xl border border-[#E5E7E5] space-y-2">
              <p className="text-xs font-bold uppercase text-[#16866B]">Dosage & Frequency</p>
              <p className="font-extrabold text-lg">{selectedItemForInstructions.medication.dosageLabel} • {selectedItemForInstructions.schedule.timeOfDayLabel}</p>
              <p className="text-sm text-[#66736F]">{selectedItemForInstructions.medication.instructions}</p>
            </div>

            <div className="bg-[#FAF7F1] p-4 rounded-2xl border border-[#E5E7E5] space-y-1">
              <p className="text-xs font-bold uppercase text-[#66736F]">Prescribing Doctor</p>
              <p className="font-bold text-base">{selectedItemForInstructions.medication.prescribedBy}</p>
              <p className="text-xs text-[#66736F]">{selectedItemForInstructions.medication.pharmacyInfo}</p>
            </div>

            <CareButton
              variant="primary"
              size="parent"
              fullWidth
              onClick={() => setSelectedItemForInstructions(null)}
            >
              Close Instructions
            </CareButton>
          </div>
        )}
      </CareModal>

      {/* Mark as Skipped Modal */}
      <CareModal
        isOpen={Boolean(skipItemModal)}
        onClose={() => setSkipItemModal(null)}
        title={skipItemModal ? `Skip ${skipItemModal.medication.name}?` : ''}
        description="Select a reason for your care timeline record. CareSync does not alter your prescription."
      >
        {skipItemModal && (
          <div className="space-y-4 text-left">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#1D2926]">Reason for Skipping (Optional)</label>
              {[
                'Not feeling well',
                'Physician advised skip',
                'Ran out of medication',
                'Forgot to bring medication',
                'Other reason',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSkipReason(reason)}
                  className={`w-full p-3 rounded-xl border-2 font-semibold text-left transition-all text-sm ${
                    skipReason === reason
                      ? 'bg-[#FEF3C7] border-[#D97706] text-[#D97706]'
                      : 'bg-white border-[#E5E7E5] text-[#1D2926]'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <CareButton
              variant="primary"
              size="parent"
              fullWidth
              onClick={handleConfirmSkip}
            >
              Confirm Skipped Dose
            </CareButton>
          </div>
        )}
      </CareModal>

      {/* Ask Refill Help Modal */}
      <CareModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        title="Medication Refill & Prescription Help"
        description="Request assistance picking up your prescription or contacting your pharmacy."
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-[#66736F]">
            CareSync can alert your family or community helpers to assist with prescription pickups.
          </p>

          <CareButton
            variant="primary"
            size="parent"
            fullWidth
            onClick={() => {
              setIsHelpModalOpen(false);
              showToast('Pharmacy pickup request sent to David Woodson ✓');
            }}
          >
            Ask David for Prescription Pickup
          </CareButton>

          <CareButton
            variant="soft"
            size="md"
            fullWidth
            onClick={() => {
              setIsHelpModalOpen(false);
              showToast('Community volunteer refill request created ✓');
            }}
          >
            Request Volunteer Pharmacy Transport
          </CareButton>
        </div>
      </CareModal>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 sm:right-8 z-50 max-w-md">
          <CareToast type="success" title="Medication Status" message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <CareBottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
