import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import type { LoginRequest, RegisterRequest, VerifyEmailRequest, UserResponse } from '../types';

/**
 * Convenience hook that wraps the authStore and provides authentication actions.
 *
 * - Exposes computed properties: isLoggedIn, user, isLoading
 * - Provides login(), register(), verifyEmail(), logout(), deleteAccount()
 * - On mount, checks if persisted tokens are still valid by rehydrating from the store
 */
export function useAuth() {
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    setAuth,
    updateUser,
    logout: storeLogout,
    setLoading,
  } = useAuthStore();

  /**
   * On mount, verify the persisted auth state.
   * If we have tokens but no user, attempt to fetch the user profile.
   * If that fails, clear the stored auth state.
   */
  useEffect(() => {
    const verifyAuth = async () => {
      if (accessToken && !user) {
        try {
          const me = await authService.getMe();
          updateUser(me);
        } catch {
          storeLogout();
        }
      }
      setLoading(false);
    };

    verifyAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Log in with email and password.
   * Stores the user, access token, and refresh token in the auth store.
   */
  const login = useCallback(
    async (data: LoginRequest): Promise<UserResponse> => {
      const response = await authService.login(data);
      setAuth(response.user, response.accessToken, response.refreshToken);
      return response.user;
    },
    [setAuth]
  );

  /**
   * Register a new account.
   * After registration, the user still needs to verify their email.
   */
  const register = useCallback(async (data: RegisterRequest): Promise<void> => {
    await authService.register(data);
  }, []);

  /**
   * Verify email with a 6-digit code.
   * On success, the user can proceed to login.
   */
  const verifyEmail = useCallback(async (data: VerifyEmailRequest): Promise<void> => {
    await authService.verifyEmail(data);
  }, []);

  /**
   * Log out - clears all auth state and stored tokens.
   */
  const logout = useCallback(() => {
    storeLogout();
  }, [storeLogout]);

  /**
   * Delete the current user's account, then log out.
   */
  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount();
    storeLogout();
  }, [storeLogout]);

  /**
   * Refresh the current user's profile data from the server.
   */
  const refreshUser = useCallback(async () => {
    try {
      const me = await authService.getMe();
      updateUser(me);
      return me;
    } catch {
      return null;
    }
  }, [updateUser]);

  return {
    // State
    user,
    accessToken,
    refreshToken,
    isLoggedIn: isAuthenticated && !!accessToken,
    isLoading,
    isFaculty: user?.role === 'FACULTY',

    // Actions
    login,
    register,
    verifyEmail,
    logout,
    deleteAccount,
    refreshUser,
  };
}
