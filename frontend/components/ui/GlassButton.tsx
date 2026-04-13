import React from 'react';
import { StyleSheet, Pressable, Text, ActivityIndicator, View, useColorScheme } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { type AppColors, useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { PRESSED_SCALE, Spring } from '../../constants/motion';
import { haptic } from '../../utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  solid?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  accessibilityLabel,
  solid = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = useThemeColors();
  const variantStyles = getVariantStyles(variant, colors, solid);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      haptic.light();
    }
    scale.value = withSpring(PRESSED_SCALE, Spring.press);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, Spring.press);
  };

  return (
    <AnimatedPressable
      style={[
        styles.base,
        { borderColor: colors.surfaceBorder },
        disabled && styles.disabled,
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      <BlurView intensity={60} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.blur}>
        <View style={[styles.overlay, { backgroundColor: variantStyles.overlayColor }]}>
          {loading ? (
            <ActivityIndicator size="small" color={variantStyles.indicatorColor} />
          ) : (
            <View style={styles.content}>
              {icon && <View style={styles.iconContainer}>{icon}</View>}
              <Text style={[styles.text, { color: variantStyles.textColor }]}>{title}</Text>
            </View>
          )}
        </View>
      </BlurView>
    </AnimatedPressable>
  );
};

function getVariantStyles(variant: ButtonVariant, colors: AppColors, solid: boolean) {
  switch (variant) {
    case 'primary':
      return {
        overlayColor: solid ? colors.primary : `${colors.primary}59`,
        textColor: '#FFFFFF',
        indicatorColor: '#FFFFFF',
      };
    case 'secondary':
      return {
        overlayColor: colors.surfaceLight,
        textColor: colors.primary,
        indicatorColor: colors.primary,
      };
    case 'danger':
      return {
        overlayColor: `${colors.error}59`,
        textColor: '#FFFFFF',
        indicatorColor: '#FFFFFF',
      };
    case 'ghost':
      return {
        overlayColor: colors.surfaceLight,
        textColor: colors.primary,
        indicatorColor: colors.primary,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
  },
  blur: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  overlay: {
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.semiBold.fontWeight,
  },
  disabled: {
    opacity: 0.45,
  },
});

export default GlassButton;
