import React from 'react';
import { Alert } from 'react-native';
import { AxiosError, AxiosHeaders } from 'axios';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRegister = jest.fn();
const mockResendVerificationCode = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
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
    register: (...args: unknown[]) => mockRegister(...args),
    resendVerificationCode: (...args: unknown[]) => mockResendVerificationCode(...args),
  },
}));

import RegisterScreen from '../../app/(auth)/register';

describe('RegisterScreen timeout recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('continues to email verification when registration times out after the account was created', async () => {
    const timeoutError = new AxiosError(
      'timeout of 15000ms exceeded',
      'ECONNABORTED',
      { headers: new AxiosHeaders() }
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    mockRegister.mockRejectedValue(timeoutError);
    mockResendVerificationCode.mockResolvedValue(undefined);

    const screen = render(<RegisterScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('John'), 'Jimmy');
    fireEvent.changeText(screen.getByPlaceholderText('Doe'), 'Schade');
    fireEvent.changeText(screen.getByPlaceholderText('you@ilstu.edu'), 'JESCHAD@ILSTU.edu');
    fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'Jimmy4546*32   ');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter your password'), 'Jimmy4546*32');
    fireEvent.press(screen.getAllByText('Create Account').at(-1)!);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        firstName: 'Jimmy',
        lastName: 'Schade',
        email: 'jeschad@ilstu.edu',
        password: 'Jimmy4546*32',
      });
    });

    await waitFor(() => {
      expect(mockResendVerificationCode).toHaveBeenCalledWith('jeschad@ilstu.edu');
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(auth)/verify-email',
        params: { email: 'jeschad@ilstu.edu', source: 'register' },
      });
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Verify Email',
      'Your account was created. Enter the verification code we sent to finish signing in.'
    );
  });
});
