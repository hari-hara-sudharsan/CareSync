import type {
  CareMember,
  CareTeamData,
  CareTeamServiceContract,
  InviteCareMemberRequest,
  CarePermission,
} from '@/types/care-team';

/**
 * CareSync Care Team Service Contract
 * 
 * Manages parent care circle members, task-scoped permissions, and invitation lifecycles.
 * Clean abstraction seam ready for FastAPI backend endpoints (/api/v1/parents/care-team).
 */
class CareSyncCareTeamService implements CareTeamServiceContract {
  public apiEndpoint = '/api/v1/parents/care-team';

  async getCareTeam(parentId: string): Promise<CareTeamData> {
    console.info(`[CareTeamService Contract] Fetching care team for parent ${parentId}`);

    const primaryContact: CareMember = {
      id: 'mem-[#mem-1]',
      parentId,
      name: 'David Woodson',
      relationship: 'Son',
      role: 'PRIMARY_GUARDIAN',
      phone: '+1 (555) 234-5678',
      email: 'david.woodson@example.com',
      status: 'ACTIVE',
      permissions: ['CHECK_INS', 'MEDICATION', 'APPOINTMENTS', 'TRANSPORTATION', 'ERRANDS', 'CARE_HISTORY'],
      isPrimaryContact: true,
      locationLabel: '2.5 km away',
      isAvailable: true,
      joinedAt: '2026-01-10T00:00:00Z',
    };

    const members: CareMember[] = [
      {
        id: 'mem-2',
        parentId,
        name: 'Sarah Woodson',
        relationship: 'Daughter',
        role: 'FAMILY',
        phone: '+1 (555) 876-5432',
        email: 'sarah.woodson@example.com',
        status: 'ACTIVE',
        permissions: ['CHECK_INS', 'APPOINTMENTS', 'TRANSPORTATION', 'ERRANDS'],
        isPrimaryContact: false,
        locationLabel: '5.0 km away',
        isAvailable: true,
        joinedAt: '2026-01-15T00:00:00Z',
      },
      {
        id: 'mem-[#mem-3]',
        parentId,
        name: 'Priya Sharma',
        relationship: 'Verified Volunteer',
        role: 'VOLUNTEER',
        phone: '+1 (555) 345-6789',
        status: 'ACTIVE',
        permissions: ['TRANSPORTATION', 'ERRANDS'],
        isPrimaryContact: false,
        locationLabel: '1.4 km away',
        isAvailable: true,
        joinedAt: '2026-02-01T00:00:00Z',
      },
    ];

    const pendingInvites: CareMember[] = [
      {
        id: 'mem-inv-1',
        parentId,
        name: 'Kumar Patel',
        relationship: 'Neighbor / Friend',
        role: 'FRIEND_NEIGHBOR',
        phone: '+1 (555) 987-6543',
        status: 'PENDING',
        permissions: ['CHECK_INS', 'ERRANDS'],
        isPrimaryContact: false,
        isAvailable: false,
        joinedAt: new Date().toISOString(),
      },
    ];

    return { primaryContact, members, pendingInvites };
  }

  async inviteCareMember(req: InviteCareMemberRequest): Promise<{ success: boolean; member: CareMember }> {
    console.info(`[CareTeamService Contract] Registering invitation for ${req.name} (${req.relationship})`);
    const newMember: CareMember = {
      id: `mem-inv-${Date.now()}`,
      parentId: req.parentId,
      name: req.name,
      relationship: req.relationship,
      role: req.role,
      phone: req.phone,
      status: 'PENDING',
      permissions: req.permissions,
      isPrimaryContact: false,
      isAvailable: true,
      joinedAt: new Date().toISOString(),
    };
    return { success: true, member: newMember };
  }

  async updateCareMemberPermissions(
    memberId: string,
    permissions: CarePermission[]
  ): Promise<{ success: boolean; member: CareMember }> {
    console.info(`[CareTeamService Contract] Updating permissions for ${memberId}: ${permissions.join(', ')}`);
    const team = await this.getCareTeam('p-1');
    const existing = team.members.find((m) => m.id === memberId) || team.primaryContact!;
    return {
      success: true,
      member: { ...existing, permissions },
    };
  }

  async revokeCareMember(memberId: string): Promise<{ success: boolean }> {
    console.info(`[CareTeamService Contract] Revoking care member ${memberId}`);
    return { success: true };
  }
}

export const careTeamService = new CareSyncCareTeamService();
