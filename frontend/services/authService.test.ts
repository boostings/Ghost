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
});
