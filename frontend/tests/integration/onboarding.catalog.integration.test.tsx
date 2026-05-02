import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../../app/(auth)/onboarding';
import { whiteboardService } from '../../services/whiteboardService';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseAuthStore = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    CameraView: (props: Record<string, unknown>) => React.createElement(View, props),
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});

jest.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => mockUseAuthStore(selector),
}));

jest.mock('../../services/whiteboardService', () => ({
  __esModule: true,
  whiteboardService: {
    getWhiteboards: jest.fn(),
    getDiscoverableWhiteboards: jest.fn(),
    joinByInviteCode: jest.fn(),
    requestToJoin: jest.fn(),
  },
}));

const mockWhiteboardService = whiteboardService as jest.Mocked<typeof whiteboardService>;

const emptyPage = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

describe('Onboarding catalog access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({ user: { id: 'faculty-1', role: 'FACULTY' } })
    );
    mockWhiteboardService.getWhiteboards.mockResolvedValue(emptyPage);
    mockWhiteboardService.getDiscoverableWhiteboards.mockResolvedValue(emptyPage);
  });

  it('lets first-time faculty open the class catalog before joining a whiteboard', async () => {
    const { getByText } = render(<OnboardingScreen />);

    await waitFor(() => expect(mockWhiteboardService.getWhiteboards).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText('Create From Class Catalog'));

    expect(mockPush).toHaveBeenCalledWith('/whiteboard/catalog');
  });
});
