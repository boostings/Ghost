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

export const authService = {
  register: async (data: RegisterRequest): Promise<void> => {
    await api.post('/auth/register', data);
  },

  verifyEmail: async (data: VerifyEmailRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/verify-email', data);
    return response.data;
  },

  resendVerificationCode: async (email: string): Promise<void> => {
    await api.post('/auth/resend-verification', { email });
  },

  forgotPassword: async (email: string): Promise<PasswordResetStartResponse> => {
    const response = await api.post<PasswordResetStartResponse | undefined>(
      '/auth/forgot-password',
      {
        email,
      }
    );
    return response.data ?? { nextStep: 'RESET_PASSWORD' };
  },

  verifyPasswordResetCode: async (data: VerifyPasswordResetCodeRequest): Promise<void> => {
    await api.post('/auth/verify-password-reset', data);
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/reset-password', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  refreshToken: async (token: string): Promise<AuthResponse> => {
    const data: RefreshTokenRequest = { refreshToken: token };
    const response = await api.post<AuthResponse>('/auth/refresh', data);
    return response.data;
  },

  deleteAccount: async (): Promise<void> => {
    await api.delete('/auth/account');
  },

  getMe: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>('/users/me');
    return response.data;
  },

  updateProfile: async (data: UpdateUserRequest): Promise<UserResponse> => {
    const response = await api.put<UserResponse>('/users/me', data);
    return response.data;
  },

  updatePushToken: async (expoPushToken: string): Promise<void> => {
    await api.put('/users/me/push-token', { token: expoPushToken });
  },

  clearPushToken: async (): Promise<void> => {
    await api.delete('/users/me/push-token');
  },

  saveNotificationPreferences: async (
    pushEnabled: boolean,
    emailEnabled: boolean
  ): Promise<UserResponse> => {
    const settingsJson = JSON.stringify({
      pushNotificationsEnabled: pushEnabled,
      emailNotificationsEnabled: emailEnabled,
    });
    const response = await api.put<UserResponse>('/users/me', { settingsJson });
    return response.data;
  },

  saveAnonymousMode: async (enabled: boolean): Promise<UserResponse> => {
    const response = await api.put<UserResponse>('/users/me', { anonymousMode: enabled });
    return response.data;
  },
};
