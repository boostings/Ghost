import api from './api';
import type {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  RefreshTokenRequest,
  UserResponse,
  UpdateUserRequest,
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
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
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
    await api.put('/users/me/push-token', { expoPushToken });
  },
};
