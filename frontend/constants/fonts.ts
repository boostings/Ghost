import { Platform } from 'react-native';

const systemFont = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const Fonts = {
  regular: {
    fontFamily: systemFont,
    fontWeight: '400' as const,
  },
  medium: {
    fontFamily: systemFont,
    fontWeight: '500' as const,
  },
  semiBold: {
    fontFamily: systemFont,
    fontWeight: '600' as const,
  },
  bold: {
    fontFamily: systemFont,
    fontWeight: '700' as const,
  },
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    title: 34,
  },
  lineHeights: {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 22,
    xl: 26,
    xxl: 30,
    xxxl: 36,
    title: 42,
  },
  // Shorthand weight values for convenience (backward-compatible alias)
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
};
