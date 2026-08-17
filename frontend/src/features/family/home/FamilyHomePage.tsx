import React, { useState, useEffect } from 'react';
import { FamilySidebar } from '../navigation/FamilySidebar';
import { FamilyTopBar } from '../navigation/FamilyTopBar';
import { DecisionInboxCard } from './DecisionInboxCard';
import { CareCard } from '@/components/ui/CareCard';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareToast } from '@/components/feedback/CareToast';
import { CareSkeleton } from '@/components/feedback/CareSkeleton';
import { CareErrorState } from '@/components/feedback/CareErrorState';
import { CareInlineAlert } from '@/components/feedback/CareInlineAlert';

import { familyHomeService } from '@/services/familyHomeService';
import { decisionService } from '@/services/decisionService';
import type { FamilyHomeReadModel } from '@/types/family';
import {
  CheckCircle2,
  Pill,
  ShieldCheck,
  Sliders,
  ArrowRight,
  Car,
} from 'lucide-react';

export interface FamilyHomePageProps {
  onNavigate?: (path: string) => void;
}

type ViewStateMode = 'NORMAL' | 'NO_DECISIONS' | 'LOADING' | 'OFFLINE' | 'ERROR';

export const FamilyHomePage: React.FC<FamilyHomePageProps> = ({ onNavigate }) => {
  const [dashboard, setDashboard] = useState<FamilyHomeReadModel | null>(null);
  const [activeParentId, setActiveParentId] = useState<string>('p-1');
  const [viewMode, setViewMode] = useState<ViewStateMode>('NORMAL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await familyHomeService.getDashboard('c-1', activeParentId);
        setDashboard(data);
      } catch {
        setViewMode('ERROR');
      }
    };
    fetchData();
  }, [activeParentId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSelectParent = (parentId: string) => {
    setActiveParentId(parentId);
    showToast(`Switched active care context to ${parentId === 'p-2' ? 'George Miller' : 'Susan Woodson'}`);
  };

  const handleRespondDecision = async (decisionId: string, actionKey: string) => {
    setIsResponding(true);
    await decisionService.respondToDecision(decisionId, actionKey);

    setDashboard((prev) => {
      if (!prev) return null;
      const updatedDecisions = prev.pendingDecisions.filter((d) => d.id !== decisionId);
      return {
        ...prev,
        attentionNeededCount: updatedDecisions.length,
        pendingDecisions: updatedDecisions,
      };
    });

    setIsResponding(false);
    showToast('Decision response recorded ✓');
  };

  const handleNavigateParentView = () => {
    if (onNavigate) {
      onNavigate('/parent/home');
    } else {
      window.location.hash = '#/parent/home';
    }
  };

  const renderDecisionsList = () => {
    if (!dashboard) return null;

    if (viewMode === 'NO_DECISIONS' || dashboard.pendingDecisions.length === 0) {
      return (
        <CareCard variant="cream" padding="lg" className="text-center space-y-3 border-2 border-dashed border-[#16866B]/40">
          <div className="w-14 h-[#3.5rem] rounded-full bg-[#E8F4EF] text-[#16866B] flex items-center justify-center mx-auto shadow-care-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-extrabold text-[#1D2926]">Everything is Under Control</h3>
          <p className="text-base text-[#66736F] max-w-md mx-auto">
            No pending decisions require your human intervention right now. CareSync is quietly monitoring in the background.
          </p>
        </CareCard>
      );
    }

    return (
      <div className="space-y-4">
        {dashboard.pendingDecisions.map((decision) => (
          <DecisionInboxCard
            key={decision.id}
            decision={decision}
            onRespond={handleRespondDecision}
            isSubmitting={isResponding}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] font-sans flex flex-row">
      {/* Desktop Navigation Sidebar */}
      <FamilySidebar
        activeRoute="/family/home"
        onNavigate={onNavigate}
        attentionCount={dashboard?.attentionNeededCount || 0}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar with Active Parent Context */}
        <FamilyTopBar
          caregiverName={dashboard?.caregiverName || 'David Woodson'}
          activeParentId={activeParentId}
          supportedParents={dashboard?.supportedParents || [
            { parentId: 'p-1', name: 'Susan Woodson', relationship: 'Mother', age: 74 },
            { parentId: 'p-2', name: 'George Miller', relationship: 'Father-in-law', age: 81 },
          ]}
          onSelectParent={handleSelectParent}
          attentionCount={dashboard?.attentionNeededCount || 0}
          onNavigateParentView={handleNavigateParentView}
        />

        {/* Content Body */}
        <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-8 text-left w-full">
          
          {/* QA State Simulator Selector */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7E5] shadow-care-sm flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#66736F] flex items-center gap-1">
              <Sliders className="w-4 h-4 text-[#16866B]" /> Family Workspace QA State:
            </span>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewStateMode)}
              className="bg-[#FAF7F1] border border-[#CBD5E1] rounded-xl px-3 py-1 font-bold text-[#1D2926]"
            >
              <option value="NORMAL">Normal Dashboard (2 Decisions Pending)</option>
              <option value="NO_DECISIONS">✓ All Clear (0 Decisions Pending)</option>
              <option value="LOADING">⌛ Loading Skeleton State</option>
              <option value="OFFLINE">📡 Offline / Degraded State</option>
              <option value="ERROR">❌ Error / Retry State</option>
            </select>
          </div>

          {/* Greeting Header */}
          <div className="space-y-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3.5 py-1 rounded-full border border-[#16866B]/20">
              Caregiver Operational Dashboard
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
              Good morning, {dashboard?.caregiverName.split(' ')[0] || 'David'}
            </h1>
            <p className="text-base sm:text-lg text-[#66736F]">
              Here is what needs your attention today for <span className="font-bold text-[#1D2926]">{dashboard?.activeParentName || 'Susan Woodson'}</span>.
            </p>
          </div>

          {/* LOADING STATE */}
          {viewMode === 'LOADING' && (
            <div className="space-y-4">
              <CareSkeleton variant="card" className="h-44" />
              <CareSkeleton variant="card" className="h-32" />
            </div>
          )}

          {/* OFFLINE STATE */}
          {viewMode === 'OFFLINE' && (
            <CareInlineAlert
              type="warning"
              title="Working Offline"
              description="You are currently offline. Pending decision responses will sync automatically once reconnected."
            />
          )}

          {/* ERROR STATE */}
          {viewMode === 'ERROR' && (
            <CareErrorState
              title="Unable to Load Caregiver Dashboard"
              description="We experienced a temporary connection issue fetching the caregiver dashboard read-model."
              onRetry={() => setViewMode('NORMAL')}
            />
          )}

          {/* NORMAL DASHBOARD CONTENT */}
          {viewMode !== 'LOADING' && viewMode !== 'ERROR' && dashboard && (
            <div className="space-y-8">
              
              {/* SECTION 1: DECISION INBOX (NEEDS YOUR ATTENTION) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold text-[#1D2926]">Needs Your Attention</h2>
                    {dashboard.attentionNeededCount > 0 && (
                      <CareBadge variant="critical" size="md">
                        {dashboard.attentionNeededCount} Pending Decision{dashboard.attentionNeededCount > 1 ? 's' : ''}
                      </CareBadge>
                    )}
                  </div>
                  <span className="text-xs font-bold text-[#66736F]">Human-In-The-Loop (HITL) Queue</span>
                </div>

                {renderDecisionsList()}
              </section>

              {/* SECTION 2: TODAY'S CARE SNAPSHOT */}
              <section className="space-y-4">
                <h2 className="text-2xl font-extrabold text-[#1D2926]">Today's Care Status</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Check-In Status */}
                  <CareCard variant="default" padding="md" className="space-y-3 border-2 border-[#E5E7E5] shadow-care-sm">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#E8F4EF] text-[#16866B] flex items-center justify-center font-bold">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <CareBadge variant="success" size="sm">✓ Completed</CareBadge>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-lg text-[#1D2926]">Daily Check-In</h4>
                      <p className="text-xs text-[#66736F]">Recorded at {dashboard.todayCareSummary.checkInTime}</p>
                      <p className="text-sm font-semibold text-[#16866B] bg-[#E8F4EF] p-2 rounded-xl border border-[#16866B]/20 mt-1">
                        "Doing well — took morning medicine and went for a short walk."
                      </p>
                    </div>
                  </CareCard>

                  {/* Card 2: Medication Status */}
                  <CareCard variant="default" padding="md" className="space-y-[#0.75rem] border-2 border-[#E5E7E5] shadow-care-sm">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold">
                        <Pill className="w-5 h-5" />
                      </div>
                      <CareBadge variant="warning" size="sm">
                        {dashboard.todayCareSummary.takenMedsCount}/{dashboard.todayCareSummary.totalMedsCount} Taken
                      </CareBadge>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-lg text-[#1D2926]">Medication Status</h4>
                      <p className="text-xs text-[#66736F]">Lisinopril 10 mg taken after breakfast.</p>
                      <p className="text-xs text-[#D97706] font-bold pt-1">
                        🌙 Evening Metoprolol scheduled for 08:00 PM.
                      </p>
                    </div>
                  </CareCard>

                  {/* Card 3: Appointment & Transport */}
                  <CareCard variant="default" padding="md" className="space-y-3 border-2 border-[#E5E7E5] shadow-care-sm">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold">
                        <Car className="w-5 h-5" />
                      </div>
                      <CareBadge variant="critical" size="sm">Transport Pending</CareBadge>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-lg text-[#1D2926]">Upcoming Appointment</h4>
                      <p className="text-xs font-bold text-[#0284C7]">{dashboard.todayCareSummary.upcomingAppointmentTitle}</p>
                      <p className="text-xs text-[#66736F]">{dashboard.todayCareSummary.upcomingAppointmentTime}</p>
                    </div>
                  </CareCard>
                </div>
              </section>

              {/* SECTION 3: RECENT CARE ACTIVITY (CARE LOG PREVIEW) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-extrabold text-[#1D2926]">Recent Activity</h2>
                  <button
                    onClick={() => onNavigate ? onNavigate('/parent/care-log') : window.location.hash = '#/parent/care-log'}
                    className="text-sm font-bold text-[#16866B] hover:underline inline-flex items-center gap-1"
                  >
                    Full Care Log <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#E5E7E5] shadow-care-sm divide-y divide-[#F0ECE1]">
                  {dashboard.recentActivity.map((act) => (
                    <div key={act.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#8E9B97] shrink-0">{act.timestamp}</span>
                        <p className="text-[#1D2926] font-semibold">{act.text}</p>
                      </div>

                      {act.actorName && (
                        <span className="text-xs font-bold text-[#16866B] bg-[#E8F4EF] px-2.5 py-0.5 rounded-full shrink-0">
                          {act.actorName}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>

            </div>
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 max-w-md">
          <CareToast type="success" title="Family Workspace" message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}
    </div>
  );
};
