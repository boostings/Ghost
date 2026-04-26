import api from './api';
import type {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  VerifyPasswordResetCodeRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
  UserResponse,
  UpdateUserRequest,
  PasswordResetStartResponse,
} from '../types';

/**
 * Authentication service - handles registration, login, email verification,
 * token refresh, and account deletion.
 */
export const authService = {
  /**
   * Register a new user account.
   * POST /auth/register
   */
  register: async (data: RegisterRequest): Promise<void> => {
    await api.post('/auth/register', data);
  },

  /**
   * Verify email address with a 6-digit code.
   * POST /auth/verify-email
   */
  verifyEmail: async (data: VerifyEmailRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/verify-email', data);
    return response.data;
  },

  /**
   * Resend a verification email code.
   * POST /auth/resend-verification
   */
  resendVerificationCode: async (email: string): Promise<void> => {
    await api.post('/auth/resend-verification', { email });
  },

  /**
   * Generate a password reset code for a user.
   * POST /auth/forgot-password
   */
  forgotPassword: async (email: string): Promise<PasswordResetStartResponse> => {
    const response = await api.post<PasswordResetStartResponse | undefined>(
      '/auth/forgot-password',
      {
        email,
      }
    );
    return response.data ?? { nextStep: 'RESET_PASSWORD' };
  },

  /**
   * Verify a password reset code before allowing password change.
   * POST /auth/verify-password-reset
   */
  verifyPasswordResetCode: async (data: VerifyPasswordResetCodeRequest): Promise<void> => {
    await api.post('/auth/verify-password-reset', data);
  },

  /**
   * Reset the user's password and return a fresh session.
   * POST /auth/reset-password
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/reset-password', data);
    return response.data;
  },

  /**
   * Log in with email and password.
   * POST /auth/login
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Refresh an expired access token using the refresh token.
   * POST /auth/refresh
   */
  refreshToken: async (token: string): Promise<AuthResponse> => {
    const data: RefreshTokenRequest = { refreshToken: token };
    const response = await api.post<AuthResponse>('/auth/refresh', data);
    return response.data;
  },

  /**
   * Delete the currently authenticated user's account.
   * DELETE /auth/account
   */
  deleteAccount: async (): Promise<void> => {
    await api.delete('/auth/account');
  },

  /**
   * Get the current authenticated user's profile.
   * GET /users/me
   */
  getMe: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>('/users/me');
    return response.data;
  },

  /**
   * Update the current user's profile.
   * PUT /users/me
   */
  updateProfile: async (data: UpdateUserRequest): Promise<UserResponse> => {
    const response = await api.put<UserResponse>('/users/me', data);
    return response.data;
  },

  /**
   * Update the Expo push notification token for the current user.
   * PUT /users/me/push-token
   */
  updatePushToken: async (expoPushToken: string): Promise<void> => {
    await api.put('/users/me/push-token', { token: expoPushToken });
  },
};
