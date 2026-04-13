import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  useColorScheme,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { type AppColors, useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

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

  return (
    <TouchableOpacity
      style={[styles.base, { borderColor: colors.surfaceBorder }, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
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
    </TouchableOpacity>
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
