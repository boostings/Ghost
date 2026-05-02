import React from 'react';
import {
  StyleSheet,
  Pressable,
  Text,
  ActivityIndicator,
  View,
  useColorScheme,
  Platform,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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
  accessibilityHint?: string;
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
  accessibilityHint,
  solid = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = useThemeColors();
  const isInactive = disabled || loading;
  const variantStyles = getVariantStyles(variant, colors, solid, isInactive);
  const isSolid = solid && variant === 'primary';
  const gradientColors = isInactive
    ? ([colors.backgroundLight, colors.surfaceLight, colors.backgroundLight] as const)
    : ([colors.primaryLight, colors.primary, colors.primaryDark] as const);
  const webCursorStyle =
    Platform.OS === 'web'
      ? ({ cursor: isInactive ? 'not-allowed' : 'pointer' } as unknown as ViewStyle)
      : null;

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (!isInactive) {
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
        {
          borderColor: isInactive ? colors.inputBorder : colors.surfaceBorder,
          minHeight,
          opacity: isInactive ? 0.4 : 1,
        },
        webCursorStyle,
        isSolid && !isInactive && Shadow.primaryGlow(colors.primary),
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: loading }}
    >
      {isSolid ? (
        isInactive ? (
          <View style={[styles.gradientFill, { backgroundColor: variantStyles.overlayColor }]}>
            <View
              style={[
                styles.contentWrap,
                { paddingHorizontal: horizontalPad, paddingVertical: verticalPad, minHeight },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={variantStyles.indicatorColor} />
              ) : (
                <View style={styles.content}>
                  {icon && (
                    <View
                      style={styles.iconContainer}
                      accessible={false}
                      importantForAccessibility="no"
                    >
                      {icon}
                    </View>
                  )}
                  <Text style={[styles.text, { fontSize, color: variantStyles.textColor }]}>
                    {title}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientFill}
          >
            <View
              style={[
                styles.contentWrap,
                { paddingHorizontal: horizontalPad, paddingVertical: verticalPad, minHeight },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={variantStyles.indicatorColor} />
              ) : (
                <View style={styles.content}>
                  {icon && (
                    <View
                      style={styles.iconContainer}
                      accessible={false}
                      importantForAccessibility="no"
                    >
                      {icon}
                    </View>
                  )}
                  <Text style={[styles.text, { fontSize, color: variantStyles.textColor }]}>
                    {title}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        )
      ) : (
        <BlurView
          intensity={60}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={styles.blur}
        >
          <View
            style={[
              styles.contentWrap,
              {
                backgroundColor: variantStyles.overlayColor,
                paddingHorizontal: horizontalPad,
                paddingVertical: verticalPad,
                minHeight,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={variantStyles.indicatorColor} />
            ) : (
              <View style={styles.content}>
                {icon && (
                  <View
                    style={styles.iconContainer}
                    accessible={false}
                    importantForAccessibility="no"
                  >
                    {icon}
                  </View>
                )}
                <Text style={[styles.text, { fontSize, color: variantStyles.textColor }]}>
                  {title}
                </Text>
              </View>
            )}
          </View>
        </BlurView>
      )}
    </AnimatedPressable>
  );
};

function getVariantStyles(
  variant: ButtonVariant,
  colors: AppColors,
  solid: boolean,
  disabled: boolean
) {
  if (disabled) {
    return {
      overlayColor: colors.surfaceLight,
      textColor: colors.textMuted,
      indicatorColor: colors.textMuted,
    };
  }

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
});

export default GlassButton;
