import type {
  CheckIn,
  CheckInResult,
  CareRequestIntent,
  CheckInServiceContract,
} from '@/types/checkin';

/**
 * CareSync Check-In Service Contract
 * 
 * Manages parent daily check-in domain events and CareRequest intent triggers.
 * Clean abstraction interface ready for FastAPI backend integration (/api/v1/parents/checkin).
 */
class CareSyncCheckInService implements CheckInServiceContract {
  public apiEndpoint = '/api/v1/parents/checkin';

  async submitCheckIn(checkInData: Omit<CheckIn, 'id' | 'timestamp'>): Promise<CheckInResult> {
    console.info(`[CheckInService Contract] Submitting check-in for parent ${checkInData.parentId}: mood=${checkInData.mood}, urgency=${checkInData.urgency}`);

    let escalation: 'NONE' | 'PRIMARY_GUARDIAN_NOTIFIED' | 'VOLUNTEER_ALERTED' | 'EMERGENCY_PROMPTED' = 'NONE';
    let generatedReqId: string | undefined = undefined;

    if (checkInData.mood === 'URGENT') {
      escalation = 'EMERGENCY_PROMPTED';
      generatedReqId = `req-urg-${Date.now()}`;
    } else if (checkInData.mood === 'CONCERN') {
      escalation = 'PRIMARY_GUARDIAN_NOTIFIED';
      generatedReqId = `req-con-${Date.now()}`;
    } else if (checkInData.mood === 'NEED_HELP') {
      escalation = 'VOLUNTEER_ALERTED';
      generatedReqId = `req-[#req-help]-${Date.now()}`;
    }

    return {
      success: true,
      checkInId: `chk-${Date.now()}`,
      careRequestId: generatedReqId,
      escalationStatus: escalation,
      message: 'Check-in processed by CareSync service contract.',
    };
  }

  async getCheckInHistory(parentId: string): Promise<CheckIn[]> {
    console.info(`[CheckInService Contract] Fetching check-in history for ${parentId}`);
    return [
      {
        id: 'chk-101',
        parentId,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        mood: 'WELL',
        urgency: 'LOW',
        notes: 'Had a wonderful morning walk.',
      },
    ];
  }

  async createCareRequestFromCheckIn(intent: CareRequestIntent): Promise<{ success: boolean; careRequestId: string }> {
    console.info(`[CheckInService Contract] Creating CareRequest intent: category=${intent.category}, urgency=${intent.urgency}`);
    return {
      success: true,
      careRequestId: `req-${Date.now()}`,
    };
  }
}

export const checkInService = new CareSyncCheckInService();
