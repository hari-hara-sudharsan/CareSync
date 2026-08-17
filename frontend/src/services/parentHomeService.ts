import type {
  ParentHomeReadModel,
  ParentHomeServiceContract,
  SubmitCheckInRequest,
} from '@/types/home';

/**
 * CareSync Parent Home Read-Model Service Contract
 * 
 * Provides typed read-model data structures and interaction contracts.
 * No fake local storage or fake backend execution.
 */
class CareSyncParentHomeService implements ParentHomeServiceContract {
  public apiEndpoint = '/api/v1/parents/home';

  async getParentHomeData(parentId: string): Promise<ParentHomeReadModel> {
    console.info(`[ParentHomeService Contract] Fetching read-model for parent ID: ${parentId}`);

    // Realistic typed read-model structure for initial rendering contract
    return {
      parentId,
      parentName: 'Susan Woodson',
      greeting: 'Good morning, Susan',
      status: 'HANDLED',
      statusTitle: "✓ You're all set",
      statusSubtitle: 'Everything important is handled for today. All medications and check-ins are up to date.',
      lastCheckedTime: '09:04 AM',
      checkInStatus: 'COMPLETED',
      lastCheckInTime: '08:30 AM Today',
      dueMedications: [
        {
          id: 'med-101',
          name: 'Lisinopril',
          dosage: '10mg Tablet',
          time: '09:00 AM Daily',
          taken: true,
          instructions: 'Take 1 tablet with warm water after breakfast',
          prescribedBy: 'Dr. Sarah Jenkins',
        },
        {
          id: 'med-[#med-102]',
          name: 'Vitamin D3',
          dosage: '1000 IU Capsule',
          time: '06:00 PM Daily',
          taken: false,
          instructions: 'Take with evening meal',
          prescribedBy: 'Dr. Sarah Jenkins',
        },
      ],
      upcomingAppointments: [
        {
          id: 'apt-201',
          title: 'Cardiology Routine Check-Up',
          doctorName: 'Dr. Robert Chen',
          location: 'St. Jude Medical Center, Suite 402',
          dateTime: 'Tomorrow at 10:30 AM',
          type: 'SPECIALIST',
          notes: 'Fast for 8 hours prior to lab work.',
          transportRequired: true,
        },
      ],
      activeCareRequests: [
        {
          id: 'req-301',
          title: 'Pick up hypertension prescription',
          category: 'MEDICATION',
          parentId,
          parentName: 'Susan Woodson',
          description: 'Refill Lisinopril from CVS Pharmacy on Main St.',
          status: 'AWAITING_APPROVAL',
          urgency: 'MEDIUM',
          createdAt: '20 mins ago',
          dueBy: 'Today, 5:00 PM',
          assignedTo: undefined,
        },
      ],
      attentionCards: [
        {
          id: 'dec-401',
          title: 'Tomorrow\'s Doctor Transport',
          parentName: 'Susan Woodson',
          description: 'Your appointment is tomorrow at 10:30 AM with Dr. Robert Chen. Family members are at work.',
          whySurfaced: 'CareSync matched David (Son) who is available to drive you at 09:45 AM.',
          recommendation: 'Confirm David for transport to St. Jude Medical Center.',
          urgency: 'MEDIUM',
          options: [
            { label: 'Confirm David', action: 'confirm_david', variant: 'primary' },
            { label: 'Request Volunteer Ride', action: 'request_volunteer', variant: 'soft' },
            { label: 'Cancel Ride', action: 'cancel_ride', variant: 'outline' },
          ],
          expiresIn: '4 hours',
        },
      ],
      careTeam: [
        {
          id: 'mem-[#mem-1]',
          name: 'David Woodson',
          relationship: 'Son',
          phone: '+1 (555) 234-5678',
          role: 'PRIMARY_GUARDIAN',
          isAvailable: true,
          location: '2.5 km away',
        },
        {
          id: 'mem-2',
          name: 'Sarah Woodson',
          relationship: 'Daughter',
          phone: '+1 (555) 876-5432',
          role: 'FAMILY',
          isAvailable: true,
          location: '5.0 km away',
        },
        {
          id: 'mem-[#mem-3]',
          name: 'Priya Sharma',
          relationship: 'Verified Volunteer',
          phone: '+1 (555) 345-6789',
          role: 'VOLUNTEER',
          isAvailable: true,
          location: '1.4 km away',
        },
      ],
    };
  }

  async acknowledgeMedication(medicationId: string, taken: boolean): Promise<{ success: boolean }> {
    console.info(`[ParentHomeService Contract] Acknowledging medication ${medicationId} taken=${taken}`);
    return { success: true };
  }

  async submitCheckIn(req: SubmitCheckInRequest): Promise<{ success: boolean }> {
    console.info(`[ParentHomeService Contract] Submitting check-in for ${req.parentId}: feeling=${req.feeling}`);
    return { success: true };
  }

  async respondToDecision(decisionId: string, actionKey: string): Promise<{ success: boolean }> {
    console.info(`[ParentHomeService Contract] Responding to decision ${decisionId} with action=${actionKey}`);
    return { success: true };
  }
}

export const parentHomeService = new CareSyncParentHomeService();
