import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let systemPrefersReducedMotion = false;
let initialized = false;
let subscription: { remove: () => void } | undefined;

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function resolvedReducedMotion() {
  return systemPrefersReducedMotion;
}

function setSystemReducedMotion(nextValue: boolean) {
  if (systemPrefersReducedMotion === nextValue) return;
  systemPrefersReducedMotion = nextValue;
  notifyListeners();
}

function ensureSubscription() {
  if (initialized) return;
  initialized = true;

  AccessibilityInfo.isReduceMotionEnabled?.()
    .then((enabled) => setSystemReducedMotion(enabled))
    .catch(() => setSystemReducedMotion(false));

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

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
