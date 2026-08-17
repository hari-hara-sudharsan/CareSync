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

import { appointmentService } from '@/services/appointmentService';
import type {
  Appointment,
  TransportationChoice,
  MobilityRequirements,
} from '@/types/appointment';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Car,
  Users,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Sliders,
  HeartHandshake,
  Bus,
  Accessibility,
} from 'lucide-react';

export interface ParentAppointmentPageProps {
  onNavigate?: (path: string) => void;
}

type ViewStateMode = 'NORMAL' | 'REQUESTED_STATE' | 'LOADING' | 'OFFLINE' | 'ERROR';

export const ParentAppointmentPage: React.FC<ParentAppointmentPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [viewMode, setViewMode] = useState<ViewStateMode>('NORMAL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State for Transportation Requirements
  const [selectedAptForTransport, setSelectedAptForTransport] = useState<Appointment | null>(null);
  const [mobilityReqs, setMobilityReqs] = useState<MobilityRequirements>({
    mobilityAssistance: false,
    wheelchairAccessible: false,
    doorToDoor: true,
    escortRequired: false,
    companionRequired: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await appointmentService.getUpcomingAppointments('p-1');
        setAppointments(data);
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

  const handleSelectTransportChoice = async (aptId: string, choice: TransportationChoice) => {
    if (choice === 'NEED_HELP') {
      const apt = appointments.find((a) => a.id === aptId);
      if (apt) {
        setSelectedAptForTransport(apt);
      }
      return;
    }

    try {
      const res = await appointmentService.updateTransportationChoice(aptId, choice);
      setAppointments((prev) =>
        prev.map((a) => (a.id === aptId ? res.appointment : a))
      );

      if (choice === 'FAMILY_DRIVING') {
        showToast('Transportation set to Family Driver (David Woodson)');
      } else if (choice === 'OWN_TRANSPORT') {
        showToast('Recorded as using own transport / taxi');
      } else if (choice === 'PUBLIC_TRANSPORT') {
        showToast('Recorded as using public transportation');
      } else {
        showToast('Transportation choice updated');
      }
    } catch {
      showToast('Unable to update transport choice');
    }
  };

  const handleConfirmTransportRequest = async () => {
    if (!selectedAptForTransport) return;

    try {
      const res = await appointmentService.updateTransportationChoice(
        selectedAptForTransport.id,
        'NEED_HELP',
        mobilityReqs
      );

      setAppointments((prev) =>
        prev.map((a) => (a.id === selectedAptForTransport.id ? res.appointment : a))
      );

      setSelectedAptForTransport(null);
      showToast('Transportation request created! Family care circle and volunteer coordinator notified.');
    } catch {
      showToast('Error submitting transport request');
    }
  };

  const renderTransportBadge = (apt: Appointment) => {
    if (apt.transportationChoice === 'FAMILY_DRIVING') {
      return <CareBadge variant="success" size="md">🚗 Family Driving ({apt.assignedDriverName || 'David'})</CareBadge>;
    }
    if (apt.transportationChoice === 'NEED_HELP') {
      return <CareBadge variant="warning" size="md">🤝 Transport Help Requested</CareBadge>;
    }
    if (apt.transportationChoice === 'OWN_TRANSPORT') {
      return <CareBadge variant="neutral" size="md">🚕 Own Transport</CareBadge>;
    }
    if (apt.transportationChoice === 'PUBLIC_TRANSPORT') {
      return <CareBadge variant="info" size="md">🚌 Public Transport</CareBadge>;
    }
    return <CareBadge variant="warning" size="md">❓ Transportation Not Decided Yet</CareBadge>;
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] pb-24 font-sans selection:bg-[#E8F4EF]">
      {/* Top Header */}
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
            <span className="font-extrabold text-xl tracking-tight text-[#1D2926]">Appointments</span>
          </div>

          <CareBadge variant="primary" size="md">
            {appointments.length} Upcoming
          </CareBadge>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* QA State Simulator Selector */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7E5] shadow-care-sm flex items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[#66736F] flex items-center gap-1">
            <Sliders className="w-4 h-4 text-[#16866B]" /> Appointment View QA State:
          </span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewStateMode)}
            className="bg-[#FAF7F1] border border-[#CBD5E1] rounded-xl px-3 py-1 font-bold text-[#1D2926]"
          >
            <option value="NORMAL">Normal Appointments (1 Not Decided, 1 Family Driver)</option>
            <option value="REQUESTED_STATE">🤝 Transport Request Pending (Volunteer Matching)</option>
            <option value="LOADING">⌛ Loading Skeleton State</option>
            <option value="OFFLINE">📡 Offline / Degraded State</option>
            <option value="ERROR">❌ Error / Retry State</option>
          </select>
        </div>

        {/* Title Header */}
        <div className="space-y-1 text-left">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3.5 py-1 rounded-full border border-[#16866B]/20">
            Care Calendar & Transport
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
            Upcoming Appointments
          </h1>
          <p className="text-base sm:text-lg text-[#66736F]">
            Review your doctor visits and coordinate transportation with your family or volunteer network.
          </p>
        </div>

        {/* Task-Scoped Privacy & Safety Boundary Card */}
        <div className="bg-[#E8F4EF] p-4 rounded-2xl border border-[#16866B]/30 flex items-start gap-3 text-xs sm:text-sm text-[#1D2926]">
          <ShieldCheck className="w-5 h-5 text-[#16866B] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#16866B]">Privacy & Safety Architecture</p>
            <p className="text-[#66736F] mt-0.5 leading-relaxed">
              When requesting transportation help, community volunteers see only task-scoped requirements (pickup neighborhood, clinic name, appointment time, and mobility flags). Full personal records remain private.
            </p>
          </div>
        </div>

        {/* LOADING STATE */}
        {viewMode === 'LOADING' && (
          <div className="space-y-4">
            <CareSkeleton variant="card" className="h-56" />
            <CareSkeleton variant="card" className="h-56" />
          </div>
        )}

        {/* OFFLINE STATE */}
        {viewMode === 'OFFLINE' && (
          <CareInlineAlert
            type="warning"
            title="Working Offline"
            description="You are currently offline. Appointments and transport requests will sync automatically once reconnected. For urgent ride changes, call David directly."
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
            title="Unable to Load Appointments"
            description="We experienced a temporary connection issue fetching your appointment schedule."
            onRetry={() => setViewMode('NORMAL')}
          />
        )}

        {/* NORMAL APPOINTMENTS CONTENT */}
        {viewMode !== 'LOADING' && viewMode !== 'ERROR' && (
          <div className="space-y-6">
            {appointments.map((apt) => {
              const isTransportRequested = viewMode === 'REQUESTED_STATE' || apt.transportationChoice === 'NEED_HELP';

              return (
                <CareCard key={apt.id} variant="default" padding="lg" className="space-y-6 shadow-care-md border-2 border-[#E5E7E5]">
                  {/* Appointment Details Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-left border-b border-[#F0ECE1] pb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold uppercase bg-[#E8F4EF] text-[#16866B] px-3 py-1 rounded-full">
                          {apt.specialty || 'Medical Visit'}
                        </span>
                        {renderTransportBadge(
                          isTransportRequested
                            ? { ...apt, transportationChoice: 'NEED_HELP', transportationStatus: 'REQUESTED' }
                            : apt
                        )}
                      </div>

                      <h2 className="text-2xl font-extrabold text-[#1D2926]">{apt.title}</h2>
                      <p className="text-base font-bold text-[#16866B]">{apt.providerName}</p>

                      <div className="space-y-1 text-sm text-[#66736F] pt-1">
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#16866B]" />
                          <span className="font-semibold text-[#1D2926]">{apt.startsAt.includes('2026-08-18') ? 'Tomorrow at 10:30 AM' : 'Saturday, Aug 22 at 02:00 PM'}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#16866B]" />
                          <span>{apt.locationName} ({apt.address})</span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-[#E8F4EF] text-[#16866B] flex items-center justify-center shadow-care-sm">
                        <Calendar className="w-8 h-8" />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {apt.notes && (
                    <div className="bg-[#FAF7F1] p-3.5 rounded-2xl border border-[#E5E7E5] text-left text-xs sm:text-sm text-[#66736F]">
                      <span className="font-bold text-[#1D2926]">Preparation Notes: </span>
                      {apt.notes}
                    </div>
                  )}

                  {/* Driver Match Info (if Family Matched) */}
                  {apt.transportationChoice === 'FAMILY_DRIVING' && !isTransportRequested && (
                    <div className="bg-[#E8F4EF] p-4 rounded-2xl border border-[#16866B]/30 flex items-center justify-between gap-4 text-left">
                      <div className="space-y-0.5">
                        <p className="text-xs font-extrabold text-[#16866B] uppercase">Confirmed Driver</p>
                        <p className="font-bold text-[#1D2926] text-base">{apt.assignedDriverName}</p>
                        <p className="text-xs text-[#66736F]">Pickup scheduled for {apt.pickupTime || '09:45 AM'}</p>
                      </div>

                      <a
                        href={`tel:${apt.assignedDriverPhone || '+15552345678'}`}
                        className="bg-[#16866B] text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-care-sm focus-care"
                      >
                        <Phone className="w-4 h-4" /> Call Driver
                      </a>
                    </div>
                  )}

                  {/* "How are you getting there?" Transportation Options */}
                  <div className="space-y-3 text-left">
                    <h3 className="text-lg font-extrabold text-[#1D2926]">
                      How are you getting there?
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option 1: Family Member Driving */}
                      <button
                        type="button"
                        onClick={() => handleSelectTransportChoice(apt.id, 'FAMILY_DRIVING')}
                        className={`p-3.5 rounded-2xl border-2 text-left font-bold transition-all focus-care flex items-center gap-3 cursor-pointer ${
                          apt.transportationChoice === 'FAMILY_DRIVING' && !isTransportRequested
                            ? 'bg-[#E8F4EF] border-[#16866B] text-[#16866B]'
                            : 'bg-white border-[#E5E7E5] text-[#1D2926] hover:border-[#16866B]/40'
                        }`}
                      >
                        <Users className="w-5 h-5 shrink-0 text-[#16866B]" />
                        <span>Family Member Driving</span>
                      </button>

                      {/* Option 2: Own Transport */}
                      <button
                        type="button"
                        onClick={() => handleSelectTransportChoice(apt.id, 'OWN_TRANSPORT')}
                        className={`p-3.5 rounded-2xl border-2 text-left font-bold transition-all focus-care flex items-center gap-3 cursor-pointer ${
                          apt.transportationChoice === 'OWN_TRANSPORT' && !isTransportRequested
                            ? 'bg-[#FAF7F1] border-[#1D2926] text-[#1D2926]'
                            : 'bg-white border-[#E5E7E5] text-[#1D2926] hover:border-[#16866B]/40'
                        }`}
                      >
                        <Car className="w-5 h-5 shrink-0 text-[#1D2926]" />
                        <span>Own Transport / Taxi</span>
                      </button>

                      {/* Option 3: Public Transport */}
                      <button
                        type="button"
                        onClick={() => handleSelectTransportChoice(apt.id, 'PUBLIC_TRANSPORT')}
                        className={`p-3.5 rounded-2xl border-2 text-left font-bold transition-all focus-care flex items-center gap-3 cursor-pointer ${
                          apt.transportationChoice === 'PUBLIC_TRANSPORT' && !isTransportRequested
                            ? 'bg-[#E0F2FE] border-[#0284C7] text-[#0284C7]'
                            : 'bg-white border-[#E5E7E5] text-[#1D2926] hover:border-[#16866B]/40'
                        }`}
                      >
                        <Bus className="w-5 h-5 shrink-0 text-[#0284C7]" />
                        <span>Public Transportation</span>
                      </button>

                      {/* Option 4: I Need Help Getting There */}
                      <button
                        type="button"
                        onClick={() => handleSelectTransportChoice(apt.id, 'NEED_HELP')}
                        className={`p-3.5 rounded-2xl border-2 text-left font-bold transition-all focus-care flex items-center gap-3 cursor-pointer ${
                          isTransportRequested
                            ? 'bg-[#FEF3C7] border-[#D97706] text-[#D97706]'
                            : 'bg-white border-[#E5E7E5] text-[#D97706] hover:border-[#D97706]'
                        }`}
                      >
                        <HeartHandshake className="w-5 h-5 shrink-0 text-[#D97706]" />
                        <span>I Need Help Getting There</span>
                      </button>
                    </div>
                  </div>
                </CareCard>
              );
            })}
          </div>
        )}
      </main>

      {/* Transportation Requirements Modal */}
      <CareModal
        isOpen={Boolean(selectedAptForTransport)}
        onClose={() => setSelectedAptForTransport(null)}
        title="Transportation Assistance Request"
        description="Select any mobility or accompaniment requirements for your ride."
      >
        {selectedAptForTransport && (
          <div className="space-y-5 text-left text-[#1D2926]">
            <div className="bg-[#FAF7F1] p-4 rounded-2xl border border-[#E5E7E5] space-y-1">
              <p className="text-xs font-bold uppercase text-[#16866B]">Destination</p>
              <p className="font-extrabold text-base">{selectedAptForTransport.title}</p>
              <p className="text-xs text-[#66736F]">{selectedAptForTransport.locationName}</p>
            </div>

            <div className="space-y-3">
              <label className="block font-bold text-[#1D2926] text-base flex items-center gap-2">
                <Accessibility className="w-5 h-5 text-[#16866B]" /> Mobility & Support Requirements
              </label>

              {[
                { key: 'mobilityAssistance', label: 'Mobility Assistance (Walker / Cane support)' },
                { key: 'wheelchairAccessible', label: 'Wheelchair Accessible Vehicle Required' },
                { key: 'doorToDoor', label: 'Door-to-Door Assistance' },
                { key: 'escortRequired', label: 'Escort into Medical Office Required' },
                { key: 'companionRequired', label: 'Companion / Companion Seat Required' },
              ].map((item) => {
                const k = item.key as keyof MobilityRequirements;
                const isChecked = mobilityReqs[k];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMobilityReqs({ ...mobilityReqs, [k]: !isChecked })}
                    className={`w-full p-3.5 rounded-xl border-2 font-semibold text-left transition-all flex items-center justify-between text-sm ${
                      isChecked
                        ? 'bg-[#E8F4EF] border-[#16866B] text-[#16866B]'
                        : 'bg-white border-[#E5E7E5] text-[#1D2926]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                        isChecked ? 'bg-[#16866B] border-[#16866B] text-white' : 'border-[#8E9B97]'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <CareButton
              variant="primary"
              size="parent"
              fullWidth
              onClick={handleConfirmTransportRequest}
              icon={<HeartHandshake className="w-6 h-6" />}
            >
              Submit Transportation Request
            </CareButton>
          </div>
        )}
      </CareModal>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 sm:right-8 z-50 max-w-md">
          <CareToast type="success" title="Appointment Status" message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <CareBottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
