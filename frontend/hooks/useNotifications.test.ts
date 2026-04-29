import { renderHook, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { useNotifications } from './useNotifications';

const mockPush = jest.fn();
const mockSubscribe = jest.fn();
const mockGetNativeNotificationsModule = jest.fn();
const mockRegisterForPushNotifications = jest.fn();
const mockGetLastNotificationResponseAsync = jest.fn();
const mockAddNotificationReceivedListener = jest.fn();
const mockAddNotificationResponseReceivedListener = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

jest.mock('./useWebSocket', () => ({
  useWebSocket: () => ({
    subscribe: mockSubscribe,
  }),
}));

jest.mock('./useNotificationPreferences', () => ({
  useNotificationPreferences: () => ({
    pushEnabled: true,
  }),
}));

jest.mock('../services/pushNotificationService', () => ({
  getNativeNotificationsModule: () => mockGetNativeNotificationsModule(),
  registerForPushNotifications: () => mockRegisterForPushNotifications(),
}));

jest.mock('../services/authService', () => ({
  __esModule: true,
  authService: {
    updatePushToken: jest.fn(),
    clearPushToken: jest.fn(),
  },
}));

jest.mock('../services/notificationService', () => ({
  __esModule: true,
  notificationService: {
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().logout();
    mockSubscribe.mockReturnValue({ unsubscribe: jest.fn() });
    mockRegisterForPushNotifications.mockResolvedValue('ExponentPushToken[test]');
    mockNotificationService.getUnreadCount.mockResolvedValue(0);
    mockNotificationService.markAsRead.mockResolvedValue(undefined);
    mockAuthService.updatePushToken.mockResolvedValue(undefined);
    mockGetLastNotificationResponseAsync.mockResolvedValue(null);
    mockAddNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
    mockAddNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
    mockGetNativeNotificationsModule.mockReturnValue({
      addNotificationReceivedListener: mockAddNotificationReceivedListener,
      addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
      getLastNotificationResponseAsync: mockGetLastNotificationResponseAsync,
    });
  });

  it('handles the push notification that launched the app before listeners were attached', async () => {
    mockGetLastNotificationResponseAsync.mockResolvedValue({
      notification: {
        request: {
          identifier: 'response-1',
          content: {
            data: {
              notificationId: 'n-1',
              referenceType: 'QUESTION',
              referenceId: 'q-1',
              whiteboardId: 'wb-1',
            },
          },
        },
      },
    });
    useAuthStore.getState().setAuth(
      {
        id: 'student-1',
        email: 'student@ilstu.edu',
        firstName: 'Student',
        lastName: 'User',
        role: 'STUDENT',
        karmaScore: 0,
        emailVerified: true,
        createdAt: '2026-04-28T00:00:00.000Z',
      },
      'access-token',
      'refresh-token'
    );

    renderHook(() => useNotifications());

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/question/[id]',
        params: {
          id: 'q-1',
          whiteboardId: 'wb-1',
        },
      });
    });
    expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('n-1');
    expect(mockAuthService.updatePushToken).toHaveBeenCalledWith('ExponentPushToken[test]');
  });
});
