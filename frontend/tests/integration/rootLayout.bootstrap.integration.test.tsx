import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';

const mockRouterReplace = jest.fn();
const mockHasAnyWhiteboard = jest.fn();

const mockAuthStoreState = {
  isAuthenticated: true,
  accessToken: 'access-token',
  isLoading: false,
};

const mockColors = {
  background: '#111111',
  primary: '#7c3aed',
  text: '#ffffff',
  textMuted: '#999999',
  cardBg: 'rgba(255,255,255,0.15)',
  surfaceBorder: 'rgba(255,255,255,0.3)',
  error: '#ef4444',
};

jest.mock('expo-router', () => {
  const ReactModule = require('react');

  const StackComponent = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement(ReactModule.Fragment, null, children);

  StackComponent.Screen = () => null;

  return {
    Stack: StackComponent,
    useRootNavigationState: () => ({ key: 'root' }),
    useRouter: () => ({
      replace: mockRouterReplace,
    }),
    useSegments: () => ['(auth)', 'login'],
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');

  return {
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
  };
});

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('../../constants/colors', () => ({
  useThemeColors: () => mockColors,
}));

jest.mock('../../components', () => {
  const ReactModule = require('react');

  return {
    ErrorBoundary: ({ children }: { children?: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
    NetworkStatusBanner: () => null,
  };
});

jest.mock('../../hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('../../hooks/useInviteLinks', () => ({
  useInviteLinks: jest.fn(),
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (state: typeof mockAuthStoreState) => unknown) =>
    selector(mockAuthStoreState),
}));

jest.mock('../../services/whiteboardService', () => ({
  whiteboardService: {
    hasAnyWhiteboard: () => mockHasAnyWhiteboard(),
  },
}));

import RootLayout from '../../app/_layout';

describe('RootLayout bootstrap integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks whiteboard membership only once during auth bootstrap', async () => {
    mockHasAnyWhiteboard.mockResolvedValue(true);

    render(<RootLayout />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockHasAnyWhiteboard).toHaveBeenCalledTimes(1);
    });
  });
});
