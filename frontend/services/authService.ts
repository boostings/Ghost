import api from './api';
import type { AuthResponse, User } from '../types';

export const authService = {
  register: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<{ message: string }> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  verifyEmail: async (data: {
    email: string;
    code: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/verify-email', data);
    return response.data;
  },

  login: async (data: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  deleteAccount: async (): Promise<void> => {
    await api.delete('/auth/account');
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('/users/me', data);
    return response.data;
  },

  updatePushToken: async (token: string): Promise<void> => {
    await api.put('/users/me/push-token', { expoPushToken: token });
  },
};
