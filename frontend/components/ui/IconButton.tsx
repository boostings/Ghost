import React from 'react';
import { StyleSheet, Pressable, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../constants/colors';
import { PRESSED_SCALE, Spring } from '../../constants/motion';
import { haptic } from '../../utils/haptics';

type IconName = keyof typeof Ionicons.glyphMap;
type IconButtonVariant = 'subtle' | 'solid' | 'ghost';

interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  size?: number;
  variant?: IconButtonVariant;
  color?: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hapticType?: 'light' | 'selection' | 'medium';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const IconButton: React.FC<IconButtonProps> = ({
  name,
  onPress,
  size = 20,
  variant = 'subtle',
  color,
  accessibilityLabel,
  style,
  disabled = false,
  hapticType = 'light',
}) => {
  const colors = useThemeColors();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const dim = size + 18;

  const variantBg = (() => {
    if (disabled) return 'transparent';
    switch (variant) {
      case 'solid':
        return colors.primary;
      case 'subtle':
        return colors.surfaceLight;
      case 'ghost':
        return 'transparent';
    }
  })();

  const iconColor = color ?? (variant === 'solid' ? '#FFFFFF' : colors.text);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (!disabled) {
          haptic[hapticType]();
        }
        scale.value = withSpring(PRESSED_SCALE, Spring.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, Spring.press);
      }}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: variantBg,
          borderColor: variant === 'subtle' ? colors.surfaceBorder : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
        animatedStyle,
      ]}
    >
      <Ionicons
        name={name}
        size={size}
        color={iconColor}
        accessible={false}
        importantForAccessibility="no"
      />
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default IconButton;
