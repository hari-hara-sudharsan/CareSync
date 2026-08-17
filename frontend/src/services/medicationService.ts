import type {
  MedicationServiceContract,
  TodayMedicationTimelineResponse,
  RecordMedicationEventRequest,
  MedicationEvent,
} from '@/types/medication';

/**
 * CareSync Medication Service Contract
 * 
 * Manages authoritative medication timelines and MedicationEvent recordings.
 * Strict safety boundary: frontend only records events (TAKEN / SKIPPED).
 * Clean seam ready for FastAPI backend endpoints (/api/v1/parents/medications).
 */
class CareSyncMedicationService implements MedicationServiceContract {
  public apiEndpoint = '/api/v1/parents/medications';

  async getTodayMedicationTimeline(parentId: string): Promise<TodayMedicationTimelineResponse> {
    console.info(`[MedicationService Contract] Fetching medication timeline for ${parentId}`);

    return {
      parentId,
      dateLabel: 'Today, Aug 17',
      totalScheduled: 3,
      totalTaken: 1,
      totalDue: 2,
      items: [
        {
          medication: {
            id: 'med-101',
            parentId,
            name: 'Lisinopril',
            dosageLabel: '10 mg Tablet',
            instructions: 'Take 1 tablet with warm water in the morning after breakfast.',
            prescribedBy: 'Dr. Sarah Jenkins (Cardiology)',
            pharmacyInfo: 'CVS Pharmacy #4821 (Refill ready)',
            refillRemaining: 2,
            active: true,
          },
          schedule: {
            id: 'sch-101',
            medicationId: 'med-101',
            timeOfDay: 'MORNING',
            timeOfDayLabel: '8:00 AM Daily',
            scheduledTime: '08:00',
          },
          event: {
            id: 'evt-101',
            medicationId: 'med-101',
            parentId,
            scheduledAt: '2026-08-17T08:00:00Z',
            recordedAt: '2026-08-17T08:04:00Z',
            status: 'TAKEN',
            recordedBy: 'Susan Woodson',
            notes: 'Taken with breakfast',
          },
        },
        {
          medication: {
            id: 'med-102',
            parentId,
            name: 'Metformin',
            dosageLabel: '500 mg Tablet',
            instructions: 'Take 1 tablet with lunch.',
            prescribedBy: 'Dr. Robert Chen (Endocrinology)',
            pharmacyInfo: 'CVS Pharmacy #4821',
            refillRemaining: 1,
            active: true,
          },
          schedule: {
            id: 'sch-102',
            medicationId: 'med-102',
            timeOfDay: 'AFTERNOON',
            timeOfDayLabel: '1:00 PM Daily',
            scheduledTime: '13:00',
          },
          event: {
            id: 'evt-102',
            medicationId: 'med-102',
            parentId,
            scheduledAt: '2026-08-17T13:00:00Z',
            status: 'DUE',
          },
        },
        {
          medication: {
            id: 'med-103',
            parentId,
            name: 'Vitamin D3',
            dosageLabel: '1000 IU Capsule',
            instructions: 'Take 1 capsule with evening meal.',
            prescribedBy: 'Dr. Sarah Jenkins (General Care)',
            pharmacyInfo: 'Walgreens Pharmacy #1092',
            refillRemaining: 4,
            active: true,
          },
          schedule: {
            id: 'sch-103',
            medicationId: 'med-103',
            timeOfDay: 'EVENING',
            timeOfDayLabel: '8:00 PM Daily',
            scheduledTime: '20:00',
          },
          event: {
            id: 'evt-103',
            medicationId: 'med-103',
            parentId,
            scheduledAt: '2026-08-17T20:00:00Z',
            status: 'SCHEDULED',
          },
        },
      ],
    };
  }

  async recordMedicationEvent(req: RecordMedicationEventRequest): Promise<{ success: boolean; event: MedicationEvent }> {
    console.info(`[MedicationService Contract] Recording event ${req.eventId} as ${req.status}`);

    return {
      success: true,
      event: {
        id: req.eventId,
        medicationId: 'med-102',
        parentId: 'p-1',
        scheduledAt: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        status: req.status,
        notes: req.notes,
      },
    };
  }

  async getMedicationHistory(parentId: string): Promise<MedicationEvent[]> {
    console.info(`[MedicationService Contract] Fetching medication history for ${parentId}`);
    return [];
  }
}

export const medicationService = new CareSyncMedicationService();
