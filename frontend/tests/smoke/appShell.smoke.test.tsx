import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { WhiteboardResponse } from '../../types';

const mockRouterPush = jest.fn();
const mockSetWhiteboards = jest.fn();
const mockSetLoading = jest.fn();
const mockRequestCameraPermission = jest.fn();
const mockWhiteboardList = jest.fn();

const mockAuthStoreState = {
  user: {
    id: 'user-1',
    email: 'student@ilstu.edu',
    firstName: 'Taylor',
    lastName: 'Student',
    role: 'STUDENT' as const,
    karmaScore: 0,
    emailVerified: true,
    createdAt: '2026-03-25T12:00:00.000Z',
  },
  isAuthenticated: true,
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  isLoading: false,
  setAuth: jest.fn(),
};

const mockWhiteboardStoreState = {
  whiteboards: [] as WhiteboardResponse[],
  currentWhiteboard: null,
  isLoading: false,
  setWhiteboards: mockSetWhiteboards,
  setCurrentWhiteboard: jest.fn(),
  addWhiteboard: jest.fn(),
  removeWhiteboard: jest.fn(),
  updateWhiteboard: jest.fn(),
  setLoading: mockSetLoading,
  reset: jest.fn(),
};

jest.mock('expo-router', () => {
  const React = require('react');

  return {
    useLocalSearchParams: () => ({}),
    useRouter: () => ({
      push: mockRouterPush,
    }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    LinearGradient: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    CameraView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children),
    useCameraPermissions: () => [
      { granted: true },
      mockRequestCameraPermission,
    ] as const,
  };
});

jest.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (state: typeof mockAuthStoreState) => unknown) =>
    selector(mockAuthStoreState),
}));

jest.mock('../../stores/whiteboardStore', () => ({
  useWhiteboardStore: (selector: (state: typeof mockWhiteboardStoreState) => unknown) =>
    selector(mockWhiteboardStoreState),
}));

jest.mock('../../services/whiteboardService', () => ({
  whiteboardService: {
    list: (...args: unknown[]) => mockWhiteboardList(...args),
    joinByInviteCode: jest.fn(),
    hasAnyWhiteboard: jest.fn(),
  },
}));

import LoginScreen from '../../app/(auth)/login';
import HomeScreen from '../../app/(tabs)/home';

describe('smoke app shell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhiteboardStoreState.whiteboards = [];
    mockWhiteboardStoreState.isLoading = false;
    mockWhiteboardList.mockResolvedValue({
      content: [],
      totalPages: 0,
    });
  });

  it('renders the login screen and shows required-field validation on submit', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);

    fireEvent(getByPlaceholderText('Enter your password'), 'submitEditing');

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(await findByText('Email is required')).toBeTruthy();
    expect(await findByText('Password is required')).toBeTruthy();
  });

  it('renders the home empty state and requests the first page of whiteboards', async () => {
    const screen = render(<HomeScreen />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockWhiteboardList).toHaveBeenCalledWith(0, 20);
    });

    expect(screen.getByText('Your Classes')).toBeTruthy();
    expect(screen.getByText('No Classes Yet')).toBeTruthy();
    expect(screen.getByText('Join a Class')).toBeTruthy();
  });
});
