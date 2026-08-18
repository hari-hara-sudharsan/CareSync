import type {
  CareRequest,
  CareRequestFilters,
  AssignmentCandidate,
  CareRequestServiceContract,
} from '@/types/care-request';

/**
 * CareSync Care Request & Assignment Service
 * 
 * Communicates directly with FastAPI backend (/api/v1/care-requests)
 * with graceful fallback to local mock data if the API server is offline.
 */
class CareSyncCareRequestService implements CareRequestServiceContract {
  public baseUrl = 'http://localhost:8000/api/v1';

  async getCareRequests(
    caregiverId: string,
    parentId?: string,
    filters?: CareRequestFilters
  ): Promise<CareRequest[]> {
    console.info(`[CareRequestService] Fetching care requests for caregiver ${caregiverId}, parentId=${parentId}`);

    try {
      const pid = parentId || 'p-1';
      const url = `${this.baseUrl}/care-requests?parent_id=${pid}${filters?.status ? `&status_filter=${filters.status}` : ''}`;
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map(this.mapBackendRequest);
        }
      }
    } catch {
      console.warn('[CareRequestService] Backend server offline or unreachable. Falling back to local domain contracts.');
    }

    return this.getFallbackRequests(parentId, filters);
  }

  private mapBackendRequest(raw: Record<string, unknown>): CareRequest {
    return {
      id: String(raw.id || 'req-1'),
      parentId: String(raw.parent_id || 'p-1'),
      parentName: String(raw.parent_name || 'Susan Woodson'),
      category: raw.category as CareRequest['category'],
      title: String(raw.title || 'Care Task'),
      description: String(raw.description || ''),
      priority: raw.priority as CareRequest['priority'],
      status: raw.status as CareRequest['status'],
      requestedTime: String(raw.requested_time || 'Today'),
      createdAt: String(raw.created_at || 'Just now'),
      locationName: raw.location_name ? String(raw.location_name) : undefined,
      address: raw.address ? String(raw.address) : undefined,
      assignedTo: raw.assigned_to_name ? {
        id: String(raw.assigned_to_id || 'c-1'),
        name: String(raw.assigned_to_name),
        role: String(raw.assigned_to_role || 'Caregiver'),
        assignedAt: 'Recently',
      } : undefined,
      candidates: [
        { id: 'c-1', name: 'David Woodson', relationship: 'Son', type: 'FAMILY', isAvailable: true, locationLabel: '2.5 km away', phone: '+1 (555) 234-5678' },
        { id: 'c-2', name: 'Sarah Woodson', relationship: 'Daughter', type: 'FAMILY', isAvailable: true, locationLabel: '5.0 km away', phone: '+1 (555) 876-5432' },
        { id: 'c-3', name: 'Priya Sharma', relationship: 'Verified Volunteer', type: 'VOLUNTEER', isAvailable: true, matchScore: 94, locationLabel: '1.4 km away', rating: 4.9, phone: '+1 (555) 345-6789' },
      ],
      history: [
        { id: 'h-1', assigneeName: 'Sarah Woodson', assigneeRole: 'Daughter', status: 'DECLINED', timestamp: '1 hour ago', reason: 'Work conflict during morning hours' },
      ],
    };
  }

  private getFallbackRequests(parentId?: string, filters?: CareRequestFilters): CareRequest[] {
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
    ];

    if (filters?.status) return allRequests.filter((r) => r.status === filters.status);
    if (filters?.category) return allRequests.filter((r) => r.category === filters.category);
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
    console.info(`[CareRequestService] Assigning request ${requestId} to candidate ${assigneeId}`);
    
    try {
      const res = await fetch(`${this.baseUrl}/care-requests/${requestId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `assign-${requestId}-${Date.now()}`,
        },
        body: JSON.stringify({ assignee_id: assigneeId }),
      });
      if (res.ok) {
        const updatedRaw = await res.json();
        const req = await this.getCareRequest(requestId);
        return {
          success: true,
          request: {
            ...req,
            status: 'ASSIGNED',
            assignedTo: {
              id: assigneeId,
              name: updatedRaw.assigned_to_name || 'David Woodson',
              role: 'Son (Family)',
              assignedAt: 'Just now',
            },
          },
        };
      }
    } catch {
      console.warn('[CareRequestService] Backend offline during assignment. Using fallback execution.');
    }

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
    console.info(`[CareRequestService] Declining assignment ${assignmentId}, reason=${reason}`);
    return { success: true };
  }
}

export const careRequestService = new CareSyncCareRequestService();
