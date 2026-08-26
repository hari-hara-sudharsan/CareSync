import type { AuthServiceContract, SendOtpRequest, VerifyOtpRequest, AuthResponse, AuthUser } from '@/types/auth';
import { getApiBaseUrl } from './apiConfig';

/**
 * CareSync Unified Authentication & Session Service
 * 
 * Real OTP challenge verification, JWT token session management,
 * and authenticated user context resolution.
 * NEVER returns fake/offline authentication success when backend is unavailable.
 */
class CareSyncAuthService implements AuthServiceContract {
  public get baseUrl(): string {
    return getApiBaseUrl();
  }

  public getToken(): string | null {
    return localStorage.getItem('caresync_token') || sessionStorage.getItem('caresync_token');
  }

  public setToken(token: string, remember: boolean = true): void {
    if (remember) {
      localStorage.setItem('caresync_token', token);
    } else {
      sessionStorage.setItem('caresync_token', token);
    }
  }

  public clearToken(): void {
    localStorage.removeItem('caresync_token');
    sessionStorage.removeItem('caresync_token');
    localStorage.removeItem('caresync_user');
  }

  public logout(): void {
    this.clearToken();
    console.info('[AuthService] User session destroyed and token cleared.');
  }

  public getActiveParentId(): string {
    return localStorage.getItem('caresync_active_parent') || 'p-1';
  }

  public setActiveParentId(parentId: string): void {
    localStorage.setItem('caresync_active_parent', parentId);
  }

  public getUserFromStorage(): { id?: string; phone?: string; role?: string; full_name?: string; email?: string; is_verified?: boolean } | null {
    const raw = localStorage.getItem('caresync_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async sendOtp(req: SendOtpRequest): Promise<AuthResponse> {
    const fullPhone = `${req.countryCode}${req.phoneNumber}`;
    console.info(`[AuthService] Requesting OTP send for ${fullPhone}`);

    try {
      const res = await fetch(`${this.baseUrl}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message || `Verification code sent to ${fullPhone}`,
        };
      }

      const errorMessage = data.detail || 'Unable to send verification code. Please check phone number.';
      return {
        success: false,
        errorCode: res.status === 429 ? 'RESEND_COOLDOWN' : 'SERVER_UNAVAILABLE',
        errorMessage,
      };
    } catch (err) {
      console.error('[AuthService] Backend offline or network error during OTP request:', err);
      return {
        success: false,
        errorCode: 'NETWORK_UNAVAILABLE',
        errorMessage: 'Unable to connect to CareSync authentication service. Please check your internet connection.',
      };
    }
  }

  async verifyOtp(req: VerifyOtpRequest): Promise<AuthResponse> {
    const fullPhone = `${req.countryCode}${req.phoneNumber}`;
    console.info(`[AuthService] Verifying OTP for ${fullPhone}`);

    try {
      const res = await fetch(`${this.baseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, otp_code: req.otpCode }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.access_token) {
        this.setToken(data.access_token);
        const userObj = {
          id: data.user_id,
          role: data.role,
          phone: fullPhone,
        };
        localStorage.setItem('caresync_user', JSON.stringify(userObj));

        return {
          success: true,
          token: data.access_token,
          user: userObj,
          message: 'Authentication successful',
        };
      }

      const errorMessage = data.detail || 'Invalid or expired verification code.';
      return {
        success: false,
        errorCode: 'INCORRECT_OTP',
        errorMessage,
      };
    } catch (err) {
      console.error('[AuthService] Backend offline or network error during OTP verification:', err);
      return {
        success: false,
        errorCode: 'NETWORK_UNAVAILABLE',
        errorMessage: 'Unable to connect to CareSync authentication service. Verification failed.',
      };
    }
  }

  async resendOtp(req: SendOtpRequest): Promise<AuthResponse> {
    return this.sendOtp(req);
  }

  async getDevOtp(countryCode: string, phoneNumber: string): Promise<string | null> {
    if (import.meta.env.PROD) {
      return null;
    }
    const fullPhone = `${countryCode}${phoneNumber}`;
    try {
      const res = await fetch(`${this.baseUrl}/auth/dev-otp-sink?phone=${encodeURIComponent(fullPhone)}`);
      if (res.ok) {
        const data = await res.json();
        return data.dev_otp || null;
      }
    } catch (err) {
      console.warn('[AuthService] Could not fetch dev OTP:', err);
    }
    return null;
  }

  async getMe(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${this.baseUrl}/auth/me`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (res.ok) {
        const user: AuthUser = await res.json();
        localStorage.setItem('caresync_user', JSON.stringify(user));
        return user;
      } else {
        this.clearToken();
        return null;
      }
    } catch {
      console.warn('[AuthService] Unable to verify current authenticated user with backend.');
      return null;
    }
  }
}

export const authService = new CareSyncAuthService();
