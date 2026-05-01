import Constants from 'expo-constants';

const expoExtra = Constants.expoConfig?.extra ?? {};
const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
const localApiBase = devHost ? `http://${devHost}:8080` : 'http://localhost:8080';
const localWsBase = devHost ? `ws://${devHost}:8080` : 'ws://localhost:8080';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? expoExtra.apiUrl ?? localApiBase;

const WS_BASE = process.env.EXPO_PUBLIC_WS_URL ?? expoExtra.wsUrl ?? localWsBase;

export const Config = {
  API_URL: `${API_BASE}/api`,
  WS_URL: `${WS_BASE}/ws`,
  PAGE_SIZE: 20,
  COMMENT_EDIT_WINDOW_MINUTES: 60,
  MAX_PINNED_QUESTIONS: 3,
  AUTO_HIDE_REPORT_THRESHOLD: 3,
} as const;
