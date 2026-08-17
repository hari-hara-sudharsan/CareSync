export type CareLogEntryType =
  | 'CHECK_IN'
  | 'MEDICATION'
  | 'APPOINTMENT'
  | 'TRANSPORTATION'
  | 'CARE_REQUEST'
  | 'ASSIGNMENT'
  | 'MESSAGE'
  | 'SYSTEM';

export type CareLogVisibility = 'CARE_TEAM' | 'PARENT_ONLY' | 'TASK_PARTICIPANTS';

export interface CareLogEntry {
  id: string;
  parentId: string;
  type: CareLogEntryType;
  title: string;
  description?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  timestamp: string;
  visibility: CareLogVisibility;
  relatedEntityId?: string;
  relatedEntityType?: 'MEDICATION' | 'APPOINTMENT' | 'CHECK_IN' | 'CARE_REQUEST';
}

export interface AddCareMessageRequest {
  parentId: string;
  relatedEntityId?: string;
  messageText: string;
  visibility?: CareLogVisibility;
}

export interface CareLogQuery {
  limit?: number;
  type?: CareLogEntryType;
  relatedEntityId?: string;
}

export interface CareLogServiceContract {
  getCareLog: (parentId: string, query?: CareLogQuery) => Promise<CareLogEntry[]>;
  getCareTaskThread: (relatedEntityId: string) => Promise<CareLogEntry[]>;
  addCareMessage: (req: AddCareMessageRequest) => Promise<CareLogEntry>;
}
