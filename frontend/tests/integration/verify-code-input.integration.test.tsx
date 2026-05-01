import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockSetAuth = jest.fn();
const mockVerifyEmail = jest.fn();
const mockVerifyPasswordResetCode = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ email: 'student@ilstu.edu' }),
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
}));

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

jest.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (state: { setAuth: typeof mockSetAuth }) => unknown) =>
    selector({ setAuth: mockSetAuth }),
}));

jest.mock('../../services/authService', () => ({
  authService: {
    verifyEmail: (...args: unknown[]) => mockVerifyEmail(...args),
    verifyPasswordResetCode: (...args: unknown[]) => mockVerifyPasswordResetCode(...args),
    resendVerificationCode: jest.fn(),
    forgotPassword: jest.fn(),
  },
}));

import VerifyEmailScreen from '../../app/(auth)/verify-email';
import VerifyResetCodeScreen from '../../app/(auth)/verify-reset-code';

describe('verification code entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  it('accepts a full pasted email verification code and submits it', async () => {
    mockVerifyEmail.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1', email: 'student@ilstu.edu' },
    });

    const screen = render(<VerifyEmailScreen />);

    fireEvent.changeText(screen.getByLabelText('Verification code'), '797600');
    fireEvent.press(screen.getByText('Verify Email'));

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith({
        email: 'student@ilstu.edu',
        code: '797600',
      });
    });
    expect(mockSetAuth).toHaveBeenCalledWith(
      { id: 'user-1', email: 'student@ilstu.edu' },
      'access-token',
      'refresh-token'
    );
  });

  it('strips non-digits from a pasted reset code and submits the six digits', async () => {
    mockVerifyPasswordResetCode.mockResolvedValue(undefined);

    const screen = render(<VerifyResetCodeScreen />);

    fireEvent.changeText(screen.getByLabelText('Reset code'), '12a-34 56');
    fireEvent.press(screen.getByText('Verify Code'));

    await waitFor(() => {
      expect(mockVerifyPasswordResetCode).toHaveBeenCalledWith({
        email: 'student@ilstu.edu',
        code: '123456',
      });
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(auth)/new-password',
      params: { email: 'student@ilstu.edu', code: '123456' },
    });
  });
});
