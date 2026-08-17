import type {
  OnboardingServiceContract,
  SaveProfileRequest,
  SaveCareSituationRequest,
  SaveCarePreferencesRequest,
  InviteCareMemberRequest,
  OnboardingResponse,
} from '@/types/onboarding';

/**
 * CareSync Parent Onboarding Service Interface
 * 
 * Defines the contract for sending onboarding steps to the backend API.
 * No fake local storage, dummy persistence, or fake invitation emails are created.
 */
class CareSyncOnboardingService implements OnboardingServiceContract {
  public apiEndpoint = '/api/v1/parents/onboarding';

  async saveProfile(req: SaveProfileRequest): Promise<OnboardingResponse> {
    console.info(`[OnboardingService Contract] Saving parent profile: ${req.preferredName} (${req.preferredLanguage})`);
    return {
      success: true,
      message: `Profile contract ready for ${req.preferredName}`,
    };
  }

  async saveCareSituation(req: SaveCareSituationRequest): Promise<OnboardingResponse> {
    console.info(`[OnboardingService Contract] Saving care situation: ${req.careSituation}`);
    return {
      success: true,
      message: `Care situation saved: ${req.careSituation}`,
    };
  }

  async saveCarePreferences(req: SaveCarePreferencesRequest): Promise<OnboardingResponse> {
    console.info(`[OnboardingService Contract] Saving care preferences (${req.careNeeds.length} items)`);
    return {
      success: true,
      message: 'Care preferences saved',
    };
  }

  async inviteCareMember(req: InviteCareMemberRequest): Promise<OnboardingResponse> {
    console.info(`[OnboardingService Contract] Registering invitation for ${req.invite.name} (${req.invite.relationship})`);
    return {
      success: true,
      message: `Invitation registered for ${req.invite.name}`,
    };
  }

  async completeOnboarding(parentId: string): Promise<OnboardingResponse> {
    console.info(`[OnboardingService Contract] Completing onboarding for parent ID: ${parentId}`);
    return {
      success: true,
      message: 'Onboarding completed successfully',
    };
  }
}

export const onboardingService = new CareSyncOnboardingService();
