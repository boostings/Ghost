import { Appearance, type ColorSchemeName, useColorScheme } from 'react-native';

export interface AppColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string; // 0.18 alpha tint - chip backgrounds, glows
  primaryFaint: string; // 0.08 alpha tint - subtle accents
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
  cardHighlight: string; // top inner stroke for glass cards
  inputBg: string;
  inputBorder: string;
  overlay: string;
  upvote: string;
  downvote: string;
  openStatus: string;
  closedStatus: string;
  verifiedAnswer: string;
  // Background gradient tuple (top -> middle -> bottom)
  bgGradient: readonly [string, string, string];
}

const ACCENT = '#BB2744';
const ACCENT_DARK = '#8E1D34';
const ACCENT_LIGHT = '#D4556D';

export const LightColors: AppColors = {
  primary: ACCENT,
  primaryDark: ACCENT_DARK,
  primaryLight: ACCENT_LIGHT,
  primarySoft: 'rgba(187, 39, 68, 0.16)',
  primaryFaint: 'rgba(187, 39, 68, 0.08)',
  secondary: ACCENT_LIGHT,
  background: '#FBFBFD',
  backgroundLight: '#F5F6F8',
  surface: 'rgba(255, 255, 255, 0.82)',
  surfaceLight: 'rgba(255, 255, 255, 0.92)',
  surfaceBorder: 'rgba(15, 23, 42, 0.10)',
  text: '#0B0F1A',
  textSecondary: 'rgba(11, 15, 26, 0.74)',
  textMuted: 'rgba(11, 15, 26, 0.50)',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  cardBg: 'rgba(255, 255, 255, 0.78)',
  cardBorder: 'rgba(15, 23, 42, 0.10)',
  cardHighlight: 'rgba(255, 255, 255, 0.85)',
  inputBg: 'rgba(255, 255, 255, 0.92)',
  inputBorder: 'rgba(15, 23, 42, 0.14)',
  overlay: 'rgba(11, 15, 26, 0.35)',
  upvote: '#16A34A',
  downvote: '#DC2626',
  openStatus: '#16A34A',
  closedStatus: ACCENT,
  verifiedAnswer: '#16A34A',
  bgGradient: ['#FBFBFD', '#F5F6F8', '#EFF1F4'] as const,
};

export const DarkColors: AppColors = {
  primary: ACCENT,
  primaryDark: ACCENT_DARK,
  primaryLight: ACCENT_LIGHT,
  primarySoft: 'rgba(187, 39, 68, 0.20)',
  primaryFaint: 'rgba(187, 39, 68, 0.10)',
  secondary: ACCENT_LIGHT,
  background: '#0B0D12',
  backgroundLight: '#13161D',
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceLight: 'rgba(255, 255, 255, 0.10)',
  surfaceBorder: 'rgba(255, 255, 255, 0.10)',
  text: '#F4F4F6',
  textSecondary: 'rgba(244, 244, 246, 0.74)',
  textMuted: 'rgba(244, 244, 246, 0.52)',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#F87171',
  info: '#60A5FA',
  cardBg: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.12)',
  cardHighlight: 'rgba(255, 255, 255, 0.12)',
  inputBg: 'rgba(255, 255, 255, 0.06)',
  inputBorder: 'rgba(255, 255, 255, 0.14)',
  overlay: 'rgba(0, 0, 0, 0.55)',
  upvote: '#22C55E',
  downvote: '#F87171',
  openStatus: '#22C55E',
  closedStatus: ACCENT,
  verifiedAnswer: '#22C55E',
  bgGradient: ['#0B0D12', '#0F1115', '#05070A'] as const,
};

export function getThemeColors(scheme?: ColorSchemeName | null): AppColors {
  return scheme === 'dark' ? DarkColors : LightColors;
}

export function useThemeColors(): AppColors {
  const scheme = useColorScheme();
  return getThemeColors(scheme);
}

export const Colors = getThemeColors(Appearance.getColorScheme());
