import React, { useState, useEffect } from 'react';
import { FamilySidebar } from '../navigation/FamilySidebar';
import { FamilyTopBar } from '../navigation/FamilyTopBar';
import { CareRequestDetailModal } from './CareRequestDetailModal';
import { CareCard } from '@/components/ui/CareCard';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareButton } from '@/components/ui/CareButton';
import { CareToast } from '@/components/feedback/CareToast';
import { CareSkeleton } from '@/components/feedback/CareSkeleton';
import { CareErrorState } from '@/components/feedback/CareErrorState';
import { CareInlineAlert } from '@/components/feedback/CareInlineAlert';

import { careRequestService } from '@/services/careRequestService';
import type { CareRequest } from '@/types/care-request';
import {
  FileText,
  Car,
  Pill,
  ShoppingBag,
  Clock,
  Sliders,
  Filter,
} from 'lucide-react';

export interface FamilyCareRequestsPageProps {
  onNavigate?: (path: string) => void;
}

type ViewStateMode = 'NORMAL' | 'NEEDS_ASSIGNMENT' | 'ASSIGNED' | 'ESCALATED' | 'EMPTY' | 'LOADING' | 'OFFLINE' | 'ERROR';
type FilterTab = 'ALL' | 'UNASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

export const FamilyCareRequestsPage: React.FC<FamilyCareRequestsPageProps> = ({ onNavigate }) => {
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [activeParentId, setActiveParentId] = useState<string>('p-1');
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [viewMode, setViewMode] = useState<ViewStateMode>('NORMAL');
  const [selectedRequest, setSelectedRequest] = useState<CareRequest | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await careRequestService.getCareRequests('c-1', activeParentId);
        setRequests(data);
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

  const handleAssignTask = async (requestId: string, assigneeId: string) => {
    setIsSubmitting(true);
    const res = await careRequestService.assignCareRequest(requestId, assigneeId);
    setRequests((prev) => prev.map((r) => (r.id === requestId ? res.request : r)));
    setIsSubmitting(false);
    setSelectedRequest(null);
    showToast('Task assigned successfully! Assigned helper notified. ✓');
  };

  const renderCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'TRANSPORTATION':
        return <Car className="w-5 h-5 text-[#0284C7]" />;
      case 'PHARMACY':
      case 'MEDICATION':
        return <Pill className="w-5 h-5 text-[#16866B]" />;
      case 'GROCERIES':
        return <ShoppingBag className="w-5 h-5 text-[#D97706]" />;
      default:
        return <FileText className="w-5 h-5 text-[#16866B]" />;
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (viewMode === 'NEEDS_ASSIGNMENT') return r.status === 'PENDING_ASSIGNMENT';
    if (viewMode === 'ASSIGNED') return r.status === 'ASSIGNED';

    if (filter === 'UNASSIGNED') return r.status === 'PENDING_ASSIGNMENT';
    if (filter === 'IN_PROGRESS') return r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS';
    if (filter === 'COMPLETED') return r.status === 'COMPLETED';
    return true;
  });

  const unassignedCount = requests.filter((r) => r.status === 'PENDING_ASSIGNMENT').length;

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] font-sans flex flex-row">
      {/* Desktop Navigation Sidebar */}
      <FamilySidebar
        activeRoute="/family/requests"
        onNavigate={onNavigate}
        attentionCount={unassignedCount}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        <FamilyTopBar
          caregiverName="David Woodson"
          activeParentId={activeParentId}
          supportedParents={[
            { parentId: 'p-1', name: 'Susan Woodson', relationship: 'Mother', age: 74 },
            { parentId: 'p-2', name: 'George Miller', relationship: 'Father-in-law', age: 81 },
          ]}
          onSelectParent={handleSelectParent}
          attentionCount={unassignedCount}
          onNavigateParentView={() => onNavigate ? onNavigate('/parent/home') : window.location.hash = '#/parent/home'}
        />

        <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6 text-left w-full">
          
          {/* QA State Simulator Selector */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7E5] shadow-care-sm flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#66736F] flex items-center gap-1">
              <Sliders className="w-4 h-4 text-[#16866B]" /> Care Requests QA State:
            </span>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewStateMode)}
              className="bg-[#FAF7F1] border border-[#CBD5E1] rounded-xl px-3 py-1 font-bold text-[#1D2926]"
            >
              <option value="NORMAL">Normal Requests List (1 Unassigned, 1 Assigned, 1 Completed)</option>
              <option value="NEEDS_ASSIGNMENT">⚠ Unassigned Requests Focus</option>
              <option value="ASSIGNED">✓ Assigned Tasks Focus</option>
              <option value="EMPTY">Empty State (No Active Requests)</option>
              <option value="LOADING">⌛ Loading Skeleton State</option>
              <option value="OFFLINE">📡 Offline / Degraded State</option>
              <option value="ERROR">❌ Error / Retry State</option>
            </select>
          </div>

          {/* Title & Stats Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3.5 py-1 rounded-full border border-[#16866B]/20">
                Care Operational Workspace
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
                Care Requests
              </h1>
              <p className="text-base text-[#66736F]">
                Review, assign, track, and coordinate care work for your parent.
              </p>
            </div>

            {unassignedCount > 0 && (
              <CareBadge variant="critical" size="lg">
                ⚠️ {unassignedCount} Request{unassignedCount > 1 ? 's' : ''} Need Assignment
              </CareBadge>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold select-none">
            <span className="text-[#66736F] flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {[
              { tab: 'ALL', label: `All Requests (${requests.length})` },
              { tab: 'UNASSIGNED', label: `Needs Assignment (${unassignedCount})` },
              { tab: 'IN_PROGRESS', label: 'In Progress / Assigned' },
              { tab: 'COMPLETED', label: 'Completed' },
            ].map((f) => (
              <button
                key={f.tab}
                onClick={() => setFilter(f.tab as FilterTab)}
                className={`px-3.5 py-1.5 rounded-full transition-all shrink-0 ${
                  filter === f.tab
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
              <CareSkeleton variant="card" className="h-36" />
              <CareSkeleton variant="card" className="h-36" />
            </div>
          )}

          {/* OFFLINE STATE */}
          {viewMode === 'OFFLINE' && (
            <CareInlineAlert
              type="warning"
              title="Working Offline"
              description="You are currently offline. Assignment updates will sync automatically once reconnected."
            />
          )}

          {/* ERROR STATE */}
          {viewMode === 'ERROR' && (
            <CareErrorState
              title="Unable to Load Care Requests"
              description="We experienced a temporary connection issue fetching active care requests."
              onRetry={() => setViewMode('NORMAL')}
            />
          )}

          {/* EMPTY STATE */}
          {(viewMode === 'EMPTY' || filteredRequests.length === 0) && viewMode !== 'LOADING' && viewMode !== 'ERROR' && (
            <CareCard variant="cream" padding="lg" className="text-center space-y-3 border-2 border-dashed border-[#16866B]/40">
              <div className="w-14 h-14 rounded-full bg-[#E8F4EF] text-[#16866B] flex items-center justify-center mx-auto shadow-care-sm">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-extrabold text-[#1D2926]">No Active Care Requests</h3>
              <p className="text-sm text-[#66736F] max-w-sm mx-auto">
                No care requests match your current filter settings.
              </p>
            </CareCard>
          )}

          {/* REQUESTS LIST STREAM */}
          {viewMode !== 'LOADING' && viewMode !== 'ERROR' && filteredRequests.length > 0 && (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const isUnassigned = req.status === 'PENDING_ASSIGNMENT';
                return (
                  <CareCard
                    key={req.id}
                    variant={isUnassigned ? 'default' : 'soft'}
                    padding="lg"
                    className={`space-y-4 border-2 transition-all ${
                      isUnassigned ? 'border-[#EF4444] bg-[#FEF2F2]/20 shadow-care-md' : 'border-[#E5E7E5]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#E5E7E5] pb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E8F4EF] text-[#16866B] flex items-center justify-center shrink-0 shadow-care-sm">
                          {renderCategoryIcon(req.category)}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CareBadge variant={req.priority === 'CRITICAL' ? 'critical' : 'warning'} size="sm">
                              {req.priority}
                            </CareBadge>
                            <span className="text-xs font-bold text-[#66736F]">{req.parentName}</span>
                          </div>
                          <h3 className="text-xl font-extrabold text-[#1D2926]">{req.title}</h3>
                        </div>
                      </div>

                      {/* Status & Action */}
                      <div className="flex items-center gap-3 shrink-0">
                        {isUnassigned ? (
                          <CareBadge variant="critical" size="md">
                            ⚠️ Needs Assignment
                          </CareBadge>
                        ) : (
                          <CareBadge variant="success" size="md">
                            ✓ {req.assignedTo?.name || req.status}
                          </CareBadge>
                        )}

                        <CareButton
                          variant={isUnassigned ? 'primary' : 'soft'}
                          size="md"
                          onClick={() => setSelectedRequest(req)}
                        >
                          {isUnassigned ? 'Review & Assign' : 'View Task Details'}
                        </CareButton>
                      </div>
                    </div>

                    <p className="text-sm text-[#1D2926] leading-relaxed bg-white p-3 rounded-xl border border-[#E5E7E5]">
                      {req.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-[#66736F]">
                      <span className="flex items-center gap-1.5 font-semibold text-[#1D2926]">
                        <Clock className="w-4 h-4 text-[#16866B]" /> Requested for: {req.requestedTime}
                      </span>
                      <span>Created {req.createdAt}</span>
                    </div>
                  </CareCard>
                );
              })}
            </div>
          )}

        </main>
      </div>

      {/* Care Request Detail & Assignment Modal */}
      <CareRequestDetailModal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        onAssign={handleAssignTask}
        isSubmitting={isSubmitting}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 max-w-md">
          <CareToast type="success" title="Care Requests" message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}
    </div>
  );
};
