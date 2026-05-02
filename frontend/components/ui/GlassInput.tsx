import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Text,
  View,
  ViewStyle,
  StyleProp,
  TextInputProps,
  Pressable,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Ease } from '../../constants/motion';
import { Radius } from '../../constants/spacing';

interface GlassInputProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  error?: string;
  label?: string;
  icon?: React.ReactNode;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  keyboardType?: TextInputProps['keyboardType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  onBlur?: TextInputProps['onBlur'];
  maxLength?: number;
  editable?: boolean;
  showClear?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const GlassInput: React.FC<GlassInputProps> = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  multiline = false,
  numberOfLines = 1,
  error,
  label,
  icon,
  autoCapitalize = 'none',
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  onBlur,
  maxLength,
  editable = true,
  showClear = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSecure, setShowSecure] = useState(secureTextEntry ?? false);
  const colors = useThemeColors();

  const inputHeight = multiline ? Math.max(52, numberOfLines * 24 + 28) : 52;

  const focusProgress = useSharedValue(0);

  useEffect(() => {
    focusProgress.value = withTiming(isFocused ? 1 : 0, {
      duration: Duration.normal,
      easing: Ease.out,
    });
  }, [isFocused, focusProgress]);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.inputBorder, colors.primary]
    ),
    backgroundColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.inputBg, colors.surfaceLight]
    ),
  }));

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <Animated.View
        style={[
          styles.container,
          { minHeight: inputHeight },
          error
            ? { borderColor: colors.error, backgroundColor: colors.inputBg }
            : animatedBorderStyle,
          !editable && styles.containerDisabled,
        ]}
      >
        {icon && (
          <View style={styles.iconContainer} accessible={false} importantForAccessibility="no">
            {icon}
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            multiline && styles.multilineInput,
            icon ? styles.inputWithIcon : null,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={showSecure}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          textAlignVertical={multiline ? 'top' : 'center'}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          editable={editable}
          accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled: !editable }}
          onFocus={() => setIsFocused(true)}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          selectionColor={colors.primary}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setShowSecure((prev) => !prev)}
            hitSlop={8}
            style={styles.affordance}
            accessibilityRole="button"
            accessibilityLabel={showSecure ? 'Show password' : 'Hide password'}
            accessibilityState={{ selected: !showSecure }}
          >
            <Ionicons
              name={showSecure ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        )}
        {showClear && value.length > 0 && !secureTextEntry && (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={8}
            style={styles.affordance}
            accessibilityRole="button"
            accessibilityLabel="Clear input"
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </Animated.View>
      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.medium.fontWeight,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  container: {
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.regular.fontWeight,
    paddingVertical: 14,
  },
  multilineInput: {
    paddingTop: 14,
    paddingBottom: 14,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  affordance: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  errorText: {
    fontSize: Fonts.sizes.sm,
    marginTop: 6,
    marginLeft: 4,
  },
});

export default GlassInput;
