import { Platform } from 'react-native';

export const Spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
} as const;

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const Shadow = {
  none: Platform.select({
    web: { boxShadow: 'none' },
    default: { elevation: 0 },
  }) as object,
  soft: Platform.select({
    web: { boxShadow: '0 6px 18px rgba(0,0,0,0.18)' },
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
  }) as object,
  medium: Platform.select({
    web: { boxShadow: '0 12px 28px rgba(0,0,0,0.28)' },
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
  }) as object,
  primaryGlow: (color: string) =>
    Platform.select({
      web: { boxShadow: `0 8px 24px ${color}66` },
      default: {
        shadowColor: color,
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
      },
    }) as object,
} as const;
