import type {
  FamilyHomeReadModel,
  FamilyHomeServiceContract,
} from '@/types/family';
import { decisionService } from './decisionService';

/**
 * CareSync Family / Caregiver Home Read-Model Service Contract
 * 
 * Provides aggregated read-models for the Caregiver Operational Dashboard.
 * Clean seam ready for FastAPI backend endpoints (/api/v1/family/home).
 */
class CareSyncFamilyHomeService implements FamilyHomeServiceContract {
  public apiEndpoint = '/api/v1/family/home';

  async getDashboard(caregiverId: string, parentId?: string): Promise<FamilyHomeReadModel> {
    console.info(`[FamilyHomeService Contract] Fetching dashboard for caregiver ${caregiverId}, activeParentId=${parentId}`);

    const decisions = await decisionService.getPendingDecisions(caregiverId, parentId);

    return {
      caregiverId,
      caregiverName: 'David Woodson',
      activeParentId: parentId || 'p-1',
      activeParentName: parentId === 'p-2' ? 'George Miller' : 'Susan Woodson',
      supportedParents: [
        { parentId: 'p-1', name: 'Susan Woodson', relationship: 'Mother', age: 74 },
        { parentId: 'p-2', name: 'George Miller', relationship: 'Father-in-law', age: 81 },
      ],
      attentionNeededCount: decisions.length,
      pendingDecisions: decisions,
      todayCareSummary: {
        checkInStatus: 'COMPLETED',
        checkInTime: '08:30 AM Today',
        medicationStatus: 'PARTIAL',
        takenMedsCount: 1,
        totalMedsCount: 3,
        appointmentStatus: 'TRANSPORT_NEEDED',
        upcomingAppointmentTitle: 'Cardiology Routine Check-Up',
        upcomingAppointmentTime: 'Tomorrow at 10:30 AM',
      },
      recentActivity: [
        { id: 'act-1', timestamp: '08:30 AM', text: 'Daily safety check-in completed: "I am doing well"', category: 'CHECK_IN', actorName: 'Susan Woodson' },
        { id: 'act-2', timestamp: '08:35 AM', text: 'Lisinopril (10 mg) recorded as taken', category: 'MEDICATION', actorName: 'Susan Woodson' },
        { id: 'act-3', timestamp: '09:15 AM', text: 'Transportation help requested for Cardiology visit', category: 'TRANSPORTATION', actorName: 'Susan Woodson' },
        { id: 'act-4', timestamp: '09:20 AM', text: 'CareSync Agent observed missing transport assignment and created Decision Card', category: 'AGENT', actorName: 'CareSync Agent' },
      ],
    };
  }
}

export const familyHomeService = new CareSyncFamilyHomeService();
