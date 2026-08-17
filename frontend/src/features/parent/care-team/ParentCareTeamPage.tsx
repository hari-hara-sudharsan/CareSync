import React, { useState, useEffect } from 'react';
import { CareBottomNavigation } from '@/components/navigation/CareBottomNavigation';
import { CareButton } from '@/components/ui/CareButton';
import { CareCard } from '@/components/ui/CareCard';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareToast } from '@/components/feedback/CareToast';
import { CareSkeleton } from '@/components/feedback/CareSkeleton';
import { CareErrorState } from '@/components/feedback/CareErrorState';
import { CareInlineAlert } from '@/components/feedback/CareInlineAlert';
import { CareModal } from '@/components/feedback/CareModal';

import { careTeamService } from '@/services/careTeamService';
import { InviteCareMemberModal } from './InviteCareMemberModal';
import { PermissionSelector } from './PermissionSelector';
import type { CareMember, CareTeamData, CarePermission, InviteCareMemberRequest } from '@/types/care-team';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit3,
  Sliders,
  Mail,
} from 'lucide-react';

export interface ParentCareTeamPageProps {
  onNavigate?: (path: string) => void;
}

type ViewStateMode = 'NORMAL' | 'NO_CARE_MEMBERS' | 'PENDING_INVITATION' | 'INVITATION_EXPIRED' | 'LOADING' | 'OFFLINE' | 'ERROR';

export const ParentCareTeamPage: React.FC<ParentCareTeamPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('care-team');
  const [teamData, setTeamData] = useState<CareTeamData | null>(null);
  const [viewMode, setViewMode] = useState<ViewStateMode>('NORMAL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CareMember | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<CarePermission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await careTeamService.getCareTeam('p-1');
        setTeamData(data);
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

  const handleInviteSubmit = async (req: InviteCareMemberRequest) => {
    setIsSubmitting(true);
    const res = await careTeamService.inviteCareMember(req);
    setIsSubmitting(false);

    setTeamData((prev) => {
      if (!prev) return null;
      return { ...prev, pendingInvites: [...prev.pendingInvites, res.member] };
    });

    showToast(`Invitation sent to ${req.name} (${req.phone}) ✓`);
  };

  const handleSavePermissions = async () => {
    if (!editingMember) return;
    setIsSubmitting(true);

    await careTeamService.updateCareMemberPermissions(editingMember.id, editedPermissions);

    setTeamData((prev) => {
      if (!prev) return null;
      const updatedMembers = prev.members.map((m) =>
        m.id === editingMember.id ? { ...m, permissions: editedPermissions } : m
      );
      let updatedPrimary = prev.primaryContact;
      if (prev.primaryContact?.id === editingMember.id) {
        updatedPrimary = { ...prev.primaryContact, permissions: editedPermissions };
      }
      return { ...prev, members: updatedMembers, primaryContact: updatedPrimary };
    });

    setIsSubmitting(false);
    setEditingMember(null);
    showToast(`Permissions updated for ${editingMember.name} ✓`);
  };

  const handleRevokeMember = async (memberId: string, memberName: string) => {
    await careTeamService.revokeCareMember(memberId);
    setTeamData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        members: prev.members.filter((m) => m.id !== memberId),
        pendingInvites: prev.pendingInvites.filter((m) => m.id !== memberId),
      };
    });
    showToast(`Removed ${memberName} from Care Team`);
  };

  const formatPermissionLabel = (perm: CarePermission) => {
    switch (perm) {
      case 'CHECK_INS':
        return 'Check-Ins';
      case 'MEDICATION':
        return 'Medications';
      case 'APPOINTMENTS':
        return 'Appointments';
      case 'TRANSPORTATION':
        return 'Transportation';
      case 'ERRANDS':
        return 'Errands';
      case 'CARE_HISTORY':
        return 'Care History';
    }
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
            <span className="font-extrabold text-xl tracking-tight text-[#1D2926]">Care Team</span>
          </div>

          <CareBadge variant="primary" size="md">
            {teamData ? `${teamData.members.length + (teamData.primaryContact ? 1 : 0)} Active` : 'Team'}
          </CareBadge>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* QA State Simulator Selector */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7E5] shadow-care-sm flex items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[#66736F] flex items-center gap-1">
            <Sliders className="w-4 h-4 text-[#16866B]" /> Care Team QA State:
          </span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewStateMode)}
            className="bg-[#FAF7F1] border border-[#CBD5E1] rounded-xl px-3 py-1 font-bold text-[#1D2926]"
          >
            <option value="NORMAL">Normal Care Team (1 Primary + 2 Active + 1 Pending)</option>
            <option value="NO_CARE_MEMBERS">Empty State (No Members Added Yet)</option>
            <option value="PENDING_INVITATION">📩 Pending Invitation Alert</option>
            <option value="INVITATION_EXPIRED">⌛ Expired Invitation Alert</option>
            <option value="LOADING">⌛ Loading Skeleton State</option>
            <option value="OFFLINE">📡 Offline / Degraded State</option>
            <option value="ERROR">❌ Error / Retry State</option>
          </select>
        </div>

        {/* Title Header & Add Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div className="space-y-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#16866B] bg-[#E8F4EF] px-3.5 py-1 rounded-full border border-[#16866B]/20">
              Trusted Care Network
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D2926] tracking-tight">
              Your Care Team
            </h1>
            <p className="text-base sm:text-lg text-[#66736F]">
              People you trust who help coordinate your everyday care.
            </p>
          </div>

          <CareButton
            variant="primary"
            size="parent"
            icon={<UserPlus className="w-6 h-6" />}
            onClick={() => setIsInviteModalOpen(true)}
            className="shrink-0 shadow-care-lg"
          >
            Add Someone I Trust
          </CareButton>
        </div>

        {/* Security & Authorization Boundary Card */}
        <div className="bg-[#E8F4EF] p-4 rounded-2xl border border-[#16866B]/30 flex items-start gap-3 text-xs sm:text-sm text-[#1D2926]">
          <ShieldCheck className="w-5 h-5 text-[#16866B] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#16866B]">Task-Scoped Privacy & Authorization</p>
            <p className="text-[#66736F] mt-0.5 leading-relaxed">
              Every person in your care circle has explicit, task-scoped permissions. Volunteers and neighbors receive only the minimum information required to perform specific care tasks.
            </p>
          </div>
        </div>

        {/* LOADING STATE */}
        {viewMode === 'LOADING' && (
          <div className="space-y-4">
            <CareSkeleton variant="card" className="h-44" />
            <CareSkeleton variant="card" className="h-36" />
          </div>
        )}

        {/* OFFLINE STATE */}
        {viewMode === 'OFFLINE' && (
          <CareInlineAlert
            type="warning"
            title="Working Offline"
            description="You are currently offline. Phone dial actions remain functional. New member invitations will send automatically once reconnected."
          />
        )}

        {/* ERROR STATE */}
        {viewMode === 'ERROR' && (
          <CareErrorState
            title="Unable to Load Care Team"
            description="We experienced a temporary connection issue fetching your care team details."
            onRetry={() => setViewMode('NORMAL')}
          />
        )}

        {/* EMPTY STATE */}
        {viewMode === 'NO_CARE_MEMBERS' && (
          <CareCard variant="cream" padding="lg" className="text-center space-y-4 border-2 border-dashed border-[#16866B]/40">
            <div className="w-16 h-16 rounded-full bg-[#E8F4EF] text-[#16866B] flex items-center justify-center mx-auto shadow-care-sm">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-extrabold text-[#1D2926]">No Care Team Members Added Yet</h3>
            <p className="text-base text-[#66736F] max-w-md mx-auto">
              Add your primary guardian, daughter, son, or trusted neighbor to start coordinating care together.
            </p>
            <CareButton
              variant="primary"
              size="parent"
              icon={<UserPlus className="w-6 h-6" />}
              onClick={() => setIsInviteModalOpen(true)}
              className="mx-auto"
            >
              Add First Care Member
            </CareButton>
          </CareCard>
        )}

        {/* NORMAL CARE TEAM CONTENT */}
        {viewMode !== 'LOADING' && viewMode !== 'ERROR' && viewMode !== 'NO_CARE_MEMBERS' && teamData && (
          <div className="space-y-6 text-left">
            
            {/* 1. PRIMARY CARE CONTACT SHOWCASE */}
            {teamData.primaryContact && (
              <div className="space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#16866B] block">
                  Primary Care Contact
                </span>

                <CareCard variant="soft" padding="lg" className="border-2 border-[#16866B] shadow-care-md space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-[#16866B] text-white flex items-center justify-center text-2xl font-black shadow-care-sm shrink-0">
                        {teamData.primaryContact.name.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-2xl font-extrabold text-[#1D2926]">{teamData.primaryContact.name}</h2>
                          <CareBadge variant="success" size="sm">Primary Contact</CareBadge>
                        </div>
                        <p className="text-sm font-bold text-[#16866B]">
                          {teamData.primaryContact.relationship} • {teamData.primaryContact.locationLabel}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`tel:${teamData.primaryContact.phone}`}
                      className="bg-[#16866B] hover:bg-[#126E58] text-white px-5 py-3 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2 shadow-care-sm transition-all focus-care shrink-0"
                    >
                      <Phone className="w-5 h-5" /> Call {teamData.primaryContact.name.split(' ')[0]}
                    </a>
                  </div>

                  {/* Permissions tags */}
                  <div className="pt-2 border-t border-[#16866B]/20 flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[#16866B]">Permitted Help:</span>
                      {teamData.primaryContact.permissions.map((p) => (
                        <span key={p} className="bg-white px-2.5 py-1 rounded-full font-bold text-[#1D2926] border border-[#16866B]/30">
                          ✓ {formatPermissionLabel(p)}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setEditingMember(teamData.primaryContact!);
                        setEditedPermissions(teamData.primaryContact!.permissions);
                      }}
                      className="text-xs font-bold text-[#16866B] hover:underline inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Permissions
                    </button>
                  </div>
                </CareCard>
              </div>
            )}

            {/* 2. OTHER CARE TEAM MEMBERS */}
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-[#1D2926]">Other Care Members ({teamData.members.length})</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teamData.members.map((mem) => (
                  <CareCard key={mem.id} variant="default" padding="md" className="space-y-3 border-2 border-[#E5E7E5] shadow-care-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#E8F4EF] text-[#16866B] flex items-center justify-center text-lg font-bold shrink-0">
                          {mem.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-lg text-[#1D2926]">{mem.name}</h4>
                          <p className="text-xs font-bold text-[#66736F]">{mem.relationship} • {mem.locationLabel || 'Care Circle'}</p>
                        </div>
                      </div>

                      <a
                        href={`tel:${mem.phone}`}
                        className="p-2.5 rounded-full bg-[#E8F4EF] text-[#16866B] hover:bg-[#16866B] hover:text-white transition-colors"
                        title={`Call ${mem.name}`}
                      >
                        <Phone className="w-5 h-5" />
                      </a>
                    </div>

                    <div className="pt-2 border-t border-[#F0ECE1] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 flex-wrap">
                        {mem.permissions.slice(0, 3).map((p) => (
                          <span key={p} className="bg-[#FAF7F1] px-2 py-0.5 rounded-md font-semibold text-[#66736F] border border-[#E5E7E5]">
                            {formatPermissionLabel(p)}
                          </span>
                        ))}
                        {mem.permissions.length > 3 && (
                          <span className="text-[#16866B] font-bold">+{mem.permissions.length - 3} more</span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setEditingMember(mem);
                          setEditedPermissions(mem.permissions);
                        }}
                        className="text-xs font-bold text-[#16866B] hover:underline inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                    </div>
                  </CareCard>
                ))}
              </div>
            </div>

            {/* 3. PENDING INVITATIONS */}
            {(viewMode === 'PENDING_INVITATION' || viewMode === 'INVITATION_EXPIRED' || teamData.pendingInvites.length > 0) && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xl font-bold text-[#1D2926] flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#D97706]" /> Pending Invitations
                </h3>

                {viewMode === 'INVITATION_EXPIRED' && (
                  <CareInlineAlert
                    type="warning"
                    title="Invitation Expired"
                    description="The invitation sent to Kumar Patel (+1 555-987-6543) has expired after 7 days. Tap 'Resend' to issue a new invite link."
                  />
                )}

                <div className="space-y-3">
                  {teamData.pendingInvites.map((inv) => (
                    <CareCard key={inv.id} variant="bordered" padding="md" className="flex items-center justify-between gap-4 border-dashed border-[#D97706]/60">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-[#1D2926]">{inv.name}</h4>
                          <CareBadge variant="warning" size="sm">
                            {viewMode === 'INVITATION_EXPIRED' ? 'EXPIRED' : 'PENDING'}
                          </CareBadge>
                        </div>
                        <p className="text-xs text-[#66736F]">{inv.relationship} • {inv.phone}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => showToast(`Resent invitation to ${inv.name} (${inv.phone}) ✓`)}
                          className="px-3 py-1.5 bg-[#FEF3C7] text-[#D97706] font-bold rounded-xl text-xs hover:bg-[#D97706] hover:text-white transition-colors"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleRevokeMember(inv.id, inv.name)}
                          className="p-1.5 text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                          title="Cancel invitation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </CareCard>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Invite Care Member Modal */}
      <InviteCareMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInviteSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Edit Permissions Modal */}
      <CareModal
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        title={editingMember ? `Edit Permissions for ${editingMember.name}` : ''}
        description="Select the specific care tasks this person is authorized to assist with."
      >
        {editingMember && (
          <div className="space-y-5 text-left">
            <PermissionSelector
              selectedPermissions={editedPermissions}
              onChange={setEditedPermissions}
              disabled={isSubmitting}
            />

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <CareButton
                variant="primary"
                size="parent"
                fullWidth
                loading={isSubmitting}
                onClick={handleSavePermissions}
                icon={<CheckCircle2 className="w-6 h-6" />}
              >
                Save Permissions
              </CareButton>

              {!editingMember.isPrimaryContact && (
                <button
                  onClick={() => {
                    handleRevokeMember(editingMember.id, editingMember.name);
                    setEditingMember(null);
                  }}
                  className="w-full sm:w-auto px-4 py-3 text-center font-bold text-[#DC2626] hover:bg-[#FEE2E2] rounded-2xl transition-colors"
                >
                  Remove Member
                </button>
              )}
            </div>
          </div>
        )}
      </CareModal>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 sm:right-8 z-50 max-w-md">
          <CareToast type="success" title="Care Team Status" message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <CareBottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
