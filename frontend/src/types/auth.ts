export type AuthStep = 'PHONE_ENTRY' | 'OTP_VERIFICATION' | 'SUCCESS';

export type AuthErrorCode =
  | 'INVALID_PHONE'
  | 'INCORRECT_OTP'
  | 'EXPIRED_OTP'
  | 'TOO_MANY_ATTEMPTS'
  | 'NETWORK_UNAVAILABLE'
  | 'SERVER_UNAVAILABLE'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_LOCKED';

export interface AuthState {
  step: AuthStep;
  countryCode: string;
  phoneNumber: string;
  otpCode: string;
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  resendCountdown: number;
  canResend: boolean;
  errorCode: AuthErrorCode | null;
  errorMessage: string | null;
  attemptCount: number;
  maxAttempts: number;
}

export interface SendOtpRequest {
  countryCode: string;
  phoneNumber: string;
}

export interface VerifyOtpRequest {
  countryCode: string;
  phoneNumber: string;
  otpCode: string;
}

export interface AuthResponse {
  success: boolean;
  errorCode?: AuthErrorCode;
  message?: string;
  token?: string;
  expiresIn?: number;
}

export interface AuthServiceContract {
  sendOtp: (req: SendOtpRequest) => Promise<AuthResponse>;
  verifyOtp: (req: VerifyOtpRequest) => Promise<AuthResponse>;
  resendOtp: (req: SendOtpRequest) => Promise<AuthResponse>;
}
