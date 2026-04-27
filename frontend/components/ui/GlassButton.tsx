import React from 'react';
import { StyleSheet, Pressable, Text, ActivityIndicator, View, useColorScheme } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { type AppColors, useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, PRESSED_OPACITY, PRESSED_SCALE, Spring } from '../../constants/motion';
import { Radius, Shadow } from '../../constants/spacing';
import { haptic } from '../../utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'md' | 'sm';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
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
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  accessibilityLabel,
  solid = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = useThemeColors();
  const variantStyles = getVariantStyles(variant, colors, solid);
  const isSolid = solid && variant === 'primary';

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      haptic.light();
    }
    scale.value = withSpring(PRESSED_SCALE, Spring.press);
    opacity.value = withTiming(PRESSED_OPACITY, { duration: Duration.fast });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, Spring.press);
    opacity.value = withTiming(1, { duration: Duration.fast });
  };

  const minHeight = size === 'sm' ? 40 : 48;
  const horizontalPad = size === 'sm' ? 18 : 24;
  const verticalPad = size === 'sm' ? 10 : 14;
  const fontSize = size === 'sm' ? Fonts.sizes.md : Fonts.sizes.lg;

  return (
    <AnimatedPressable
      style={[
        styles.base,
        { borderColor: colors.surfaceBorder, minHeight },
        isSolid && Shadow.primaryGlow(colors.primary),
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
      {isSolid ? (
        <LinearGradient
          colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientFill}
        >
          <View style={[styles.contentWrap, { paddingHorizontal: horizontalPad, paddingVertical: verticalPad, minHeight }]}>
            {loading ? (
              <ActivityIndicator size="small" color={variantStyles.indicatorColor} />
            ) : (
              <View style={styles.content}>
                {icon && <View style={styles.iconContainer}>{icon}</View>}
                <Text style={[styles.text, { fontSize, color: variantStyles.textColor }]}>{title}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      ) : (
        <BlurView intensity={60} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.blur}>
          <View
            style={[
              styles.contentWrap,
              { backgroundColor: variantStyles.overlayColor, paddingHorizontal: horizontalPad, paddingVertical: verticalPad, minHeight },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={variantStyles.indicatorColor} />
            ) : (
              <View style={styles.content}>
                {icon && <View style={styles.iconContainer}>{icon}</View>}
                <Text style={[styles.text, { fontSize, color: variantStyles.textColor }]}>{title}</Text>
              </View>
            )}
          </View>
        </BlurView>
      )}
    </AnimatedPressable>
  );
};

function getVariantStyles(variant: ButtonVariant, colors: AppColors, solid: boolean) {
  switch (variant) {
    case 'primary':
      return {
        overlayColor: solid ? colors.primary : colors.primarySoft,
        textColor: solid ? '#FFFFFF' : colors.primary,
        indicatorColor: solid ? '#FFFFFF' : colors.primary,
      };
    case 'secondary':
      return {
        overlayColor: colors.surfaceLight,
        textColor: colors.text,
        indicatorColor: colors.primary,
      };
    case 'danger':
      return {
        overlayColor: solid ? colors.error : `${colors.error}26`,
        textColor: solid ? '#FFFFFF' : colors.error,
        indicatorColor: solid ? '#FFFFFF' : colors.error,
      };
    case 'ghost':
      return {
        overlayColor: 'transparent',
        textColor: colors.primary,
        indicatorColor: colors.primary,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  blur: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  gradientFill: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  contentWrap: {
    width: '100%',
    alignItems: 'center',
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
    fontWeight: Fonts.semiBold.fontWeight,
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.45,
  },
});

export default GlassButton;
