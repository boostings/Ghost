import { Appearance, type ColorSchemeName, useColorScheme } from 'react-native';

export interface AppColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  background: string;
  backgroundLight: string;
  surface: string;
  surfaceLight: string;
  surfaceBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  cardBg: string;
  cardBorder: string;
  inputBg: string;
  inputBorder: string;
  overlay: string;
  upvote: string;
  downvote: string;
  openStatus: string;
  closedStatus: string;
}

const ACCENT = '#BB2744';

export const LightColors: AppColors = {
  primary: ACCENT,
  primaryDark: '#8E1D34',
  primaryLight: '#D4556D',
  secondary: '#D4556D',
  background: '#FFFFFF',
  backgroundLight: '#F5F6F8',
  surface: 'rgba(255, 255, 255, 0.82)',
  surfaceLight: 'rgba(255, 255, 255, 0.92)',
  surfaceBorder: 'rgba(15, 23, 42, 0.14)',
  text: '#111827',
  textSecondary: 'rgba(17, 24, 39, 0.78)',
  textMuted: 'rgba(17, 24, 39, 0.55)',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  cardBg: 'rgba(255, 255, 255, 0.86)',
  cardBorder: 'rgba(15, 23, 42, 0.12)',
  inputBg: 'rgba(255, 255, 255, 0.92)',
  inputBorder: 'rgba(15, 23, 42, 0.16)',
  overlay: 'rgba(15, 23, 42, 0.35)',
  upvote: '#16A34A',
  downvote: '#DC2626',
  openStatus: '#16A34A',
  closedStatus: ACCENT,
};

export const DarkColors: AppColors = {
  primary: ACCENT,
  primaryDark: '#8E1D34',
  primaryLight: '#D4556D',
  secondary: '#D4556D',
  background: '#0F1115',
  backgroundLight: '#171A21',
  surface: 'rgba(255, 255, 255, 0.10)',
  surfaceLight: 'rgba(255, 255, 255, 0.15)',
  surfaceBorder: 'rgba(255, 255, 255, 0.20)',
  text: '#F9FAFB',
  textSecondary: 'rgba(249, 250, 251, 0.78)',
  textMuted: 'rgba(249, 250, 251, 0.56)',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#F87171',
  info: '#60A5FA',
  cardBg: 'rgba(255, 255, 255, 0.08)',
  cardBorder: 'rgba(255, 255, 255, 0.22)',
  inputBg: 'rgba(255, 255, 255, 0.10)',
  inputBorder: 'rgba(255, 255, 255, 0.24)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  upvote: '#22C55E',
  downvote: '#F87171',
  openStatus: '#22C55E',
  closedStatus: ACCENT,
};

export function getThemeColors(scheme?: ColorSchemeName): AppColors {
  return scheme === 'dark' ? DarkColors : LightColors;
}

export function useThemeColors(): AppColors {
  const scheme = useColorScheme();
  return getThemeColors(scheme);
}

export const Colors = getThemeColors(Appearance.getColorScheme());
