import React, { useState, useEffect } from 'react';
import { CareCard } from '@/components/ui/CareCard';
import { CareButton } from '@/components/ui/CareButton';
import { CareBadge } from '@/components/ui/CareBadge';
import { careRequestService } from '@/services/careRequestService';
import type { CareRequest } from '@/types/care-request';

interface VolunteerHomePageProps {
  onNavigate?: (path: string) => void;
}

export const VolunteerHomePage: React.FC<VolunteerHomePageProps> = ({ onNavigate }) => {
  const [assignedTasks, setAssignedTasks] = useState<CareRequest[]>([]);
  const [availableTasks, setAvailableTasks] = useState<CareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadVolunteerTasks();
  }, []);

  const loadVolunteerTasks = async () => {
    setLoading(true);
    try {
      const allRequests = await careRequestService.getCareRequests('volunteer', 'p-1');
      const assigned = allRequests.filter(
        (r) => r.assignedTo?.id === 'usr-vol-1' || r.assignedTo?.id === 'c-3' || r.status === 'ASSIGNED' || r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED'
      );
      const available = allRequests.filter((r) => r.status === 'PENDING_ASSIGNMENT');
      setAssignedTasks(assigned);
      setAvailableTasks(available);
    } catch {
      console.warn('Failed to load volunteer tasks.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setActionMessage(`Accepting task ${requestId}...`);
    const res = await careRequestService.acceptTask(requestId);
    if (res.success) {
      setActionMessage('Task accepted! You are now responsible for this task.');
      await loadVolunteerTasks();
    }
  };

  const handleStart = async (requestId: string) => {
    setActionMessage(`Starting task ${requestId}...`);
    const res = await careRequestService.startTask(requestId);
    if (res.success) {
      setActionMessage('Task in progress. Safe travels!');
      await loadVolunteerTasks();
    }
  };

  const handleComplete = async (requestId: string) => {
    setActionMessage(`Completing task ${requestId}...`);
    const res = await careRequestService.completeTask(requestId, 'Completed by verified volunteer Priya Sharma.');
    if (res.success) {
      setActionMessage('✓ Task marked complete! Waiting for parent confirmation.');
      await loadVolunteerTasks();
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
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl bg-gradient-to-r from-emerald-900/40 via-teal-900/20 to-slate-900 border border-emerald-500/20 backdrop-blur-md">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Priya Sharma</h1>
              <CareBadge variant="success">✓ VERIFIED VOLUNTEER</CareBadge>
            </div>
            <p className="text-slate-400 text-sm">
              Community Volunteer • Background Checked • Certified Transportation & Pharmacy Companion
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <div className="text-right text-xs text-slate-400">
              <span className="block text-emerald-400 font-semibold text-sm">4.9 ★ Rating</span>
              <span>18 Tasks Completed</span>
            </div>
            {onNavigate && (
              <CareButton variant="secondary" size="sm" onClick={() => onNavigate('/family/home')}>
                Switch Persona
              </CareButton>
            )}
          </div>
        </div>

        {actionMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium animate-fadeIn">
            {actionMessage}
          </div>
        )}

        {/* Active Assigned Tasks */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center space-x-2">
            <span>Your Assigned Care Tasks</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
              {assignedTasks.length}
            </span>
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading volunteer tasks...</div>
          ) : assignedTasks.length === 0 ? (
            <CareCard className="p-6 text-center text-slate-400 text-sm">
              No active tasks assigned to you right now. Available community requests appear below.
            </CareCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedTasks.map((task) => (
                <CareCard key={task.id} className="p-6 space-y-4 border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
                        {task.category}
                      </span>
                      <h3 className="text-lg font-bold text-slate-100 mt-1">{task.title}</h3>
                      <p className="text-xs text-slate-400">Parent: {task.parentName}</p>
                    </div>
                    {renderStatusBadge(task.status)}
                  </div>

                  <p className="text-sm text-slate-300 line-clamp-2">{task.description}</p>

                  <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 text-xs text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Requested Time:</span>
                      <span className="text-slate-200 font-medium">{task.requestedTime}</span>
                    </div>
                    {task.locationName && (
                      <div className="flex justify-between">
                        <span>Location:</span>
                        <span className="text-slate-200 font-medium">{task.locationName}</span>
                      </div>
                    )}
                  </div>

                  {/* Task-Scoped Action Execution */}
                  <div className="pt-2 flex space-x-3">
                    {task.status === 'ASSIGNED' && (
                      <CareButton variant="primary" className="w-full" onClick={() => handleAccept(task.id)}>
                        Accept Task
                      </CareButton>
                    )}

                    {task.status === 'ACCEPTED' && (
                      <CareButton variant="primary" className="w-full" onClick={() => handleStart(task.id)}>
                        Start Task
                      </CareButton>
                    )}

                    {task.status === 'IN_PROGRESS' && (
                      <CareButton variant="pill" className="w-full" onClick={() => handleComplete(task.id)}>
                        Mark Complete
                      </CareButton>
                    )}

                    {task.status === 'COMPLETED' && (
                      <div className="w-full p-2 text-center text-xs text-emerald-400 font-medium bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        ✓ Task Completed — Waiting for parent confirmation
                      </div>
                    )}
                  </div>
                </CareCard>
              ))}
            </div>
          )}
        </div>

        {/* Available Community Tasks */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center space-x-2">
            <span>Available Community Requests</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              Task-Scoped Privacy Enabled
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTasks.map((task) => (
              <CareCard key={task.id} className="p-6 space-y-3 border-slate-800 bg-slate-900/40 opacity-90">
                <div className="flex justify-between items-start">
                  <div>
                    <CareBadge variant="warning">{task.priority}</CareBadge>
                    <h3 className="text-base font-bold text-slate-200 mt-2">{task.title}</h3>
                    <p className="text-xs text-slate-400">Location: {task.locationName || 'Near Parent Circle'}</p>
                  </div>
                  {renderStatusBadge(task.status)}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
                <div className="text-xs text-slate-500 italic pt-1">
                  🔒 Full contact details become visible once human assignment is committed by the family coordinator.
                </div>
              </CareCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
