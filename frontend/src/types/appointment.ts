export type AppointmentStatus =
  | 'UPCOMING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED';

export type TransportationChoice =
  | 'FAMILY_DRIVING'
  | 'OWN_TRANSPORT'
  | 'PUBLIC_TRANSPORT'
  | 'NEED_HELP'
  | 'NOT_DECIDED';

export type TransportationStatus =
  | 'NOT_NEEDED'
  | 'NOT_DECIDED'
  | 'REQUESTED'
  | 'FAMILY_MATCHED'
  | 'VOLUNTEER_MATCHED'
  | 'ASSIGNED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export interface MobilityRequirements {
  mobilityAssistance: boolean;
  wheelchairAccessible: boolean;
  doorToDoor: boolean;
  escortRequired: boolean;
  companionRequired: boolean;
}

export interface Appointment {
  id: string;
  parentId: string;
  title: string;
  providerName: string;
  specialty?: string;
  locationName: string;
  address: string;
  startsAt: string; // ISO String
  endsAt?: string;
  status: AppointmentStatus;
  notes?: string;
  transportationChoice: TransportationChoice;
  transportationStatus: TransportationStatus;
  transportationRequestId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  pickupTime?: string;
}

export interface TransportationRequestIntent {
  id?: string;
  appointmentId: string;
  parentId: string;
  pickupAddress: string;
  destinationAddress: string;
  pickupTime: string;
  mobilityRequirements: MobilityRequirements;
  notes?: string;
}

export interface AppointmentServiceContract {
  getUpcomingAppointments: (parentId: string) => Promise<Appointment[]>;
  getAppointmentDetails: (appointmentId: string) => Promise<Appointment>;
  updateTransportationChoice: (
    appointmentId: string,
    choice: TransportationChoice,
    requirements?: MobilityRequirements
  ) => Promise<{ success: boolean; appointment: Appointment }>;
  createTransportationIntent: (intent: TransportationRequestIntent) => Promise<{ success: boolean; requestId: string }>;
}
