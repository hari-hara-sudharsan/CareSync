export type CareSituationType =
  | 'FAMILY'
  | 'FRIENDS'
  | 'PROFESSIONAL_CAREGIVER'
  | 'COMMUNITY_VOLUNTEER'
  | 'SELF_MANAGED'
  | 'NEED_VOLUNTEER_MATCH';

export type CareNeedType =
  | 'MEDICATION_REMINDERS'
  | 'DOCTOR_APPOINTMENTS'
  | 'DAILY_CHECK_INS'
  | 'ERRANDS'
  | 'TRANSPORTATION'
  | 'COMPANIONSHIP'
  | 'HOUSEHOLD_HELP';

export interface CareMemberInvite {
  id?: string;
  name: string;
  phone: string;
  relationship: string;
  helpPermissions: CareNeedType[];
}

export interface ParentOnboardingProfile {
  fullName: string;
  preferredName: string;
  preferredLanguage: string;
  timezone: string;
  locationRegion?: string;
  careSituation?: CareSituationType;
  careNeeds: CareNeedType[];
  trustedMembers: CareMemberInvite[];
  isCompleted: boolean;
}

export interface OnboardingState {
  currentStep: number; // 1 to 4
  profile: ParentOnboardingProfile;
  isSaving: boolean;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface SaveProfileRequest {
  parentId?: string;
  fullName: string;
  preferredName: string;
  preferredLanguage: string;
  timezone: string;
}

export interface SaveCareSituationRequest {
  parentId?: string;
  careSituation: CareSituationType;
}

export interface SaveCarePreferencesRequest {
  parentId?: string;
  careNeeds: CareNeedType[];
}

export interface InviteCareMemberRequest {
  parentId?: string;
  invite: CareMemberInvite;
}

export interface OnboardingResponse {
  success: boolean;
  message?: string;
  errorCode?: string;
}

export interface OnboardingServiceContract {
  saveProfile: (req: SaveProfileRequest) => Promise<OnboardingResponse>;
  saveCareSituation: (req: SaveCareSituationRequest) => Promise<OnboardingResponse>;
  saveCarePreferences: (req: SaveCarePreferencesRequest) => Promise<OnboardingResponse>;
  inviteCareMember: (req: InviteCareMemberRequest) => Promise<OnboardingResponse>;
  completeOnboarding: (parentId: string) => Promise<OnboardingResponse>;
}
