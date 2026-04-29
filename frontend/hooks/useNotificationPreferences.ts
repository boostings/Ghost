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

function hydratePreferences() {
  if (hydrated) {
    return;
  }
  hydrated = true;

  const user = useAuthStore.getState().user;
  if (user?.pushNotificationsEnabled !== undefined) {
    preferences = {
      pushEnabled: user.pushNotificationsEnabled,
      emailEnabled: user.emailNotificationsEnabled,
    };
    emitChange();
    return;
  }

  AsyncStorage.getItem(STORAGE_KEY)
    .then((storedValue) => {
      if (storedValue) {
        preferences = normalizePreferences(JSON.parse(storedValue));
        emitChange();
      }
    })
    .catch(() => {
      preferences = DEFAULT_PREFERENCES;
      emitChange();
    });
}

function setPreferencesCore(nextPreferences: NotificationPreferences) {
  const previousPreferences = preferences;
  let localWriteFailed = false;

  preferences = nextPreferences;
  emitChange();

  try {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences)).catch(() => {});
  } catch {
    localWriteFailed = true;
  }

  if (!syncingWithBackend) {
    syncingWithBackend = true;
    authService.saveNotificationPreferences(
      nextPreferences.pushEnabled,
      nextPreferences.emailEnabled
    )
      .then(() => {
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.getState().updateUser({
            ...currentUser,
            pushNotificationsEnabled: nextPreferences.pushEnabled,
            emailNotificationsEnabled: nextPreferences.emailEnabled,
          });
        }
      })
      .catch(() => {
        if (!localWriteFailed) {
          preferences = previousPreferences;
          emitChange();
        }
      })
      .finally(() => {
        syncingWithBackend = false;
      });
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
      setPreferencesCore({ ...preferences, pushEnabled });
    },
    setEmailEnabled: (emailEnabled: boolean) => {
      setPreferencesCore({ ...preferences, emailEnabled });
    },
  };
}