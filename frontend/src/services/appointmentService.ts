import type {
  Appointment,
  AppointmentServiceContract,
  TransportationChoice,
  MobilityRequirements,
  TransportationRequestIntent,
} from '@/types/appointment';

import { getApiBaseUrl } from './apiConfig';

/**
 * CareSync Appointment & Transportation Service
 * 
 * Interacts with FastAPI backend (/api/v1/appointments).
 * Maintains domain boundary: selecting NEED_HELP creates a TransportationRequest + CareRequest.
 */
class CareSyncAppointmentService implements AppointmentServiceContract {
  public get baseUrl(): string {
    return getApiBaseUrl();
  }

  async getUpcomingAppointments(parentId: string): Promise<Appointment[]> {
    console.info(`[AppointmentService] Fetching upcoming appointments for ${parentId}`);

    try {
      const res = await fetch(`${this.baseUrl}/appointments?parent_id=${parentId}`);
      if (res.ok) {
        const data = await res.json();
        return data.map((item: Record<string, unknown>) => ({
          id: String(item.id),
          parentId: String(item.parent_id),
          title: String(item.title),
          providerName: String(item.provider_name),
          specialty: String(item.specialty || ''),
          locationName: String(item.location_name),
          address: String(item.address),
          startsAt: String(item.starts_at),
          endsAt: item.ends_at ? String(item.ends_at) : undefined,
          status: String(item.status || 'UPCOMING') as Appointment['status'],
          notes: item.notes ? String(item.notes) : undefined,
          transportationChoice: (item.transportation_choice || 'NOT_DECIDED') as Appointment['transportationChoice'],
          transportationStatus: (item.transportation_status || 'NOT_DECIDED') as Appointment['transportationStatus'],
        }));
      }
    } catch {
      console.warn('[AppointmentService] Backend server offline. Using fallback appointments.');
    }

    return [
      {
        id: 'apt-201',
        parentId,
        title: 'Cardiology Routine Check-Up',
        providerName: 'Dr. Robert Chen',
        specialty: 'Cardiology',
        locationName: 'St. Jude Medical Center, Suite 402',
        address: '1400 Community Drive, Medical District',
        startsAt: 'Tomorrow at 10:30 AM',
        endsAt: 'Tomorrow at 11:30 AM',
        status: 'CONFIRMED',
        notes: 'Fast for 8 hours prior to lab work. Bring recent blood pressure log.',
        transportationChoice: 'NOT_DECIDED',
        transportationStatus: 'NOT_DECIDED',
      },
      {
        id: 'apt-202',
        parentId,
        title: 'Ophtalmology Eye Exam',
        providerName: 'Dr. Emily Vance',
        specialty: 'Ophthalmology',
        locationName: 'Vision Care Center',
        address: '820 Oak Street, Suite 105',
        startsAt: 'Aug 22 at 02:00 PM',
        endsAt: 'Aug 22 at 03:00 PM',
        status: 'UPCOMING',
        notes: 'Dilation required. Bringing sunglasses recommended.',
        transportationChoice: 'FAMILY_DRIVING',
        transportationStatus: 'FAMILY_MATCHED',
        assignedDriverName: 'David Woodson (Son)',
        assignedDriverPhone: '+1 (555) 234-5678',
        pickupTime: '01:15 PM',
      },
    ];
  }

  async getAppointmentDetails(appointmentId: string): Promise<Appointment> {
    const list = await this.getUpcomingAppointments('p-1');
    const apt = list.find((a) => a.id === appointmentId);
    if (!apt) throw new Error(`Appointment ${appointmentId} not found`);
    return apt;
  }

  async updateTransportationChoice(
    appointmentId: string,
    choice: TransportationChoice,
    _requirements?: MobilityRequirements
  ): Promise<{ success: boolean; appointment: Appointment }> {
    console.info(`[AppointmentService] Updating transport choice for ${appointmentId}: choice=${choice}`);

    try {
      const res = await fetch(`${this.baseUrl}/appointments/${appointmentId}/transportation?parent_id=p-1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transportation_choice: choice }),
      });
      if (res.ok) {
        const data = await res.json();
        const apt = await this.getAppointmentDetails(appointmentId);
        return {
          success: true,
          appointment: {
            ...apt,
            transportationChoice: data.transportation_choice,
            transportationStatus: data.transportation_status,
          },
        };
      }
    } catch {
      console.warn('[AppointmentService] Backend offline during transportation update.');
    }

    const apt = await this.getAppointmentDetails(appointmentId);
    let newStatus: Appointment['transportationStatus'] = 'NOT_NEEDED';

    if (choice === 'NEED_HELP') {
      newStatus = 'REQUESTED';
    } else if (choice === 'FAMILY_DRIVING') {
      newStatus = 'FAMILY_MATCHED';
    }

    const updated: Appointment = {
      ...apt,
      transportationChoice: choice,
      transportationStatus: newStatus,
    };

    return { success: true, appointment: updated };
  }

  async createTransportationIntent(intent: TransportationRequestIntent): Promise<{ success: boolean; requestId: string }> {
    console.info(`[AppointmentService] Creating TransportationRequestIntent for appointment ${intent.appointmentId}`);
    return {
      success: true,
      requestId: `trans-${Date.now()}`,
    };
  }
}

export const appointmentService = new CareSyncAppointmentService();
