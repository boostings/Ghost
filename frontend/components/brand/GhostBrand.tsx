import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

interface GhostMarkProps {
  size?: number;
  animated?: boolean;
}

export function GhostMark({ size = 120, animated = false }: GhostMarkProps) {
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (!animated || reduceMotion) {
      offset.value = 0;
      return;
    }

    offset.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [animated, offset, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View
      style={[styles.markWrap, animatedStyle, { width: size, height: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Ghost logo"
    >
      <Image
        source={require('../../public/logo.png')}
        style={styles.markImage}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

export function GhostWordmark({ version }: { version?: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.wordmark} accessible accessibilityRole="text">
      <GhostMark size={30} />
      <Text style={[styles.wordmarkText, { color: colors.text }]}>Ghost</Text>
      {version ? (
        <Text style={[styles.version, { color: colors.textMuted }]}>{version}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  markWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  markImage: {
    width: '100%',
    height: '100%',
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  wordmarkText: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  version: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
