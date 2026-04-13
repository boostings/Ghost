import React from 'react';
import { Alert } from 'react-native';
import { AxiosError, AxiosHeaders } from 'axios';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockSetAuth = jest.fn();
const mockLogin = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    push: mockPush,
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
    login: (...args: unknown[]) => mockLogin(...args),
  },
}));

import LoginScreen from '../../app/(auth)/login';

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects unverified users to the verification screen after login attempt', async () => {
    const unverifiedLoginError = new AxiosError(
      'Request failed with status code 400',
      'ERR_BAD_REQUEST',
      { headers: new AxiosHeaders() },
      undefined,
      {
        data: {
          message: 'Email is not verified. We sent a new verification code.',
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    mockLogin.mockRejectedValue(unverifiedLoginError);

    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('you@ilstu.edu'), 'Student@ILSTU.edu');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'password1');
    fireEvent.press(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'student@ilstu.edu',
        password: 'password1',
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(auth)/verify-email',
        params: { email: 'student@ilstu.edu', source: 'login' },
      });
    });

    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Verify Email',
      'We sent a new verification code to your email. Enter it to finish signing in.'
    );
  });
});
