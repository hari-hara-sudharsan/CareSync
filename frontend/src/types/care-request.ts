export type CareRequestStatus =
  | 'CREATED'
  | 'CLASSIFIED'
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PARENT_CONFIRMED'
  | 'CLOSED'
  | 'ESCALATED'
  | 'FAILED';

export type CareRequestPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CareRequestCategory =
  | 'MEDICATION'
  | 'APPOINTMENT'
  | 'TRANSPORTATION'
  | 'GROCERIES'
  | 'PHARMACY'
  | 'HOUSEHOLD'
  | 'COMPANIONSHIP'
  | 'CHECK_IN'
  | 'OTHER';

export interface AssignmentCandidate {
  id: string;
  name: string;
  relationship: string;
  type: 'FAMILY' | 'VOLUNTEER';
  isAvailable: boolean;
  matchScore?: number;
  locationLabel?: string;
  rating?: number;
  phone?: string;
}

export interface AssignmentHistoryEntry {
  id: string;
  assigneeName: string;
  assigneeRole: string;
  status: 'ACCEPTED' | 'DECLINED' | 'TIMEOUT' | 'CANCELLED';
  timestamp: string;
  reason?: string;
}

export interface CareRequest {
  id: string;
  parentId: string;
  parentName: string;
  category: CareRequestCategory;
  title: string;
  description: string;
  priority: CareRequestPriority;
  status: CareRequestStatus;
  requestedTime: string;
  createdAt: string;
  locationName?: string;
  address?: string;
  assignedTo?: {
    id: string;
    name: string;
    role: string;
    phone?: string;
    assignedAt: string;
  };
  candidates?: AssignmentCandidate[];
  history?: AssignmentHistoryEntry[];
}

export interface CareRequestFilters {
  status?: CareRequestStatus;
  category?: CareRequestCategory;
  priority?: CareRequestPriority;
}

export interface CareRequestServiceContract {
  getCareRequests: (
    caregiverId: string,
    parentId?: string,
    filters?: CareRequestFilters
  ) => Promise<CareRequest[]>;
  getCareRequest: (requestId: string) => Promise<CareRequest>;
  getAssignmentCandidates: (requestId: string) => Promise<AssignmentCandidate[]>;
  assignCareRequest: (
    requestId: string,
    assigneeId: string
  ) => Promise<{ success: boolean; request: CareRequest }>;
  declineAssignment: (
    assignmentId: string,
    reason?: string
  ) => Promise<{ success: boolean }>;
}
