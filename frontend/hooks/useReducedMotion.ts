import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReducedMotionPreference = 'system' | 'reduce' | 'allow';

const STORAGE_KEY = '@ghost/reduced-motion-preference';

let systemPrefersReducedMotion = false;
let preference: ReducedMotionPreference = 'system';
let initialized = false;
let subscription: { remove: () => void } | undefined;

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function resolvedReducedMotion() {
  if (preference === 'reduce') return true;
  if (preference === 'allow') return false;
  return systemPrefersReducedMotion;
}

function setSystemReducedMotion(nextValue: boolean) {
  if (systemPrefersReducedMotion === nextValue) return;
  systemPrefersReducedMotion = nextValue;
  notifyListeners();
}

function setPreferenceState(nextValue: ReducedMotionPreference) {
  if (preference === nextValue) return;
  preference = nextValue;
  notifyListeners();
}

function ensureSubscription() {
  if (initialized) return;
  initialized = true;

  AccessibilityInfo.isReduceMotionEnabled?.()
    .then((enabled) => setSystemReducedMotion(enabled))
    .catch(() => setSystemReducedMotion(false));

  AsyncStorage.getItem(STORAGE_KEY)
    .then((value) => {
      if (value === 'system' || value === 'reduce' || value === 'allow') {
        setPreferenceState(value);
      }
    })
    .catch(() => {});

  subscription =
    AccessibilityInfo.addEventListener?.('reduceMotionChanged', setSystemReducedMotion) ??
    undefined;
}

function subscribe(listener: () => void) {
  ensureSubscription();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      subscription?.remove();
      subscription = undefined;
      initialized = false;
    }
  };
}

function getSnapshot() {
  return resolvedReducedMotion();
}

function getPreferenceSnapshot() {
  return preference;
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useReducedMotionPreference(): {
  preference: ReducedMotionPreference;
  setPreference: (next: ReducedMotionPreference) => void;
} {
  const currentPreference = useSyncExternalStore(
    subscribe,
    getPreferenceSnapshot,
    getPreferenceSnapshot
  );

  return {
    preference: currentPreference,
    setPreference: (next) => {
      setPreferenceState(next);
      void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
    },
  };
}
