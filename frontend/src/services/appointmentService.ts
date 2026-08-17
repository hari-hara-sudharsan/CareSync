import type {
  Appointment,
  AppointmentServiceContract,
  TransportationChoice,
  MobilityRequirements,
  TransportationRequestIntent,
} from '@/types/appointment';

/**
 * CareSync Appointment & Transportation Service Contract
 * 
 * Clean domain boundary separating Appointment definitions from Transportation requests.
 * An appointment does NOT automatically create a transportation request.
 * Interface ready for FastAPI endpoints (/api/v1/parents/appointments).
 */
class CareSyncAppointmentService implements AppointmentServiceContract {
  public apiEndpoint = '/api/v1/parents/appointments';

  async getUpcomingAppointments(parentId: string): Promise<Appointment[]> {
    console.info(`[AppointmentService Contract] Fetching upcoming appointments for ${parentId}`);

    return [
      {
        id: 'apt-201',
        parentId,
        title: 'Cardiology Routine Check-Up',
        providerName: 'Dr. Robert Chen',
        specialty: 'Cardiology',
        locationName: 'St. Jude Medical Center, Suite 402',
        address: '1400 Community Drive, Medical District',
        startsAt: '2026-08-18T10:30:00Z',
        endsAt: '2026-08-18T11:30:00Z',
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
        startsAt: '2026-08-22T14:00:00Z',
        endsAt: '2026-08-22T15:00:00Z',
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
    requirements?: MobilityRequirements
  ): Promise<{ success: boolean; appointment: Appointment }> {
    console.info(`[AppointmentService Contract] Updating transport choice for ${appointmentId}: choice=${choice}`);

    const apt = await this.getAppointmentDetails(appointmentId);
    let newStatus: Appointment['transportationStatus'] = 'NOT_NEEDED';

    if (choice === 'NEED_HELP') {
      newStatus = 'REQUESTED';
    } else if (choice === 'FAMILY_DRIVING') {
      newStatus = 'FAMILY_MATCHED';
    } else if (choice === 'NOT_DECIDED') {
      newStatus = 'NOT_DECIDED';
    }

    const updated: Appointment = {
      ...apt,
      transportationChoice: choice,
      transportationStatus: newStatus,
    };

    if (choice === 'NEED_HELP' && requirements) {
      await this.createTransportationIntent({
        appointmentId,
        parentId: apt.parentId,
        pickupAddress: 'Parent Home Residence',
        destinationAddress: apt.address,
        pickupTime: '09:45 AM',
        mobilityRequirements: requirements,
      });
    }

    return { success: true, appointment: updated };
  }

  async createTransportationIntent(intent: TransportationRequestIntent): Promise<{ success: boolean; requestId: string }> {
    console.info(`[AppointmentService Contract] Creating TransportationRequestIntent for appointment ${intent.appointmentId}`);
    return {
      success: true,
      requestId: `trans-${Date.now()}`,
    };
  }
}

export const appointmentService = new CareSyncAppointmentService();
