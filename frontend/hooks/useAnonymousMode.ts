import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/authStore';

const STORAGE_KEY = '@ghost/anonymous-mode';

let anonymousMode = false;
let hydrated = false;
let lastHydratedUserId: string | null = null;
let syncing = false;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function hydrateAnonymousMode() {
  const currentUserId = useAuthStore.getState().user?.id ?? null;
  if (hydrated && lastHydratedUserId === currentUserId) {
    return;
  }
  hydrated = true;
  lastHydratedUserId = currentUserId;

  AsyncStorage.getItem(STORAGE_KEY)
    .then((stored) => {
      if (stored !== null) {
        anonymousMode = stored === 'true';
        emitChange();
        return;
      }
      const user = useAuthStore.getState().user;
      if (user) {
        anonymousMode = user.anonymousMode ?? false;
        AsyncStorage.setItem(STORAGE_KEY, String(anonymousMode)).catch(() => {});
        emitChange();
      }
    })
    .catch(() => {
      const user = useAuthStore.getState().user;
      if (user) {
        anonymousMode = user.anonymousMode ?? false;
        emitChange();
      }
    });
}

function setAnonymousModeCore(enabled: boolean) {
  const previous = anonymousMode;
  anonymousMode = enabled;
  emitChange();

  AsyncStorage.setItem(STORAGE_KEY, String(enabled)).catch(() => {});

  const currentUser = useAuthStore.getState().user;
  if (currentUser) {
    useAuthStore.getState().updateUser({ ...currentUser, anonymousMode: enabled });
  }

  if (syncing) return;
  syncing = true;

  authService
    .saveAnonymousMode(enabled)
    .catch(() => {
      anonymousMode = previous;
      AsyncStorage.setItem(STORAGE_KEY, String(previous)).catch(() => {});
      const user = useAuthStore.getState().user;
      if (user) {
        useAuthStore.getState().updateUser({ ...user, anonymousMode: previous });
      }
      emitChange();
    })
    .finally(() => {
      syncing = false;
    });
}

function subscribe(listener: () => void) {
  hydrateAnonymousMode();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  hydrateAnonymousMode();
  return anonymousMode;
}

export function useAnonymousMode() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    anonymousModeEnabled: enabled,
    setAnonymousMode: setAnonymousModeCore,
  };
}
