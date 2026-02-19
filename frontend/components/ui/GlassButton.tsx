import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/colors';
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
}

const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  accessibilityLabel,
}) => {
  const containerStyle = getContainerStyle(variant);
  const overlayStyle = getOverlayStyle(variant);
  const textStyle = getTextStyle(variant);
  const indicatorColor = getIndicatorColor(variant);

  return (
    <TouchableOpacity
      style={[styles.base, containerStyle, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      <BlurView intensity={60} tint="dark" style={styles.blur}>
        <View style={[styles.overlay, overlayStyle]}>
          {loading ? (
            <ActivityIndicator size="small" color={indicatorColor} />
          ) : (
            <View style={styles.content}>
              {icon && <View style={styles.iconContainer}>{icon}</View>}
              <Text style={[styles.text, textStyle]}>{title}</Text>
            </View>
          )}
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};

function getContainerStyle(variant: ButtonVariant): ViewStyle {
  switch (variant) {
    case 'primary':
      return styles.primaryContainer;
    case 'secondary':
      return styles.secondaryContainer;
    case 'danger':
      return styles.dangerContainer;
    case 'ghost':
      return styles.ghostContainer;
  }
}

function getOverlayStyle(variant: ButtonVariant): ViewStyle {
  switch (variant) {
    case 'primary':
      return styles.primaryOverlay;
    case 'secondary':
      return styles.secondaryOverlay;
    case 'danger':
      return styles.dangerOverlay;
    case 'ghost':
      return styles.ghostOverlay;
  }
}

function getTextStyle(variant: ButtonVariant): TextStyle {
  switch (variant) {
    case 'primary':
      return styles.primaryText;
    case 'secondary':
      return styles.secondaryText;
    case 'danger':
      return styles.dangerText;
    case 'ghost':
      return styles.ghostText;
  }
}

function getIndicatorColor(variant: ButtonVariant): string {
  switch (variant) {
    case 'secondary':
    case 'ghost':
      return Colors.primary;
    default:
      return Colors.text;
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
    borderColor: 'rgba(255,255,255,0.3)',
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
    opacity: 0.5,
  },
  // Primary
  primaryContainer: {
    backgroundColor: 'transparent',
  },
  primaryOverlay: {
    backgroundColor: 'rgba(108,99,255,0.35)',
  },
  primaryText: {
    color: Colors.text,
  },
  // Secondary
  secondaryContainer: {
    backgroundColor: 'transparent',
  },
  secondaryOverlay: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  secondaryText: {
    color: Colors.primary,
  },
  // Danger
  dangerContainer: {
    backgroundColor: 'transparent',
  },
  dangerOverlay: {
    backgroundColor: 'rgba(255,68,68,0.35)',
  },
  dangerText: {
    color: Colors.text,
  },
  // Ghost
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostOverlay: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  ghostText: {
    color: Colors.primary,
  },
});

export default GlassButton;
