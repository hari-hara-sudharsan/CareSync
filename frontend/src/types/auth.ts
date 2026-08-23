export type AuthStep = 'PHONE_ENTRY' | 'OTP_VERIFICATION' | 'SUCCESS';

export type AuthErrorCode =
  | 'INVALID_PHONE'
  | 'INCORRECT_OTP'
  | 'EXPIRED_OTP'
  | 'TOO_MANY_ATTEMPTS'
  | 'RESEND_COOLDOWN'
  | 'NETWORK_UNAVAILABLE'
  | 'SERVER_UNAVAILABLE'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_LOCKED';

export interface AuthUser {
  id: string;
  phone: string;
  full_name: string;
  email?: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
}

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
  user?: AuthUser | null;
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
  errorMessage?: string;
  message?: string;
  token?: string;
  user?: {
    id?: string;
    role?: string;
    full_name?: string;
    phone?: string;
  };
}

export interface AuthServiceContract {
  sendOtp: (req: SendOtpRequest) => Promise<AuthResponse>;
  verifyOtp: (req: VerifyOtpRequest) => Promise<AuthResponse>;
  resendOtp: (req: SendOtpRequest) => Promise<AuthResponse>;
  getMe: () => Promise<AuthUser | null>;
  logout: () => void;
  getToken: () => string | null;
  setToken: (token: string, remember?: boolean) => void;
  clearToken: () => void;
}
