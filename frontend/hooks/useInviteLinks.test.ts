import { Alert, Linking } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '../stores/authStore';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { whiteboardService } from '../services/whiteboardService';
import { useInviteLinks } from './useInviteLinks';
import type { WhiteboardResponse } from '../types';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock('../services/whiteboardService', () => ({
  __esModule: true,
  whiteboardService: {
    joinByInviteCode: jest.fn(),
    list: jest.fn(),
  },
}));

jest.mock('./useApi', () => ({
  extractErrorMessage: () => 'Join failed',
}));

const mockWhiteboardService = whiteboardService as jest.Mocked<typeof whiteboardService>;

function makeWhiteboard(overrides: Partial<WhiteboardResponse> = {}): WhiteboardResponse {
  return {
    id: overrides.id ?? 'wb-1',
    courseCode: overrides.courseCode ?? 'IT326',
    courseName: overrides.courseName ?? 'Software Engineering',
    section: overrides.section ?? '001',
    semester: overrides.semester ?? 'Fall 2026',
    ownerId: overrides.ownerId ?? 'faculty-1',
    ownerName: overrides.ownerName ?? 'Faculty User',
    inviteCode: overrides.inviteCode ?? 'JOINME',
    isDemo: overrides.isDemo ?? false,
    memberCount: overrides.memberCount ?? 2,
    createdAt: overrides.createdAt ?? '2026-04-28T00:00:00.000Z',
    myRole: overrides.myRole ?? 'STUDENT',
  };
}

describe('useInviteLinks', () => {
  let urlListener: ((event: { url: string }) => void) | null = null;
  let initialUrl: string | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    initialUrl = null;
    urlListener = null;
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    jest.spyOn(Linking, 'getInitialURL').mockImplementation(() => Promise.resolve(initialUrl));
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_event, listener) => {
      urlListener = listener as (event: { url: string }) => void;
      return { remove: jest.fn() } as never;
    });
    useWhiteboardStore.getState().reset();
    useAuthStore.getState().logout();
    mockWhiteboardService.joinByInviteCode.mockResolvedValue(undefined);
    mockWhiteboardService.list.mockResolvedValue({
      content: [makeWhiteboard()],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('joins a class from an initial native camera QR deep link when authenticated', async () => {
    initialUrl = 'ghost://join/joinme';
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
        pushNotificationsEnabled: true,
        emailNotificationsEnabled: true,
        anonymousMode: false,
      },
      'access-token',
      'refresh-token'
    );

    renderHook(() => useInviteLinks());

    await waitFor(() => {
      expect(mockWhiteboardService.joinByInviteCode).toHaveBeenCalledWith('JOINME');
    });

    expect(mockWhiteboardService.list).toHaveBeenCalledWith(0, 20);
    expect(useWhiteboardStore.getState().whiteboards).toHaveLength(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
  });

  it('alerts and allows retry when the join request fails', async () => {
    initialUrl = 'ghost://join/joinme';
    mockWhiteboardService.joinByInviteCode.mockRejectedValueOnce(new Error('boom'));
    const alertSpy = jest.spyOn(Alert, 'alert');
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
        pushNotificationsEnabled: true,
        emailNotificationsEnabled: true,
        anonymousMode: false,
      },
      'access-token',
      'refresh-token'
    );

    renderHook(() => useInviteLinks());

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Join Failed', 'Join failed');
    });

    expect(mockWhiteboardService.list).not.toHaveBeenCalled();

    mockWhiteboardService.joinByInviteCode.mockResolvedValueOnce(undefined);

    await act(async () => {
      urlListener?.({ url: 'ghost://join/joinme' });
    });

    await waitFor(() => {
      expect(mockWhiteboardService.joinByInviteCode).toHaveBeenCalledTimes(2);
    });
    expect(mockWhiteboardService.list).toHaveBeenCalledWith(0, 20);
  });

  it('holds a scanned invite link until the user is authenticated', async () => {
    const { rerender } = renderHook(() => useInviteLinks());

    await act(async () => {
      urlListener?.({ url: 'https://ghost.app/join/joinme' });
    });

    expect(mockWhiteboardService.joinByInviteCode).not.toHaveBeenCalled();

    await act(async () => {
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
        pushNotificationsEnabled: true,
        emailNotificationsEnabled: true,
        anonymousMode: false,
      },
      'access-token',
      'refresh-token'
    );
      rerender({});
    });

    await waitFor(() => {
      expect(mockWhiteboardService.joinByInviteCode).toHaveBeenCalledWith('JOINME');
    });
  });
});
