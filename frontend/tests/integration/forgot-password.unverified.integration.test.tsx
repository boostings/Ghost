import React from 'react';
import { Alert } from 'react-native';
import { AxiosError, AxiosHeaders } from 'axios';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockForgotPassword = jest.fn();
const mockResendVerificationCode = jest.fn();

jest.mock('expo-router', () => ({
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

jest.mock('../../services/authService', () => ({
  authService: {
    forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
    resendVerificationCode: (...args: unknown[]) => mockResendVerificationCode(...args),
  },
}));

import ForgotPasswordScreen from '../../app/(auth)/forgot-password';

describe('ForgotPasswordScreen unverified email flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes unverified users to email verification after requesting a fresh code', async () => {
    const unverifiedError = new AxiosError(
      'Request failed with status code 400',
      'ERR_BAD_REQUEST',
      { headers: new AxiosHeaders() },
      undefined,
      {
        data: {
          message: 'Email is not verified. Please verify your email first.',
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    mockForgotPassword.mockRejectedValue(unverifiedError);
    mockResendVerificationCode.mockResolvedValue(undefined);

    const screen = render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('you@ilstu.edu'), 'Student@ILSTU.edu');
    fireEvent.press(screen.getByText('Send Reset Code'));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('student@ilstu.edu');
    });

    await waitFor(() => {
      expect(mockResendVerificationCode).toHaveBeenCalledWith('student@ilstu.edu');
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(auth)/verify-email',
        params: { email: 'student@ilstu.edu', source: 'forgot-password' },
      });
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Verify Email',
      'We sent a new verification code to your email. Enter it before resetting your password.'
    );
  });
});
