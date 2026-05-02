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

export const ACCENT_PALETTE = [
  { id: 'crimson', primary: '#E63946', soft: '#E6394620' },
  { id: 'gold', primary: '#F4A261', soft: '#F4A26120' },
  { id: 'forest', primary: '#2A9D8F', soft: '#2A9D8F20' },
  { id: 'indigo', primary: '#6366F1', soft: '#6366F120' },
  { id: 'rose', primary: '#EC4899', soft: '#EC489920' },
  { id: 'sky', primary: '#3B82F6', soft: '#3B82F620' },
  { id: 'lime', primary: '#84CC16', soft: '#84CC1620' },
  { id: 'amber', primary: '#FBBF24', soft: '#FBBF2420' },
] as const;

export type WhiteboardAccent = (typeof ACCENT_PALETTE)[number];

export function accentForWhiteboard(whiteboardId: string): WhiteboardAccent {
  const index =
    whiteboardId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    ACCENT_PALETTE.length;
  return ACCENT_PALETTE[index];
}

export const STATUS_COLORS = {
  OPEN: { bg: '#04785720', fg: '#047857', fgDark: '#34D399', label: 'Open' },
  ANSWERED: { bg: '#2563EB20', fg: '#2563EB', fgDark: '#60A5FA', label: 'Answered' },
  CLOSED: { bg: '#4B556320', fg: '#4B5563', fgDark: '#D1D5DB', label: 'Closed' },
} as const;

export type DisplayQuestionStatus = keyof typeof STATUS_COLORS;

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
  textMuted: 'rgba(11, 15, 26, 0.62)',
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
  textMuted: 'rgba(244, 244, 246, 0.70)',
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
