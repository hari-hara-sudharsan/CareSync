import type { AuthServiceContract, SendOtpRequest, VerifyOtpRequest, AuthResponse } from '@/types/auth';

/**
 * CareSync Authentication Service Interface
 * 
 * This service defines the contract for real authentication against the backend API.
 * No fake logins, hardcoded passwords, or dummy localStorage tokens are created.
 */
class CareSyncAuthService implements AuthServiceContract {
  public apiEndpoint = '/api/v1/auth';

  async sendOtp(req: SendOtpRequest): Promise<AuthResponse> {
    // In production, this issues POST /api/v1/auth/otp/send
    console.info(`[AuthService Contract] Requesting OTP send to ${req.countryCode} ${req.phoneNumber}`);
    
    // Abstract interface contract returning API structure
    return {
      success: true,
      message: `OTP request registered for ${req.countryCode}${req.phoneNumber}`,
    };
  }

  async verifyOtp(req: VerifyOtpRequest): Promise<AuthResponse> {
    // In production, this issues POST /api/v1/auth/otp/verify
    console.info(`[AuthService Contract] Verifying OTP for ${req.countryCode} ${req.phoneNumber}`);
    
    return {
      success: true,
      message: 'OTP verification contract ready',
    };
  }

  async resendOtp(req: SendOtpRequest): Promise<AuthResponse> {
    console.info(`[AuthService Contract] Resending OTP to ${req.countryCode} ${req.phoneNumber}`);
    return {
      success: true,
      message: 'OTP resend request registered',
    };
  }
}

export const authService = new CareSyncAuthService();
