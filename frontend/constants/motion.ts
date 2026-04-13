import { Easing } from 'react-native-reanimated';

export const Duration = {
  instant: 120,
  fast: 180,
  normal: 220,
  slow: 300,
  drawer: 500,
} as const;

export const Ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  ios: Easing.bezier(0.32, 0.72, 0, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
} as const;

export const Spring = {
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  gentle: { damping: 20, stiffness: 180, mass: 1 },
  soft: { damping: 24, stiffness: 140, mass: 1 },
} as const;

export const PRESSED_SCALE = 0.97;

export const Stagger = {
  step: 70,
  hero: 0,
  card: 140,
  footer: 280,
} as const;
