export type CareRequestStatus =
  | 'CREATED'
  | 'CLASSIFIED'
  | 'PENDING_ASSIGNMENT'
  | 'AWAITING_APPROVAL'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PARENT_CONFIRMED'
  | 'CLOSED'
  | 'DECLINED'
  | 'TIMEOUT'
  | 'FAILED'
  | 'ESCALATED';

export type CategoryType = 'MEDICATION' | 'APPOINTMENT' | 'ERRAND' | 'TRAVEL' | 'COMPANIONSHIP' | 'HOME_HELP' | 'SAFETY';

export interface CareRequest {
  id: string;
  title: string;
  category: CategoryType;
  parentId: string;
  parentName: string;
  description: string;
  status: CareRequestStatus;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  dueBy?: string;
  assignedTo?: {
    id: string;
    name: string;
    role: 'FAMILY' | 'VOLUNTEER';
  };
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  instructions?: string;
  prescribedBy?: string;
  refillNeeded?: boolean;
}

export interface Appointment {
  id: string;
  title: string;
  doctorName: string;
  location: string;
  dateTime: string;
  type: string;
  notes?: string;
  transportRequired?: boolean;
}

export interface CheckIn {
  id: string;
  date: string;
  time: string;
  feeling: 'GOOD' | 'NEED_HELP' | 'NEED_HELP_NOW';
  note?: string;
  acknowledgedByAgent: boolean;
}

export interface CareMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  role: 'PRIMARY_GUARDIAN' | 'FAMILY' | 'VOLUNTEER' | 'ADMIN';
  avatarUrl?: string;
  isAvailable: boolean;
  location?: string;
}

export interface DecisionCardData {
  id: string;
  title: string;
  parentName: string;
  description: string;
  whySurfaced: string;
  recommendation: string;
  urgency: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  options: { label: string; action: string; variant?: 'primary' | 'secondary' | 'soft' | 'outline' | 'danger' }[];
  expiresIn?: string;
}

export interface VolunteerMatch {
  id: string;
  name: string;
  distanceKm: number;
  reliabilityPercent: number;
  tasksCompleted: number;
  availabilityWindow: string;
  avatarUrl?: string;
  matchReason: string;
  verificationStatus: 'VERIFIED' | 'PENDING';
}

export interface AgentActivity {
  id: string;
  timestamp: string;
  trigger: string;
  actionExecuted: string;
  toolCalled: string;
  status: 'SUCCESS' | 'NEED_HUMAN' | 'IN_PROGRESS' | 'FAILED';
  summary: string;
}
