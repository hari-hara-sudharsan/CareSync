import React, { useState, useEffect } from 'react';
import { CareCard } from '@/components/ui/CareCard';
import { CareButton } from '@/components/ui/CareButton';
import { CareBadge } from '@/components/ui/CareBadge';
import { careRequestService } from '@/services/careRequestService';
import type { CareRequest } from '@/types/care-request';

interface CoordinatorAdminPageProps {
  onNavigate?: (path: string) => void;
}

export const CoordinatorAdminPage: React.FC<CoordinatorAdminPageProps> = ({ onNavigate }) => {
  const [escalations, setEscalations] = useState<CareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadEscalations();
  }, []);

  const loadEscalations = async () => {
    setLoading(true);
    try {
      const all = await careRequestService.getCareRequests('admin', 'p-1');
      const filtered = all.filter((r) => r.status === 'ESCALATED' || r.status === 'PENDING_ASSIGNMENT' || r.priority === 'CRITICAL');
      setEscalations(filtered);
    } catch {
      console.warn('Failed to load operational escalations.');
    } finally {
      setLoading(false);
    }
  };

  const handleRematch = async (requestId: string) => {
    setActionMessage(`Re-triggering matching engine for request ${requestId}...`);
    try {
      const candidates = await careRequestService.getAssignmentCandidates(requestId);
      setActionMessage(`✓ Candidate recommendations calculated (${candidates.length} candidates eligible). Decision Card updated.`);
      await loadEscalations();
    } catch {
      setActionMessage('Failed to trigger matching.');
    }
  };

  const renderStatusBadge = (statusStr: string) => {
    let variant: 'success' | 'warning' | 'critical' | 'info' | 'neutral' = 'neutral';
    if (statusStr === 'COMPLETED' || statusStr === 'PARENT_CONFIRMED' || statusStr === 'CLOSED') variant = 'success';
    else if (statusStr === 'ASSIGNED' || statusStr === 'ACCEPTED' || statusStr === 'IN_PROGRESS') variant = 'info';
    else if (statusStr === 'PENDING_ASSIGNMENT') variant = 'warning';
    else if (statusStr === 'ESCALATED' || statusStr === 'FAILED' || statusStr === 'TIMEOUT') variant = 'critical';

    return <CareBadge variant={variant} size="sm">{statusStr}</CareBadge>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/20 to-slate-900 border border-purple-500/20 backdrop-blur-md">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">CareSync Operations Console</h1>
              <CareBadge variant="info">CARE COORDINATOR ADMIN</CareBadge>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Operational oversight, trust & safety monitoring, escalation review, and audit trail inspection.
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            {onNavigate && (
              <CareButton variant="secondary" size="sm" onClick={() => onNavigate('/family/home')}>
                Switch Persona
              </CareButton>
            )}
          </div>
        </div>

        {actionMessage && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-medium animate-fadeIn">
            {actionMessage}
          </div>
        )}

        {/* Operational System Health Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CareCard className="p-4 bg-slate-900/60 border-slate-800 text-center space-y-1">
            <span className="text-xs text-slate-400 font-medium">Active Parent Circles</span>
            <div className="text-2xl font-bold text-slate-100">2</div>
          </CareCard>
          <CareCard className="p-4 bg-slate-900/60 border-slate-800 text-center space-y-1">
            <span className="text-xs text-slate-400 font-medium">Verified Volunteers</span>
            <div className="text-2xl font-bold text-emerald-400">14</div>
          </CareCard>
          <CareCard className="p-4 bg-slate-900/60 border-slate-800 text-center space-y-1">
            <span className="text-xs text-slate-400 font-medium">Open Escalations</span>
            <div className="text-2xl font-bold text-amber-400">{escalations.length}</div>
          </CareCard>
          <CareCard className="p-4 bg-slate-900/60 border-slate-800 text-center space-y-1">
            <span className="text-xs text-slate-400 font-medium">Safety Severity Alerts</span>
            <div className="text-2xl font-bold text-emerald-400">0 (Clean)</div>
          </CareCard>
        </div>

        {/* Escalation & Failure Review Queue */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center space-x-2">
            <span>Operational Escalations & Safety Review</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              {escalations.length} items
            </span>
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading escalation queue...</div>
          ) : escalations.length === 0 ? (
            <CareCard className="p-6 text-center text-slate-400 text-sm">
              All care operations running cleanly. No active escalations.
            </CareCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {escalations.map((req) => (
                <CareCard key={req.id} className="p-6 space-y-4 border-slate-800 bg-slate-900/60">
                  <div className="flex justify-between items-start">
                    <div>
                      <CareBadge variant={req.priority === 'CRITICAL' ? 'critical' : 'warning'}>
                        {req.priority}
                      </CareBadge>
                      <h3 className="text-lg font-bold text-slate-100 mt-2">{req.title}</h3>
                      <p className="text-xs text-slate-400">Parent: {req.parentName} ({req.parentId})</p>
                    </div>
                    {renderStatusBadge(req.status)}
                  </div>

                  <p className="text-xs text-slate-300">{req.description}</p>

                  <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 text-xs text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="text-slate-200 font-medium">{req.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Requested Time:</span>
                      <span className="text-slate-200 font-medium">{req.requestedTime}</span>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <CareButton variant="primary" size="sm" className="w-full" onClick={() => handleRematch(req.id)}>
                      Trigger Re-Match
                    </CareButton>
                  </div>
                </CareCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
