import { Easing, FadeInDown, FadeIn } from 'react-native-reanimated';

export const Duration = {
  instant: 120,
  fast: 180,
  normal: 220,
  slow: 300,
  hero: 460,
  drawer: 500,
} as const;

// Curated easings - "out" mirrors the Emil/Linear easeOutExpo feel.
export const Ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  ios: Easing.bezier(0.32, 0.72, 0, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  emphasized: Easing.bezier(0.2, 0, 0, 1),
} as const;

export const Spring = {
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  gentle: { damping: 20, stiffness: 180, mass: 1 },
  soft: { damping: 24, stiffness: 140, mass: 1 },
  pop: { damping: 14, stiffness: 280, mass: 0.7 },
  bouncy: { damping: 11, stiffness: 220, mass: 0.6 },
} as const;

export const PRESSED_SCALE = 0.97;
export const PRESSED_OPACITY = 0.85;

export const Stagger = {
  list: 50,
  step: 70,
  hero: 0,
  card: 140,
  footer: 280,
} as const;

// Helpers for consistent screen entrances. Per Emil Kowalski:
// UI entrances use ease-out (not springs) and stay under 300ms — springs are
// reserved for natural motion like drag/drop and press/release.
export const enterCard = (delay = 0) =>
  FadeInDown.duration(Duration.normal).delay(delay).easing(Ease.out);

export const enterList = (index: number) =>
  FadeInDown.duration(Duration.normal)
    .delay(index * Stagger.list)
    .easing(Ease.out);

export const enterFade = (delay = 0) => FadeIn.duration(Duration.normal).delay(delay);
