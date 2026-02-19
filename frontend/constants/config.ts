import Constants from 'expo-constants';

const expoExtra = Constants.expoConfig?.extra ?? {};
const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
const defaultApiBase = devHost ? `http://${devHost}:8080` : 'http://localhost:8080';
const defaultWsBase = devHost ? `ws://${devHost}:8080` : 'ws://localhost:8080';

const API_BASE = expoExtra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? defaultApiBase;

const WS_BASE = expoExtra.wsUrl ?? process.env.EXPO_PUBLIC_WS_URL ?? defaultWsBase;

export const Config = {
  API_URL: `${API_BASE}/api`,
  WS_URL: `${WS_BASE}/ws`,
  PAGE_SIZE: 20,
  COMMENT_EDIT_WINDOW_MINUTES: 15,
  MAX_PINNED_QUESTIONS: 3,
  AUTO_HIDE_REPORT_THRESHOLD: 3,
} as const;
