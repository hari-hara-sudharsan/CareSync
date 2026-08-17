export type MedicationStatus =
  | 'SCHEDULED'
  | 'DUE'
  | 'TAKEN'
  | 'SKIPPED'
  | 'MISSED'
  | 'LATE'
  | 'UNCONFIRMED';

export type TimeOfDayGroup = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export interface Medication {
  id: string;
  parentId: string;
  name: string;
  dosageLabel: string;
  instructions: string;
  prescribedBy?: string;
  pharmacyInfo?: string;
  refillRemaining?: number;
  active: boolean;
}

export interface MedicationSchedule {
  id: string;
  medicationId: string;
  timeOfDay: TimeOfDayGroup;
  timeOfDayLabel: string; // e.g. "8:00 AM Daily"
  scheduledTime: string; // e.g. "08:00"
}

export interface MedicationEvent {
  id: string;
  medicationId: string;
  parentId: string;
  scheduledAt: string;
  recordedAt?: string;
  status: MedicationStatus;
  recordedBy?: string;
  notes?: string;
}

export interface MedicationTimelineItem {
  event: MedicationEvent;
  medication: Medication;
  schedule: MedicationSchedule;
}

export interface TodayMedicationTimelineResponse {
  parentId: string;
  dateLabel: string;
  totalScheduled: number;
  totalTaken: number;
  totalDue: number;
  items: MedicationTimelineItem[];
}

export interface RecordMedicationEventRequest {
  eventId: string;
  status: 'TAKEN' | 'SKIPPED';
  notes?: string;
}

export interface MedicationServiceContract {
  getTodayMedicationTimeline: (parentId: string) => Promise<TodayMedicationTimelineResponse>;
  recordMedicationEvent: (req: RecordMedicationEventRequest) => Promise<{ success: boolean; event: MedicationEvent }>;
  getMedicationHistory: (parentId: string) => Promise<MedicationEvent[]>;
}
