import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
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
    useRouter: () => ({
      push: mockRouterPush,
    }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = callback();
        const duplicateCleanup = callback();

        return () => {
          if (typeof duplicateCleanup === 'function') {
            duplicateCleanup();
          }
          if (typeof cleanup === 'function') {
            cleanup();
          }
        };
      }, [callback]);
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
    useCameraPermissions: () =>
      [
        {
          granted: true,
        },
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
  },
}));

import HomeScreen from './home';

function createPendingPage() {
  return new Promise(() => undefined);
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhiteboardStoreState.whiteboards = [];
    mockWhiteboardStoreState.isLoading = false;
  });

  it('only requests the first page once when focus fires twice during startup', async () => {
    mockWhiteboardList.mockReturnValue(createPendingPage());

    render(<HomeScreen />);

    await waitFor(() => {
      expect(mockWhiteboardList).toHaveBeenCalledTimes(1);
    });

    expect(mockWhiteboardList).toHaveBeenCalledWith(0, 20);
  });
});
