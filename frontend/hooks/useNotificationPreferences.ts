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
let lastHydratedUserId: string | null = null;
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
  // Re-hydrate when the active user changes (login/logout/account switch).
  const currentUserId = useAuthStore.getState().user?.id ?? null;
  if (hydrated && lastHydratedUserId === currentUserId) {
    return;
  }
  hydrated = true;
  lastHydratedUserId = currentUserId;

  // Source-of-truth priority:
  //   1. AsyncStorage — written synchronously on every toggle and most
  //      reliable to flush before the app is killed.
  //   2. The persisted auth-store user — used only as a fallback (e.g.
  //      first-ever launch on this device, or AsyncStorage cleared).
  // Reading user data first would let a stale SecureStore copy clobber a
  // toggle the user already made and AsyncStorage already saved.
  AsyncStorage.getItem(STORAGE_KEY)
    .then((storedValue) => {
      if (storedValue) {
        preferences = normalizePreferences(JSON.parse(storedValue));
        emitChange();
        return;
      }

      const user = useAuthStore.getState().user;
      if (user && user.pushNotificationsEnabled !== undefined) {
        preferences = {
          pushEnabled: user.pushNotificationsEnabled,
          emailEnabled: user.emailNotificationsEnabled,
        };
        // Seed AsyncStorage so future hydrations are local-first.
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)).catch(() => {});
        emitChange();
      }
    })
    .catch(() => {
      const user = useAuthStore.getState().user;
      if (user && user.pushNotificationsEnabled !== undefined) {
        preferences = {
          pushEnabled: user.pushNotificationsEnabled,
          emailEnabled: user.emailNotificationsEnabled,
        };
        emitChange();
      }
    });
}

function setPreferencesCore(nextPreferences: NotificationPreferences) {
  const previousPreferences = preferences;

  preferences = nextPreferences;
  emitChange();

  // Persist locally first. Do not await; AsyncStorage write is fast and
  // reliable on iOS/Android even if the app is backgrounded shortly after.
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences)).catch(() => {});

  // Mirror into the auth-store user immediately (optimistic), so the
  // zustand persist middleware writes the new value to SecureStore right
  // away rather than waiting on a network round-trip. If the network call
  // later fails we roll both copies back to `previousPreferences`.
  applyPreferencesToAuthStore(nextPreferences);

  if (syncingWithBackend) {
    return;
  }
  syncingWithBackend = true;

  authService
    .saveNotificationPreferences(nextPreferences.pushEnabled, nextPreferences.emailEnabled)
    .catch(() => {
      // Roll back in-memory + persisted copies so the UI doesn't claim a
      // change that the backend rejected.
      preferences = previousPreferences;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(previousPreferences)).catch(() => {});
      applyPreferencesToAuthStore(previousPreferences);
      emitChange();
    })
    .finally(() => {
      syncingWithBackend = false;
    });
}

function applyPreferencesToAuthStore(next: NotificationPreferences) {
  const currentUser = useAuthStore.getState().user;
  if (!currentUser) {
    return;
  }
  if (
    currentUser.pushNotificationsEnabled === next.pushEnabled &&
    currentUser.emailNotificationsEnabled === next.emailEnabled
  ) {
    return;
  }
  useAuthStore.getState().updateUser({
    ...currentUser,
    pushNotificationsEnabled: next.pushEnabled,
    emailNotificationsEnabled: next.emailEnabled,
  });
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
