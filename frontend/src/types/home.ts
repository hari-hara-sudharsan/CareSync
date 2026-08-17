import type {
  Medication,
  Appointment,
  CareRequest,
  DecisionCardData,
  CareMember,
} from '@/types';

export type ParentHomeStatus = 'HANDLED' | 'NEEDS_ATTENTION' | 'CRITICAL';

export interface ParentHomeReadModel {
  parentId: string;
  parentName: string;
  greeting: string;
  status: ParentHomeStatus;
  statusTitle: string;
  statusSubtitle: string;
  lastCheckedTime: string;
  checkInStatus: 'COMPLETED' | 'PENDING' | 'URGENT';
  lastCheckInTime?: string;
  dueMedications: Medication[];
  upcomingAppointments: Appointment[];
  activeCareRequests: CareRequest[];
  attentionCards: DecisionCardData[];
  careTeam: CareMember[];
}

export interface SubmitCheckInRequest {
  parentId: string;
  feeling: 'GOOD' | 'NEED_HELP' | 'NEED_HELP_NOW';
  note?: string;
}

export interface ParentHomeServiceContract {
  getParentHomeData: (parentId: string) => Promise<ParentHomeReadModel>;
  acknowledgeMedication: (medicationId: string, taken: boolean) => Promise<{ success: boolean }>;
  submitCheckIn: (req: SubmitCheckInRequest) => Promise<{ success: boolean }>;
  respondToDecision: (decisionId: string, actionKey: string) => Promise<{ success: boolean }>;
}
