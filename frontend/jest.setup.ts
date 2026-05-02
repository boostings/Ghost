import '@testing-library/jest-native/extend-expect';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-worklets', () => ({
  runOnJS: (fn: unknown) => fn,
  runOnUI: (fn: unknown) => fn,
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, Image, ScrollView } = require('react-native');

  const passthrough = (Component: React.ComponentType) => Component;

  const wrap = (Component: React.ComponentType, displayName: string) => {
    const Wrapped = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      // Strip reanimated-only props that RN primitives don't accept
      const { entering, exiting, layout, ...rest } = props;
      void entering;
      void exiting;
      void layout;
      return React.createElement(Component, { ...rest, ref });
    });
    Wrapped.displayName = displayName;
    return Wrapped;
  };

  const AnimatedView = wrap(View, 'Animated.View');
  const AnimatedText = wrap(Text, 'Animated.Text');
  const AnimatedImage = wrap(Image, 'Animated.Image');
  const AnimatedScrollView = wrap(ScrollView, 'Animated.ScrollView');

  const createAnimatedComponent = (Component: React.ComponentType) =>
    wrap(Component, 'Animated.Custom');

  const noopAnimation = () => {
    const builder: Record<string, unknown> = {};
    const proxy: unknown = new Proxy(builder, {
      get: (_target, prop) => {
        if (prop === 'build') return () => ({});
        return () => proxy;
      },
    });
    return proxy;
  };

  const EasingBase = {
    bezier: () => (t: number) => t,
    linear: (t: number) => t,
    ease: (t: number) => t,
    quad: (t: number) => t,
    cubic: (t: number) => t,
    in: (fn: unknown) => fn,
    out: (fn: unknown) => fn,
    inOut: (fn: unknown) => fn,
  };

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      Text: AnimatedText,
      Image: AnimatedImage,
      ScrollView: AnimatedScrollView,
      createAnimatedComponent,
    },
    View: AnimatedView,
    Text: AnimatedText,
    Image: AnimatedImage,
    ScrollView: AnimatedScrollView,
    createAnimatedComponent,
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useReducedMotion: () => false,
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown) => value,
    withDelay: (_delay: unknown, value: unknown) => value,
    withRepeat: (value: unknown) => value,
    withSequence: (...values: unknown[]) => values[values.length - 1],
    interpolate: () => 0,
    interpolateColor: () => '#000000',
    runOnJS: (fn: unknown) => fn,
    runOnUI: (fn: unknown) => fn,
    Easing: EasingBase,
    FadeIn: noopAnimation(),
    FadeOut: noopAnimation(),
    FadeInDown: noopAnimation(),
    FadeInUp: noopAnimation(),
    FadeOutDown: noopAnimation(),
    FadeOutUp: noopAnimation(),
    SlideInUp: noopAnimation(),
    SlideInDown: noopAnimation(),
    SlideOutUp: noopAnimation(),
    SlideOutDown: noopAnimation(),
    ZoomIn: noopAnimation(),
    ZoomOut: noopAnimation(),
    BounceIn: noopAnimation(),
    BounceOut: noopAnimation(),
    LinearTransition: noopAnimation(),
    Layout: noopAnimation(),
    withAnimation: passthrough,
  };
});

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    BlurView: ({ children }: { children?: unknown }) => React.createElement(View, null, children),
  };
});
