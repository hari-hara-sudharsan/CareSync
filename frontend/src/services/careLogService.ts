import type {
  CareLogEntry,
  CareLogQuery,
  AddCareMessageRequest,
  CareLogServiceContract,
} from '@/types/care-log';

/**
 * CareSync Care Log & Communication Service Contract
 * 
 * Manages event-based care timelines, task-linked messages, and agent observation entries.
 * Clean abstraction seam ready for FastAPI backend integration (/api/v1/parents/care-log).
 */
class CareSyncCareLogService implements CareLogServiceContract {
  public apiEndpoint = '/api/v1/parents/care-log';

  async getCareLog(parentId: string, query?: CareLogQuery): Promise<CareLogEntry[]> {
    console.info(`[CareLogService Contract] Fetching care log entries for parent ${parentId}`);

    const allEntries: CareLogEntry[] = [
      {
        id: 'log-101',
        parentId,
        type: 'CHECK_IN',
        title: 'Daily Safety Check-In Recorded',
        description: 'Susan marked "I am doing well" with note: "Took my morning medicine and went for a short walk."',
        actorId: 'parent-1',
        actorName: 'Susan Woodson',
        actorRole: 'Parent',
        timestamp: '08:30 AM Today',
        visibility: 'CARE_TEAM',
        relatedEntityType: 'CHECK_IN',
        relatedEntityId: 'chk-101',
      },
      {
        id: 'log-102',
        parentId,
        type: 'MEDICATION',
        title: 'Medication Recorded as Taken',
        description: 'Lisinopril 10 mg Tablet taken after breakfast.',
        actorId: 'parent-1',
        actorName: 'Susan Woodson',
        actorRole: 'Parent',
        timestamp: '08:35 AM Today',
        visibility: 'CARE_TEAM',
        relatedEntityType: 'MEDICATION',
        relatedEntityId: 'med-101',
      },
      {
        id: 'log-103',
        parentId,
        type: 'MESSAGE',
        title: 'Care Circle Message',
        description: 'Mom, I will pick you up at 9:45 AM tomorrow for Dr. Chen\'s appointment.',
        actorId: 'mem-[#mem-1]',
        actorName: 'David Woodson',
        actorRole: 'Son (Primary Guardian)',
        timestamp: '09:15 AM Today',
        visibility: 'CARE_TEAM',
        relatedEntityType: 'APPOINTMENT',
        relatedEntityId: 'apt-201',
      },
      {
        id: 'log-104',
        parentId,
        type: 'ASSIGNMENT',
        title: 'Transportation Confirmed',
        description: 'David Woodson confirmed as driver for Cardiology Check-Up tomorrow.',
        actorId: 'mem-[#mem-1]',
        actorName: 'David Woodson',
        actorRole: 'Son',
        timestamp: '09:16 AM Today',
        visibility: 'CARE_TEAM',
        relatedEntityType: 'APPOINTMENT',
        relatedEntityId: 'apt-201',
      },
      {
        id: 'log-105',
        parentId,
        type: 'SYSTEM',
        title: 'CareSync Agent Observation',
        description: 'Observed confirmed transport for Cardiology visit. All morning medications and safety check-ins completed. Home status: ALL_CLEAR.',
        actorId: 'agent-1',
        actorName: 'CareSync Agent',
        actorRole: 'AI Care Coordinator',
        timestamp: '09:20 AM Today',
        visibility: 'CARE_TEAM',
      },
      {
        id: 'log-106',
        parentId,
        type: 'MESSAGE',
        title: 'Care Circle Message',
        description: 'Thanks David! I will stay available on standby just in case.',
        actorId: 'mem-2',
        actorName: 'Sarah Woodson',
        actorRole: 'Daughter',
        timestamp: '10:05 AM Today',
        visibility: 'CARE_TEAM',
        relatedEntityType: 'APPOINTMENT',
        relatedEntityId: 'apt-201',
      },
    ];

    if (query?.type) {
      return allEntries.filter((e) => e.type === query.type);
    }
    if (query?.relatedEntityId) {
      return allEntries.filter((e) => e.relatedEntityId === query.relatedEntityId);
    }

    return allEntries;
  }

  async getCareTaskThread(relatedEntityId: string): Promise<CareLogEntry[]> {
    return this.getCareLog('p-1', { relatedEntityId });
  }

  async addCareMessage(req: AddCareMessageRequest): Promise<CareLogEntry> {
    console.info(`[CareLogService Contract] Adding care message for parent ${req.parentId}`);

    const newEntry: CareLogEntry = {
      id: `log-msg-${Date.now()}`,
      parentId: req.parentId,
      type: 'MESSAGE',
      title: 'Care Circle Message',
      description: req.messageText,
      actorId: 'parent-1',
      actorName: 'Susan Woodson',
      actorRole: 'Parent',
      timestamp: 'Just now',
      visibility: req.visibility || 'CARE_TEAM',
      relatedEntityId: req.relatedEntityId,
    };

    return newEntry;
  }
}

export const careLogService = new CareSyncCareLogService();
