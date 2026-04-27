import React from 'react';
import { StyleSheet, Pressable, View, ViewStyle, StyleProp, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../constants/colors';
import { PRESSED_SCALE, Spring } from '../../constants/motion';
import { Radius } from '../../constants/spacing';
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
  highlight?: boolean; // adds a subtle top inner-glow
  padding?: number;
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
  highlight = true,
  padding = 16,
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
      <View style={[styles.inner, { backgroundColor: colors.cardBg, padding }]}>
        {highlight && (
          <LinearGradient
            colors={[colors.cardHighlight, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
            style={styles.highlight}
          />
        )}
        {children}
      </View>
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
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  blur: {
    overflow: 'hidden',
  },
  inner: {
    padding: 16,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    opacity: 0.35,
  },
});

export default GlassCard;
