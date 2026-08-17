import type {
  CareRequest,
  CareRequestFilters,
  AssignmentCandidate,
  CareRequestServiceContract,
} from '@/types/care-request';

/**
 * CareSync Care Request & Assignment Service Contract
 * 
 * Manages care requests, assignment candidates, family-first selection, and assignment history.
 * Clean abstraction seam ready for FastAPI backend integration (/api/v1/family/care-requests).
 */
class CareSyncCareRequestService implements CareRequestServiceContract {
  public apiEndpoint = '/api/v1/family/care-requests';

  async getCareRequests(
    caregiverId: string,
    parentId?: string,
    filters?: CareRequestFilters
  ): Promise<CareRequest[]> {
    console.info(`[CareRequestService Contract] Fetching care requests for caregiver ${caregiverId}, parentId=${parentId}`);

    const allRequests: CareRequest[] = [
      {
        id: 'req-401',
        parentId: parentId || 'p-1',
        parentName: 'Susan Woodson',
        category: 'TRANSPORTATION',
        title: 'Ride to Cardiology Appointment',
        description: 'Mom needs a ride to St. Jude Medical Center for her 10:30 AM appointment with Dr. Robert Chen.',
        priority: 'CRITICAL',
        status: 'PENDING_ASSIGNMENT',
        requestedTime: 'Tomorrow at 09:45 AM',
        createdAt: '2 hours ago',
        locationName: 'St. Jude Medical Center, Suite 402',
        address: '1400 Community Drive',
        candidates: [
          { id: 'c-1', name: 'David Woodson', relationship: 'Son', type: 'FAMILY', isAvailable: true, locationLabel: '2.5 km away', phone: '+1 (555) 234-5678' },
          { id: 'c-2', name: 'Sarah Woodson', relationship: 'Daughter', type: 'FAMILY', isAvailable: true, locationLabel: '5.0 km away', phone: '+1 (555) 876-5432' },
          { id: 'c-3', name: 'Priya Sharma', relationship: 'Verified Volunteer', type: 'VOLUNTEER', isAvailable: true, matchScore: 94, locationLabel: '1.4 km away', rating: 4.9, phone: '+1 (555) 345-6789' },
        ],
        history: [
          { id: 'h-1', assigneeName: 'Sarah Woodson', assigneeRole: 'Daughter', status: 'DECLINED', timestamp: '1 hour ago', reason: 'Work conflict during morning hours' },
        ],
      },
      {
        id: 'req-402',
        parentId: parentId || 'p-1',
        parentName: 'Susan Woodson',
        category: 'PHARMACY',
        title: 'Prescription Refill Pickup',
        description: 'Pickup Lisinopril refill from CVS Pharmacy on Oak Street.',
        priority: 'HIGH',
        status: 'ASSIGNED',
        requestedTime: 'Today by 05:00 PM',
        createdAt: '3 hours ago',
        locationName: 'CVS Pharmacy, Oak Street',
        address: '820 Oak Street',
        assignedTo: {
          id: 'c-1',
          name: 'David Woodson',
          role: 'Son (Primary Guardian)',
          phone: '+1 (555) 234-5678',
          assignedAt: '30 mins ago',
        },
        history: [
          { id: 'h-2', assigneeName: 'David Woodson', assigneeRole: 'Son', status: 'ACCEPTED', timestamp: '30 mins ago' },
        ],
      },
      {
        id: 'req-403',
        parentId: parentId || 'p-1',
        parentName: 'Susan Woodson',
        category: 'GROCERIES',
        title: 'Weekly Grocery Shopping',
        description: 'Milk, fresh fruits, whole wheat bread, and sugar-free oatmeal.',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        requestedTime: 'Yesterday at 04:00 PM',
        createdAt: '1 day ago',
        locationName: 'Trader Joe\'s Market',
        assignedTo: {
          id: 'c-[#mem-3]',
          name: 'Priya Sharma',
          role: 'Verified Volunteer',
          phone: '+1 (555) 345-6789',
          assignedAt: 'Yesterday 02:00 PM',
        },
        history: [
          { id: 'h-3', assigneeName: 'Priya Sharma', assigneeRole: 'Volunteer', status: 'ACCEPTED', timestamp: 'Yesterday 02:00 PM' },
        ],
      },
    ];

    if (filters?.status) {
      return allRequests.filter((r) => r.status === filters.status);
    }
    if (filters?.category) {
      return allRequests.filter((r) => r.category === filters.category);
    }

    return allRequests;
  }

  async getCareRequest(requestId: string): Promise<CareRequest> {
    const list = await this.getCareRequests('c-1');
    const req = list.find((r) => r.id === requestId);
    if (!req) throw new Error(`CareRequest ${requestId} not found`);
    return req;
  }

  async getAssignmentCandidates(requestId: string): Promise<AssignmentCandidate[]> {
    const req = await this.getCareRequest(requestId);
    return req.candidates || [];
  }

  async assignCareRequest(
    requestId: string,
    assigneeId: string
  ): Promise<{ success: boolean; request: CareRequest }> {
    console.info(`[CareRequestService Contract] Assigning request ${requestId} to candidate ${assigneeId}`);
    const req = await this.getCareRequest(requestId);
    const candidate = req.candidates?.find((c) => c.id === assigneeId);

    const updated: CareRequest = {
      ...req,
      status: 'ASSIGNED',
      assignedTo: {
        id: assigneeId,
        name: candidate?.name || 'Assigned Helper',
        role: candidate?.relationship || 'Caregiver',
        phone: candidate?.phone || '+1 (555) 000-0000',
        assignedAt: 'Just now',
      },
      history: [
        ...(req.history || []),
        {
          id: `h-${Date.now()}`,
          assigneeName: candidate?.name || 'Assigned Helper',
          assigneeRole: candidate?.relationship || 'Caregiver',
          status: 'ACCEPTED',
          timestamp: 'Just now',
        },
      ],
    };

    return { success: true, request: updated };
  }

  async declineAssignment(assignmentId: string, reason?: string): Promise<{ success: boolean }> {
    console.info(`[CareRequestService Contract] Declining assignment ${assignmentId}, reason=${reason}`);
    return { success: true };
  }
}

export const careRequestService = new CareSyncCareRequestService();
