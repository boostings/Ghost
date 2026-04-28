jest.mock('./api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from './api';
import { authService } from './authService';

const apiMock = api as jest.Mocked<typeof api>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers, resends verification, logs in, and deletes accounts through auth endpoints', async () => {
    apiMock.post
      .mockResolvedValueOnce({ data: undefined })
      .mockResolvedValueOnce({ data: undefined })
      .mockResolvedValueOnce({
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: {
            id: 'u-1',
            email: 'student@ilstu.edu',
            firstName: 'Taylor',
            lastName: 'Student',
            role: 'STUDENT',
            karmaScore: 0,
            emailVerified: true,
            createdAt: '2026-03-25T12:00:00.000Z',
          },
        },
      });
    apiMock.delete.mockResolvedValue({ data: undefined });

    await authService.register({
      email: 'student@ilstu.edu',
      firstName: 'Taylor',
      lastName: 'Student',
      password: 'Passw0rd',
    });
    await authService.resendVerificationCode('student@ilstu.edu');
    const authResult = await authService.login({
      email: 'student@ilstu.edu',
      password: 'Passw0rd',
    });
    await authService.deleteAccount();

    expect(authResult.accessToken).toBe('access-token');
    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/auth/register', {
      email: 'student@ilstu.edu',
      firstName: 'Taylor',
      lastName: 'Student',
      password: 'Passw0rd',
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(2, '/auth/resend-verification', {
      email: 'student@ilstu.edu',
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(3, '/auth/login', {
      email: 'student@ilstu.edu',
      password: 'Passw0rd',
    });
    expect(apiMock.delete).toHaveBeenCalledWith('/auth/account');
  });

  it('verifies email and loads the authenticated user profile', async () => {
    apiMock.post.mockResolvedValue({
      data: {
        accessToken: 'verified-access',
        refreshToken: 'verified-refresh',
        user: {
          id: 'u-1',
          email: 'student@ilstu.edu',
          firstName: 'Taylor',
          lastName: 'Student',
          role: 'STUDENT',
          karmaScore: 0,
          emailVerified: true,
          createdAt: '2026-03-25T12:00:00.000Z',
        },
      },
    });
    apiMock.get.mockResolvedValue({
      data: {
        id: 'u-1',
        email: 'student@ilstu.edu',
        firstName: 'Taylor',
        lastName: 'Student',
        role: 'STUDENT',
        karmaScore: 12,
        emailVerified: true,
        createdAt: '2026-03-25T12:00:00.000Z',
      },
    });

    const verified = await authService.verifyEmail({
      email: 'student@ilstu.edu',
      code: '123456',
    });
    const me = await authService.getMe();

    expect(verified.user.emailVerified).toBe(true);
    expect(me.karmaScore).toBe(12);
    expect(apiMock.post).toHaveBeenCalledWith('/auth/verify-email', {
      email: 'student@ilstu.edu',
      code: '123456',
    });
    expect(apiMock.get).toHaveBeenCalledWith('/users/me');
  });

  it('updates the current user profile through the users endpoint', async () => {
    const response = {
      data: {
        id: 'u-1',
        email: 'student@ilstu.edu',
        firstName: 'Taylor',
        lastName: 'Student',
        role: 'STUDENT',
        karmaScore: 0,
        emailVerified: true,
        createdAt: '2026-03-25T12:00:00.000Z',
      },
    };
    apiMock.put.mockResolvedValue(response);

    const result = await authService.updateProfile({
      firstName: 'Taylor',
      settingsJson: '{"theme":"light"}',
    });

    expect(result).toEqual(response.data);
    expect(apiMock.put).toHaveBeenCalledWith('/users/me', {
      firstName: 'Taylor',
      settingsJson: '{"theme":"light"}',
    });
  });

  it('refreshes tokens through the auth refresh endpoint', async () => {
    const response = {
      data: {
        accessToken: 'next-access',
        refreshToken: 'next-refresh',
        user: {
          id: 'u-1',
          email: 'student@ilstu.edu',
          firstName: 'Taylor',
          lastName: 'Student',
          role: 'STUDENT',
          karmaScore: 0,
          emailVerified: true,
          createdAt: '2026-03-25T12:00:00.000Z',
        },
      },
    };
    apiMock.post.mockResolvedValue(response);

    const result = await authService.refreshToken('refresh-token');

    expect(result).toEqual(response.data);
    expect(apiMock.post).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'refresh-token',
    });
  });

  it('updates the Expo push token through the users endpoint', async () => {
    apiMock.put.mockResolvedValue({ data: undefined });

    await authService.updatePushToken('ExponentPushToken[abc]');

    expect(apiMock.put).toHaveBeenCalledWith('/users/me/push-token', {
      token: 'ExponentPushToken[abc]',
    });
  });

  it('clears the Expo push token through the users endpoint', async () => {
    apiMock.delete.mockResolvedValue({ data: undefined });

    await authService.clearPushToken();

    expect(apiMock.delete).toHaveBeenCalledWith('/users/me/push-token');
  });
});
