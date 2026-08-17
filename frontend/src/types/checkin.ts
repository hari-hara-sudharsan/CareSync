export type CheckInMood = 'WELL' | 'NEED_HELP' | 'CONCERN' | 'URGENT';

export type CheckInStep =
  | 'MOOD_SELECTION'
  | 'WELL_FOLLOW_UP'
  | 'NEED_HELP_CATEGORIES'
  | 'NEED_HELP_TIMING'
  | 'CONCERN_CATEGORIES'
  | 'CONCERN_CONTACT'
  | 'URGENT_SAFETY_SELECTION'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'ERROR';

export type CareNeedCategory =
  | 'MEDICATION'
  | 'APPOINTMENT'
  | 'TRANSPORTATION'
  | 'ERRANDS'
  | 'HOUSEHOLD'
  | 'COMPANIONSHIP'
  | 'OTHER';

export type ConcernCategory =
  | 'UNWELL'
  | 'FALL_MOBILITY'
  | 'MISSED_MED'
  | 'APPOINTMENT_ISSUE'
  | 'UNSAFE'
  | 'OTHER';

export type RequestUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CheckIn {
  id: string;
  parentId: string;
  timestamp: string;
  mood: CheckInMood;
  needCategory?: CareNeedCategory;
  concernCategory?: ConcernCategory;
  urgency: RequestUrgency;
  notes?: string;
  whenNeeded?: string;
  contactTarget?: string;
  resultingCareRequestId?: string;
}

export interface CareRequestIntent {
  id?: string;
  parentId: string;
  category: CareNeedCategory;
  urgency: RequestUrgency;
  title: string;
  description: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ASSIGNED' | 'COMPLETED';
  createdAt: string;
  whenNeeded?: string;
}

export interface CheckInResult {
  success: boolean;
  checkInId: string;
  careRequestId?: string;
  message?: string;
  escalationStatus?: 'NONE' | 'PRIMARY_GUARDIAN_NOTIFIED' | 'VOLUNTEER_ALERTED' | 'EMERGENCY_PROMPTED';
}

export interface CheckInServiceContract {
  submitCheckIn: (checkInData: Omit<CheckIn, 'id' | 'timestamp'>) => Promise<CheckInResult>;
  getCheckInHistory: (parentId: string) => Promise<CheckIn[]>;
  createCareRequestFromCheckIn: (intent: CareRequestIntent) => Promise<{ success: boolean; careRequestId: string }>;
}
