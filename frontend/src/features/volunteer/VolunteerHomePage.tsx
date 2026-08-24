import React, { useState, useEffect } from 'react';
import { CareTopBar } from '@/components/navigation/CareTopBar';
import { CareCard } from '@/components/ui/CareCard';
import { CareButton } from '@/components/ui/CareButton';
import { CareBadge } from '@/components/ui/CareBadge';
import { CareToast } from '@/components/feedback/CareToast';
import { CareSkeleton } from '@/components/feedback/CareSkeleton';
import { careRequestService } from '@/services/careRequestService';
import type { CareRequest } from '@/types/care-request';
import {
  HeartHandshake,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Clock,
  User,
  Star,
  Play,
  CheckSquare,
} from 'lucide-react';

interface VolunteerHomePageProps {
  onNavigate?: (path: string) => void;
}

export const VolunteerHomePage: React.FC<VolunteerHomePageProps> = ({ onNavigate }) => {
  const [assignedTasks, setAssignedTasks] = useState<CareRequest[]>([]);
  const [availableTasks, setAvailableTasks] = useState<CareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAccept = async (requestId: string) => {
    showToast(`Accepting task ${requestId}...`);
    const res = await careRequestService.acceptTask(requestId);
    if (res.success) {
      showToast('Task accepted! You are now responsible for this care task. ✓');
      await loadVolunteerTasks();
    }
  };

  const handleStart = async (requestId: string) => {
    showToast(`Starting task ${requestId}...`);
    const res = await careRequestService.startTask(requestId);
    if (res.success) {
      showToast('Task marked in progress. Safe travels! ✓');
      await loadVolunteerTasks();
    }
  };

  const handleComplete = async (requestId: string) => {
    showToast(`Completing task ${requestId}...`);
    const res = await careRequestService.completeTask(requestId, 'Completed by verified volunteer Priya Sharma.');
    if (res.success) {
      showToast('✓ Task marked complete! Waiting for parent confirmation.');
      await loadVolunteerTasks();
    }
  };

  const renderStatusBadge = (statusStr: string) => {
    let variant: 'success' | 'warning' | 'critical' | 'info' | 'neutral' = 'neutral';
    if (statusStr === 'COMPLETED' || statusStr === 'PARENT_CONFIRMED' || statusStr === 'CLOSED') variant = 'success';
    else if (statusStr === 'ASSIGNED' || statusStr === 'ACCEPTED' || statusStr === 'IN_PROGRESS') variant = 'info';
    else if (statusStr === 'PENDING_ASSIGNMENT') variant = 'warning';
    else if (statusStr === 'ESCALATED' || statusStr === 'FAILED') variant = 'critical';

    return <CareBadge variant={variant} size="sm">{statusStr}</CareBadge>;
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] pb-24 font-sans selection:bg-[#E8F4EF]">
      {/* Top Header Bar */}
      <CareTopBar
        userName="Priya Sharma"
        userRole="Verified Volunteer Helper"
        onSettingsClick={() => onNavigate ? onNavigate('/settings') : undefined}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Header Profile Banner */}
        <CareCard variant="bordered" padding="lg" className="border-2 border-[#E5E7E5] shadow-care-md space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D2926] tracking-tight">Priya Sharma</h1>
                <CareBadge variant="success">✓ VERIFIED VOLUNTEER</CareBadge>
              </div>
              <p className="text-sm text-[#66736F]">
                Community Volunteer • Background Checked • Certified Transportation & Pharmacy Companion
              </p>
            </div>

            <div className="flex items-center space-x-4 shrink-0">
              <div className="text-right text-xs text-[#66736F]">
                <span className="block text-[#16866B] font-extrabold text-sm flex items-center justify-end gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400 inline" /> 4.9 Rating
                </span>
                <span>18 Tasks Completed</span>
              </div>
            </div>
          </div>
        </CareCard>

        {/* Section 1: Assigned Care Tasks */}
        <div className="space-y-4 text-left">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#1D2926] flex items-center space-x-2">
              <HeartHandshake className="w-6 h-6 text-[#16866B]" />
              <span>Your Assigned Care Tasks</span>
            </h2>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E8F4EF] text-[#16866B]">
              {assignedTasks.length} Assigned
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              <CareSkeleton variant="card" className="h-44" />
            </div>
          ) : assignedTasks.length === 0 ? (
            <CareCard variant="cream" padding="lg" className="text-center text-[#66736F] text-sm font-semibold border-2 border-dashed border-[#16866B]/30">
              No active tasks assigned to you right now. Available community requests appear below.
            </CareCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedTasks.map((task) => (
                <CareCard key={task.id} variant="bordered" padding="lg" className="space-y-4 border-2 border-[#E5E7E5] shadow-care-sm hover:border-[#16866B]/40 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-extrabold tracking-wider text-[#16866B] uppercase bg-[#E8F4EF] px-2.5 py-0.5 rounded-full">
                        {task.category}
                      </span>
                      <h3 className="text-lg font-extrabold text-[#1D2926] mt-2">{task.title}</h3>
                      <p className="text-xs text-[#66736F] flex items-center gap-1 mt-0.5">
                        <User className="w-3.5 h-3.5 text-[#16866B]" /> Parent: {task.parentName}
                      </p>
                    </div>
                    {renderStatusBadge(task.status)}
                  </div>

                  <p className="text-sm text-[#1D2926] line-clamp-2">{task.description}</p>

                  <div className="p-3 rounded-xl bg-[#FAF7F1] border border-[#E5E7E5] text-xs text-[#66736F] space-y-1">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-[#16866B]" /> Requested Time:
                      </span>
                      <span className="text-[#1D2926] font-bold">{task.requestedTime}</span>
                    </div>
                    {task.locationName && (
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-[#16866B]" /> Location:
                        </span>
                        <span className="text-[#1D2926] font-bold">{task.locationName}</span>
                      </div>
                    )}
                  </div>

                  {/* Task Execution Action Buttons */}
                  <div className="pt-2">
                    {task.status === 'ASSIGNED' && (
                      <CareButton variant="primary" size="md" className="w-full shadow-care-sm" onClick={() => handleAccept(task.id)}>
                        Accept Task ✓
                      </CareButton>
                    )}

                    {task.status === 'ACCEPTED' && (
                      <CareButton variant="primary" size="md" icon={<Play className="w-4 h-4" />} className="w-full shadow-care-sm" onClick={() => handleStart(task.id)}>
                        Start Task
                      </CareButton>
                    )}

                    {task.status === 'IN_PROGRESS' && (
                      <CareButton variant="primary" size="md" icon={<CheckSquare className="w-4 h-4" />} className="w-full shadow-care-sm bg-[#10B981] hover:bg-[#059669]" onClick={() => handleComplete(task.id)}>
                        Mark Complete
                      </CareButton>
                    )}

                    {task.status === 'COMPLETED' && (
                      <div className="w-full p-2.5 text-center text-xs font-bold text-[#16866B] bg-[#E8F4EF] rounded-xl border border-[#16866B]/30 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#16866B]" /> Task Completed — Waiting for parent confirmation
                      </div>
                    )}
                  </div>
                </CareCard>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Available Community Tasks */}
        <div className="space-y-4 text-left pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#1D2926] flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-[#16866B]" />
              <span>Available Community Requests</span>
            </h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-200 text-slate-700">
              Task-Scoped Privacy Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTasks.map((task) => (
              <CareCard key={task.id} variant="bordered" padding="lg" className="space-y-3 border border-[#E5E7E5] opacity-90">
                <div className="flex justify-between items-start">
                  <div>
                    <CareBadge variant="warning">{task.priority}</CareBadge>
                    <h3 className="text-base font-extrabold text-[#1D2926] mt-2">{task.title}</h3>
                    <p className="text-xs text-[#66736F]">Location: {task.locationName || 'Near Parent Circle'}</p>
                  </div>
                  {renderStatusBadge(task.status)}
                </div>
                <p className="text-xs text-[#66736F] line-clamp-2">{task.description}</p>
                <div className="text-[11px] text-slate-500 italic pt-1">
                  🔒 Full contact details become visible once human assignment is committed by the family coordinator.
                </div>
              </CareCard>
            ))}
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-4 sm:right-8 z-50 max-w-md">
          <CareToast type="success" title="Volunteer Workspace" message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}
    </div>
  );
};
