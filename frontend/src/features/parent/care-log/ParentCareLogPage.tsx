import React, { useState, useEffect } from 'react';
import { CareBottomNavigation } from '@/components/navigation/CareBottomNavigation';
import { CareButton } from '@/components/ui/CareButton';
import { CareCard } from '@/components/ui/CareCard';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareInput } from '@/components/ui/CareInput';
import { CareToast } from '@/components/feedback/CareToast';
import { CareSkeleton } from '@/components/feedback/CareSkeleton';
import { CareErrorState } from '@/components/feedback/CareErrorState';
import { CareInlineAlert } from '@/components/feedback/CareInlineAlert';

import { careLogService } from '@/services/careLogService';
import type { CareLogEntry, CareLogEntryType } from '@/types/care-log';
import {
  ArrowLeft,
  ShieldCheck,
  Pill,
  Calendar,
  Car,
  MessageSquare,
  Sparkles,
  Sliders,
  Send,
  Filter,
  CheckCircle2,
} from 'lucide-react';

export interface ParentCareLogPageProps {
  onNavigate?: (path: string) => void;
}

type ViewStateMode = 'NORMAL' | 'EMPTY' | 'NO_MESSAGES' | 'TASK_THREAD' | 'LOADING' | 'OFFLINE' | 'ERROR';
type FilterMode = 'ALL' | 'EVENTS' | 'MESSAGES' | 'AGENT';

export const ParentCareLogPage: React.FC<ParentCareLogPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('care-log');
  const [entries, setEntries] = useState<CareLogEntry[]>([]);
  const [filter, setFilter] = useState<FilterMode>('ALL');
  const [viewMode, setViewMode] = useState<ViewStateMode>('NORMAL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Message composer state
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await careLogService.getCareLog('p-1');
        setEntries(data);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setIsSending(true);

    const newEntry = await careLogService.addCareMessage({
      parentId: 'p-1',
      messageText,
      relatedEntityId: 'apt-201',
    });

    setEntries((prev) => [newEntry, ...prev]);
    setMessageText('');
    setIsSending(false);
    showToast('Message sent to care circle ✓');
  };

  const renderEntryIcon = (type: CareLogEntryType) => {
    switch (type) {
      case 'CHECK_IN':
        return <ShieldCheck className="w-5 h-5 text-[#16866B]" />;
      case 'MEDICATION':
        return <Pill className="w-5 h-5 text-[#16866B]" />;
      case 'APPOINTMENT':
        return <Calendar className="w-5 h-5 text-[#0284C7]" />;
      case 'TRANSPORTATION':
        return <Car className="w-5 h-5 text-[#8B5CF6]" />;
      case 'MESSAGE':
        return <MessageSquare className="w-5 h-5 text-[#D97706]" />;
      case 'SYSTEM':
        return <Sparkles className="w-5 h-5 text-[#16866B]" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-[#16866B]" />;
    }
  };

  const renderEntryBadge = (type: CareLogEntryType) => {
    switch (type) {
      case 'CHECK_IN':
        return <CareBadge variant="success" size="sm">Check-In</CareBadge>;
      case 'MEDICATION':
        return <CareBadge variant="primary" size="sm">Medication</CareBadge>;
      case 'APPOINTMENT':
        return <CareBadge variant="info" size="sm">Appointment</CareBadge>;
      case 'TRANSPORTATION':
        return <CareBadge variant="soft" size="sm">Transportation</CareBadge>;
      case 'MESSAGE':
        return <CareBadge variant="warning" size="sm">Care Message</CareBadge>;
      case 'SYSTEM':
        return <CareBadge variant="success" size="sm">CareSync Agent</CareBadge>;
      default:
        return <CareBadge variant="neutral" size="sm">Event</CareBadge>;
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (viewMode === 'NO_MESSAGES' && e.type === 'MESSAGE') return false;
    if (viewMode === 'TASK_THREAD' && e.relatedEntityId !== 'apt-201') return false;

    if (filter === 'EVENTS') return e.type === 'CHECK_IN' || e.type === 'MEDICATION' || e.type === 'APPOINTMENT' || e.type === 'ASSIGNMENT' || e.type === 'TRANSPORTATION';
    if (filter === 'MESSAGES') return e.type === 'MESSAGE';
    if (filter === 'AGENT') return e.type === 'SYSTEM';
    return true;
  });

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
            <span className="font-extrabold text-xl tracking-tight text-[#1D2926]">Care Log</span>
          </div>

          <CareBadge variant="primary" size="md">
            {filteredEntries.length} Updates
          </CareBadge>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* QA State Simulator Selector */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7E5] shadow-care-sm flex items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[#66736F] flex items-center gap-1">
            <Sliders className="w-4 h-4 text-[#16866B]" /> Care Log QA State:
          </span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewStateMode)}
            className="bg-[#FAF7F1] border border-[#CBD5E1] rounded-xl px-3 py-1 font-bold text-[#1D2926]"
          >
            <option value="NORMAL">Normal Timeline (Events + Messages + Agent)</option>
            <option value="TASK_THREAD">🚗 Task Thread (Cardiology Transport Only)</option>
            <option value="NO_MESSAGES">Care Events Only (No Messages)</option>
            <option value="EMPTY">Empty State (No Events Logged Yet)</option>
            <option value="LOADING">⌛ Loading Skeleton State</option>
            <option value="OFFLINE">📡 Offline / Degraded State</option>
            <option value="ERROR">❌ Error / Retry State</option>
          </select>
        </div>

        {/* Title Header */}
        <div className="space-y-1 text-left">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3.5 py-1 rounded-full border border-[#16866B]/20">
            Coordination History
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
            Care Updates & Timeline
          </h1>
          <p className="text-base sm:text-lg text-[#66736F]">
            Event-based care log and communication attached to your care tasks.
          </p>
        </div>

        {/* Task-Linked Message Composer */}
        <CareCard variant="cream" padding="md" className="border-2 border-[#16866B]/20 shadow-care-sm text-left">
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[#1D2926] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#16866B]" /> Send Message to Care Circle
              </label>
              <span className="text-xs text-[#66736F]">Linked to: Cardiology Appointment</span>
            </div>

            <div className="flex items-center gap-2">
              <CareInput
                placeholder="e.g. Thanks David, I'll be ready at 9:45 AM..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                inputSize="md"
                className="flex-1 bg-white"
              />
              <CareButton
                type="submit"
                variant="primary"
                size="md"
                loading={isSending}
                disabled={!messageText.trim()}
                icon={<Send className="w-4 h-4" />}
              >
                Send
              </CareButton>
            </div>
          </form>
        </CareCard>

        {/* Timeline Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold select-none">
          <span className="text-[#66736F] flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { mode: 'ALL', label: 'All Updates' },
            { mode: 'EVENTS', label: 'Care Events' },
            { mode: 'MESSAGES', label: 'Care Messages' },
            { mode: 'AGENT', label: 'Agent Observations' },
          ].map((f) => (
            <button
              key={f.mode}
              onClick={() => setFilter(f.mode as FilterMode)}
              className={`px-3.5 py-1.5 rounded-full transition-all shrink-0 ${
                filter === f.mode
                  ? 'bg-[#16866B] text-white shadow-care-sm'
                  : 'bg-white text-[#66736F] hover:bg-[#E8F4EF] border border-[#E5E7E5]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* LOADING STATE */}
        {viewMode === 'LOADING' && (
          <div className="space-y-4">
            <CareSkeleton variant="card" className="h-28" />
            <CareSkeleton variant="card" className="h-28" />
            <CareSkeleton variant="card" className="h-28" />
          </div>
        )}

        {/* OFFLINE STATE */}
        {viewMode === 'OFFLINE' && (
          <CareInlineAlert
            type="warning"
            title="Working Offline"
            description="You are currently offline. Sent messages and care events are saved locally and will sync once reconnected."
          />
        )}

        {/* ERROR STATE */}
        {viewMode === 'ERROR' && (
          <CareErrorState
            title="Unable to Load Care Log"
            description="We experienced a temporary connection issue fetching care timeline events."
            onRetry={() => setViewMode('NORMAL')}
          />
        )}

        {/* EMPTY STATE */}
        {viewMode === 'EMPTY' && (
          <CareCard variant="cream" padding="lg" className="text-center space-y-3 border-2 border-dashed border-[#16866B]/40">
            <div className="w-14 h-14 rounded-full bg-[#E8F4EF] text-[#16866B] flex items-center justify-center mx-auto shadow-care-sm">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-[#1D2926]">No Care Events Logged Yet</h3>
            <p className="text-sm text-[#66736F] max-w-sm mx-auto">
              Completed check-ins, medication logs, transport updates, and messages will appear here.
            </p>
          </CareCard>
        )}

        {/* TIMELINE STREAM LIST */}
        {viewMode !== 'LOADING' && viewMode !== 'ERROR' && viewMode !== 'EMPTY' && (
          <div className="space-y-4 text-left">
            {filteredEntries.map((entry) => {
              const isAgent = entry.type === 'SYSTEM';
              const isMessage = entry.type === 'MESSAGE';

              return (
                <CareCard
                  key={entry.id}
                  variant={isAgent ? 'soft' : isMessage ? 'cream' : 'default'}
                  padding="md"
                  className={`space-y-3 transition-all ${
                    isAgent
                      ? 'border-2 border-[#16866B]/40 bg-[#E8F4EF]/30'
                      : isMessage
                      ? 'border-2 border-[#D97706]/30 bg-[#FEF3C7]/20'
                      : 'border-2 border-[#E5E7E5]'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-care-sm ${
                          isAgent
                            ? 'bg-[#16866B] text-white'
                            : isMessage
                            ? 'bg-[#FEF3C7] text-[#D97706]'
                            : 'bg-[#E8F4EF] text-[#16866B]'
                        }`}
                      >
                        {renderEntryIcon(entry.type)}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-base text-[#1D2926]">{entry.title}</h4>
                          {renderEntryBadge(entry.type)}
                        </div>
                        <p className="text-xs text-[#66736F]">
                          <span className="font-bold text-[#1D2926]">{entry.actorName || 'CareSync'}</span>
                          {entry.actorRole && ` (${entry.actorRole})`} • {entry.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {entry.description && (
                    <p className="text-sm text-[#1D2926] bg-white p-3 rounded-xl border border-[#E5E7E5] leading-relaxed">
                      {entry.description}
                    </p>
                  )}

                  {/* Task Association Badge */}
                  {entry.relatedEntityId && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="bg-[#FAF7F1] text-[#66736F] font-semibold px-2.5 py-1 rounded-md border border-[#E5E7E5] inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#16866B]" /> Task Ref: {entry.relatedEntityType} #{entry.relatedEntityId}
                      </span>

                      <button
                        onClick={() => showToast(`Replying to care task ${entry.relatedEntityId}...`)}
                        className="text-xs font-bold text-[#16866B] hover:underline"
                      >
                        Reply to Task
                      </button>
                    </div>
                  )}
                </CareCard>
              );
            })}
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 sm:right-8 z-50 max-w-md">
          <CareToast type="success" title="Care Log Status" message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <CareBottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
