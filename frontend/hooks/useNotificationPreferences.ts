import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/authStore';

type NotificationPreferences = {
  pushEnabled: boolean;
  emailEnabled: boolean;
};

const STORAGE_KEY = '@ghost/notification-preferences';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
};

let preferences = DEFAULT_PREFERENCES;
let hydrated = false;
let syncingWithBackend = false;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function normalizePreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== 'object') {
    return DEFAULT_PREFERENCES;
  }

  const candidate = value as Partial<NotificationPreferences>;
  return {
    pushEnabled:
      typeof candidate.pushEnabled === 'boolean'
        ? candidate.pushEnabled
        : DEFAULT_PREFERENCES.pushEnabled,
    emailEnabled:
      typeof candidate.emailEnabled === 'boolean'
        ? candidate.emailEnabled
        : DEFAULT_PREFERENCES.emailEnabled,
  };
}

async function loadFromBackend(): Promise<NotificationPreferences> {
  const user = useAuthStore.getState().user;
  if (!user) {
    return DEFAULT_PREFERENCES;
  }

  if (user.pushNotificationsEnabled !== undefined) {
    return {
      pushEnabled: user.pushNotificationsEnabled,
      emailEnabled: user.emailNotificationsEnabled,
    };
  }

  return DEFAULT_PREFERENCES;
}

async function hydratePreferences() {
  if (hydrated) {
    return;
  }
  hydrated = true;

  try {
    const user = useAuthStore.getState().user;
    if (user?.pushNotificationsEnabled !== undefined) {
      preferences = {
        pushEnabled: user.pushNotificationsEnabled,
        emailEnabled: user.emailNotificationsEnabled,
      };
      emitChange();
      return;
    }

    const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (storedValue) {
      preferences = normalizePreferences(JSON.parse(storedValue));
      emitChange();
    }
  } catch {
    preferences = DEFAULT_PREFERENCES;
    emitChange();
  }
}

async function setPreferences(nextPreferences: NotificationPreferences) {
  const previousPreferences = preferences;
  preferences = nextPreferences;
  emitChange();

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
  } catch {
    // fallback to local storage only
  }

  if (!syncingWithBackend) {
    syncingWithBackend = true;
    try {
      await authService.saveNotificationPreferences(
        nextPreferences.pushEnabled,
        nextPreferences.emailEnabled
      );

      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().updateUser({
          ...currentUser,
          pushNotificationsEnabled: nextPreferences.pushEnabled,
          emailNotificationsEnabled: nextPreferences.emailEnabled,
        });
      }
    } catch {
      preferences = previousPreferences;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(previousPreferences));
      emitChange();
    } finally {
      syncingWithBackend = false;
    }
  }
}

function subscribe(listener: () => void) {
  hydratePreferences();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  hydratePreferences();
  return preferences;
}

export function useNotificationPreferences() {
  const currentPreferences = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...currentPreferences,
    setPushEnabled: (pushEnabled: boolean) => {
      setPreferences({ ...preferences, pushEnabled });
    },
    setEmailEnabled: (emailEnabled: boolean) => {
      setPreferences({ ...preferences, emailEnabled });
    },
  };
}
