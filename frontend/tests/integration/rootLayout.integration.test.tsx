import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockHasAnyWhiteboard = jest.fn();

let mockAuthState = {
  isAuthenticated: false,
  accessToken: null as string | null,
  isLoading: false,
};

let mockSegments: string[] = [];

jest.mock('expo-router', () => {
  const StackComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  StackComponent.Screen = () => null;

  return {
    Stack: StackComponent,
    useRouter: () => ({ replace: mockReplace }),
    useRootNavigationState: () => ({ key: 'root-navigation' }),
    useSegments: () => mockSegments,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (state: typeof mockAuthState) => unknown) => selector(mockAuthState),
}));

jest.mock('../../constants/colors', () => ({
  useThemeColors: () => ({
    background: '#111111',
    primary: '#ff3366',
  }),
}));

jest.mock('../../components', () => ({
  ErrorBoundary: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  NetworkStatusBanner: () => null,
}));

jest.mock('../../hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('../../hooks/useInviteLinks', () => ({
  useInviteLinks: jest.fn(),
}));

jest.mock('../../services/whiteboardService', () => ({
  whiteboardService: {
    hasAnyWhiteboard: (...args: unknown[]) => mockHasAnyWhiteboard(...args),
  },
}));

import RootLayout from '../../app/_layout';

async function flushNavigationEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });

  await act(async () => {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  });
}

describe('RootLayout integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockAuthState = {
      isAuthenticated: false,
      accessToken: null,
      isLoading: false,
    };
    mockSegments = [];
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('redirects authenticated entry launches without memberships to onboarding after the membership service resolves', async () => {
    mockAuthState = {
      isAuthenticated: true,
      accessToken: 'access-token',
      isLoading: false,
    };
    mockHasAnyWhiteboard.mockResolvedValue(false);

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockHasAnyWhiteboard).toHaveBeenCalledTimes(1);
    });

    await flushNavigationEffects();

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/onboarding');
  });

  it('redirects authenticated auth-group launches with memberships to the home tab', async () => {
    mockAuthState = {
      isAuthenticated: true,
      accessToken: 'access-token',
      isLoading: false,
    };
    mockSegments = ['(auth)', 'login'];
    mockHasAnyWhiteboard.mockResolvedValue(true);

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockHasAnyWhiteboard).toHaveBeenCalledTimes(1);
    });

    await flushNavigationEffects();

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
  });
});
