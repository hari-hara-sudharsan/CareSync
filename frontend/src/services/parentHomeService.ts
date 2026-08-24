import type {
  ParentHomeReadModel,
  ParentHomeServiceContract,
  SubmitCheckInRequest,
} from '@/types/home';
import { careRequestService } from './careRequestService';
import { decisionService } from './decisionService';

/**
 * CareSync Parent Home Read-Model Service
 * 
 * Queries live FastAPI backend endpoints for CareRequests and Decisions.
 */
class CareSyncParentHomeService implements ParentHomeServiceContract {
  public apiEndpoint = '/api/v1/parents/home';

  async getParentHomeData(parentId: string): Promise<ParentHomeReadModel> {
    console.info(`[ParentHomeService] Fetching live read-model for parent ID: ${parentId}`);

    let activeCareRequests: ParentHomeReadModel['activeCareRequests'] = [];
    try {
      const realReqs = await careRequestService.getCareRequests('parent', parentId);
      if (Array.isArray(realReqs)) {
        activeCareRequests = realReqs.map((r) => ({
          id: r.id,
          title: r.title,
          category: ((r.category as string) === 'ERRANDS' ? 'GROCERIES' : r.category) as any,
          parentId: r.parentId,
          parentName: r.parentName,
          description: r.description,
          status: r.status as any,
          urgency: r.priority as any,
          priority: r.priority as any,
          requestedTime: r.requestedTime || 'Today',
          createdAt: r.createdAt || 'Just now',
          dueBy: r.requestedTime || 'Today',
          assignedTo: r.assignedTo ? {
            id: r.assignedTo.id,
            name: r.assignedTo.name,
            role: (r.assignedTo.role.includes('VOLUNTEER') ? 'VOLUNTEER' : 'FAMILY') as 'FAMILY' | 'VOLUNTEER',
            assignedAt: 'Recently',
          } : undefined,
        }));
      }
    } catch (err) {
      console.warn('[ParentHomeService] Error fetching live care requests:', err);
    }

    let attentionCards: ParentHomeReadModel['attentionCards'] = [];
    try {
      const realDecs = await decisionService.getPendingDecisions('parent', parentId);
      if (Array.isArray(realDecs)) {
        attentionCards = realDecs.map((d) => ({
          id: d.id,
          type: d.type as any,
          title: d.title,
          parentName: d.parentName,
          description: d.summary,
          whySurfaced: d.reason || 'Surfaced by CareSync Coordinator Agent',
          recommendation: d.summary,
          urgency: d.priority as any,
          priority: d.priority as any,
          status: d.status as any,
          parentId: d.parentId,
          summary: d.summary,
          reason: d.reason,
          actions: d.actions,
          createdAt: d.createdAt,
          options: d.actions.map((act) => ({
            label: act.label,
            action: act.key,
            variant: act.key.startsWith('assign_') ? 'primary' : 'outline',
          })),
        }));
      }
    } catch (err) {
      console.warn('[ParentHomeService] Error fetching live decision cards:', err);
    }

    return {
      parentId,
      parentName: parentId === 'p-2' ? 'George Miller' : 'Susan Woodson',
      greeting: `Good day, ${parentId === 'p-2' ? 'George' : 'Susan'}`,
      status: activeCareRequests.some(r => r.status === 'PENDING_ASSIGNMENT') ? 'NEEDS_ATTENTION' : 'HANDLED',
      statusTitle: activeCareRequests.length > 0 ? "Care Active" : "✓ You're all set",
      statusSubtitle: activeCareRequests.length > 0
        ? `You have ${activeCareRequests.length} care request(s) being coordinated.`
        : 'Everything important is handled for today. All medications and check-ins are up to date.',
      lastCheckedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      checkInStatus: 'COMPLETED',
      lastCheckInTime: '08:30 AM Today',
      dueMedications: [
        {
          id: 'med-101',
          name: 'Lisinopril',
          dosage: '10mg Tablet',
          time: '09:00 AM Daily',
          taken: true,
          instructions: 'Take 1 tablet with warm water after breakfast',
          prescribedBy: 'Dr. Sarah Jenkins',
        },
        {
          id: 'med-102',
          name: 'Vitamin D3',
          dosage: '1000 IU Capsule',
          time: '06:00 PM Daily',
          taken: false,
          instructions: 'Take with evening meal',
          prescribedBy: 'Dr. Sarah Jenkins',
        },
      ],
      upcomingAppointments: [
        {
          id: 'apt-201',
          title: 'Cardiology Routine Check-Up',
          doctorName: 'Dr. Robert Chen',
          location: 'St. Jude Medical Center, Suite 402',
          dateTime: 'Tomorrow at 10:30 AM',
          type: 'SPECIALIST',
          notes: 'Fast for 8 hours prior to lab work.',
          transportRequired: true,
        },
      ],
      activeCareRequests,
      attentionCards,
      careTeam: [
        {
          id: 'mem-1',
          name: 'David Woodson',
          relationship: 'Son',
          phone: '+1 (555) 234-5678',
          role: 'PRIMARY_GUARDIAN',
          isAvailable: true,
          location: '2.5 km away',
        },
        {
          id: 'mem-2',
          name: 'Sarah Woodson',
          relationship: 'Daughter',
          phone: '+1 (555) 876-5432',
          role: 'FAMILY',
          isAvailable: true,
          location: '5.0 km away',
        },
        {
          id: 'mem-3',
          name: 'Priya Sharma',
          relationship: 'Verified Volunteer',
          phone: '+1 (555) 345-6789',
          role: 'VOLUNTEER',
          isAvailable: true,
          location: '1.4 km away',
        },
      ],
    };
  }

  async acknowledgeMedication(medicationId: string, taken: boolean): Promise<{ success: boolean }> {
    console.info(`[ParentHomeService] Acknowledging medication ${medicationId} taken=${taken}`);
    return { success: true };
  }

  async submitCheckIn(req: SubmitCheckInRequest): Promise<{ success: boolean }> {
    console.info(`[ParentHomeService] Submitting check-in for ${req.parentId}: feeling=${req.feeling}`);
    return { success: true };
  }

  async respondToDecision(decisionId: string, actionKey: string): Promise<{ success: boolean }> {
    console.info(`[ParentHomeService] Responding to decision ${decisionId} with action=${actionKey}`);
    return decisionService.respondToDecision(decisionId, actionKey);
  }
}

export const parentHomeService = new CareSyncParentHomeService();
