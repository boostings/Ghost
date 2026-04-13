import React from 'react';
import { StyleSheet, Pressable, View, ViewStyle, StyleProp, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '../../constants/colors';
import { PRESSED_SCALE, Spring } from '../../constants/motion';
import { haptic } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type AnimatedViewProps = React.ComponentProps<typeof Animated.View>;

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  blurIntensity?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  entering?: AnimatedViewProps['entering'];
  exiting?: AnimatedViewProps['exiting'];
  layout?: AnimatedViewProps['layout'];
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  blurIntensity = 60,
  onPress,
  accessibilityLabel,
  entering,
  exiting,
  layout,
}) => {
  const colorScheme = useColorScheme();
  const colors = useThemeColors();

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const inner = (
    <BlurView
      intensity={blurIntensity}
      tint={colorScheme === 'dark' ? 'dark' : 'light'}
      style={styles.blur}
    >
      <View style={[styles.inner, { backgroundColor: colors.cardBg }]}>{children}</View>
    </BlurView>
  );

  if (onPress) {
    const handlePressIn = () => {
      haptic.selection();
      scale.value = withSpring(PRESSED_SCALE, Spring.press);
    };
    const handlePressOut = () => {
      scale.value = withSpring(1, Spring.press);
    };

    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        entering={entering}
        exiting={exiting}
        layout={layout}
        style={[styles.container, { borderColor: colors.cardBorder }, style, pressStyle]}
      >
        {inner}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      layout={layout}
      style={[styles.container, { borderColor: colors.cardBorder }, style]}
    >
      {inner}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  blur: {
    overflow: 'hidden',
  },
  inner: {
    padding: 16,
  },
});

export default GlassCard;
