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
  const textStyle = getTextStyle(variant);

  return (
    <TouchableOpacity
      style={[styles.base, containerStyle, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? Colors.primary : Colors.text}
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.text, textStyle]}>{title}</Text>
        </View>
      )}
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

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
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
    backgroundColor: Colors.primary,
  },
  primaryText: {
    color: Colors.text,
  },
  // Secondary
  secondaryContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  secondaryText: {
    color: Colors.primary,
  },
  // Danger
  dangerContainer: {
    backgroundColor: '#FF4444',
  },
  dangerText: {
    color: Colors.text,
  },
  // Ghost
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: Colors.primary,
  },
});

export default GlassButton;
