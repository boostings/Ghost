import { create } from 'zustand';
import type { StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { UserResponse } from '../types';

const NOTIFICATION_PREFERENCES_STORAGE_KEY = '@ghost/notification-preferences';

// Use CommonJS middleware resolution to avoid importing zustand's ESM build on web.
const { persist, createJSONStorage } = require('zustand/middleware') as Pick<
  typeof import('zustand/middleware'),
  'persist' | 'createJSONStorage'
>;

const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch (error) {
      console.warn('[AuthStore] Failed to read secure storage', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.warn('[AuthStore] Failed to write secure storage', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.warn('[AuthStore] Failed to delete secure storage key', error);
    }
  },
};

const webStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return window.localStorage.getItem(name);
    } catch (error) {
      console.warn('[AuthStore] Failed to read web storage', error);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(name, value);
    } catch (error) {
      console.warn('[AuthStore] Failed to write web storage', error);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.removeItem(name);
    } catch (error) {
      console.warn('[AuthStore] Failed to delete web storage key', error);
    }
  },
};

const authStorage = Platform.OS === 'web' ? webStorage : secureStorage;

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setAuth: (user: UserResponse, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  updateUser: (user: UserResponse) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;
let setAuthStoreState: ((partial: Partial<AuthStore>) => void) | null = null;

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => {
      setAuthStoreState = (partial: Partial<AuthStore>) => set(partial);

      return {
        ...initialState,

        setAuth: (user: UserResponse, accessToken: string, refreshToken: string) => {
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        },

        setTokens: (accessToken: string, refreshToken?: string) => {
          set((state) => ({
            accessToken,
            refreshToken: refreshToken ?? state.refreshToken,
          }));
        },

        updateUser: (user: UserResponse) => {
          set({ user });
        },

        logout: () => {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          // Drop device-local preference cache so the next account that
          // signs in on this device starts from its own backend defaults
          // instead of inheriting the previous user's toggles.
          AsyncStorage.removeItem(NOTIFICATION_PREFERENCES_STORAGE_KEY).catch(() => {});
        },

        setLoading: (isLoading: boolean) => {
          set({ isLoading });
        },
      };
    },
    {
      name: 'ghost-auth-storage',
      storage: createJSONStorage(() => authStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.warn('[AuthStore] Failed to rehydrate auth state', error);
          }

          if (state) {
            state.setLoading(false);
            return;
          }

          setAuthStoreState?.({ isLoading: false });
        };
      },
    }
  )
);
