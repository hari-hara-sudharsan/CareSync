export type CareMemberRole =
  | 'PRIMARY_GUARDIAN'
  | 'FAMILY'
  | 'GUARDIAN'
  | 'FRIEND_NEIGHBOR'
  | 'PROFESSIONAL_CAREGIVER'
  | 'VOLUNTEER';

export type CarePermission =
  | 'CHECK_INS'
  | 'MEDICATION'
  | 'APPOINTMENTS'
  | 'TRANSPORTATION'
  | 'ERRANDS'
  | 'CARE_HISTORY';

export type CareMemberStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'REVOKED';

export interface CareMember {
  id: string;
  parentId: string;
  name: string;
  relationship: string;
  role: CareMemberRole;
  phone: string;
  email?: string;
  avatarUrl?: string;
  status: CareMemberStatus;
  permissions: CarePermission[];
  isPrimaryContact: boolean;
  locationLabel?: string;
  isAvailable: boolean;
  joinedAt: string;
}

export interface InviteCareMemberRequest {
  parentId: string;
  name: string;
  phone: string;
  relationship: string;
  role: CareMemberRole;
  permissions: CarePermission[];
  notes?: string;
}

export interface CareTeamData {
  primaryContact?: CareMember;
  members: CareMember[];
  pendingInvites: CareMember[];
}

export interface CareTeamServiceContract {
  getCareTeam: (parentId: string) => Promise<CareTeamData>;
  inviteCareMember: (req: InviteCareMemberRequest) => Promise<{ success: boolean; member: CareMember }>;
  updateCareMemberPermissions: (memberId: string, permissions: CarePermission[]) => Promise<{ success: boolean; member: CareMember }>;
  revokeCareMember: (memberId: string) => Promise<{ success: boolean }>;
}
