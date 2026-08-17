export type DecisionType =
  | 'TRANSPORTATION_CONFIRMATION'
  | 'CARE_REQUEST_ASSIGNMENT'
  | 'VOLUNTEER_APPROVAL'
  | 'MISSED_CHECK_IN'
  | 'ESCALATION'
  | 'COMPLAINT_REVIEW';

export type DecisionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type DecisionStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'DELEGATED' | 'EXPIRED';

export interface DecisionAction {
  key: string;
  label: string;
  variant: 'primary' | 'soft' | 'outline' | 'danger';
}

export interface DecisionCardData {
  id: string;
  type: DecisionType;
  priority: DecisionPriority;
  status: DecisionStatus;
  parentId: string;
  parentName: string;
  title: string;
  summary: string;
  reason?: string;
  relatedEntityId?: string;
  actions: DecisionAction[];
  createdAt: string;
  expiresAt?: string;
}

export interface SupportedParent {
  parentId: string;
  name: string;
  relationship: string;
  avatarUrl?: string;
  age?: number;
}

export interface FamilyHomeReadModel {
  caregiverId: string;
  caregiverName: string;
  activeParentId: string;
  activeParentName: string;
  supportedParents: SupportedParent[];
  attentionNeededCount: number;
  pendingDecisions: DecisionCardData[];
  todayCareSummary: {
    checkInStatus: 'COMPLETED' | 'PENDING' | 'CRITICAL';
    checkInTime?: string;
    medicationStatus: 'ALL_TAKEN' | 'PARTIAL' | 'MISSED';
    takenMedsCount: number;
    totalMedsCount: number;
    appointmentStatus: 'NONE' | 'UPCOMING' | 'TRANSPORT_NEEDED';
    upcomingAppointmentTitle?: string;
    upcomingAppointmentTime?: string;
  };
  recentActivity: {
    id: string;
    timestamp: string;
    text: string;
    category: string;
    actorName?: string;
  }[];
}

export interface DecisionServiceContract {
  getPendingDecisions: (caregiverId: string, parentId?: string) => Promise<DecisionCardData[]>;
  respondToDecision: (
    decisionId: string,
    actionKey: string
  ) => Promise<{ success: boolean; decision: DecisionCardData }>;
}

export interface FamilyHomeServiceContract {
  getDashboard: (caregiverId: string, parentId?: string) => Promise<FamilyHomeReadModel>;
}
