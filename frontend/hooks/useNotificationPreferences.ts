import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  AsyncStorage.getItem(STORAGE_KEY)
    .then((storedValue) => {
      if (!storedValue) {
        return;
      }

      preferences = normalizePreferences(JSON.parse(storedValue));
      emitChange();
    })
    .catch(() => {
      preferences = DEFAULT_PREFERENCES;
      emitChange();
    });
}

function setPreferences(nextPreferences: NotificationPreferences) {
  preferences = nextPreferences;
  emitChange();
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences)).catch(() => {});
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
