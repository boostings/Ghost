import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Text,
  View,
  ViewStyle,
  StyleProp,
  TextInputProps,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Ease } from '../../constants/motion';

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
  maxLength?: number;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
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
  maxLength,
  editable = true,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const colors = useThemeColors();

  const inputHeight = multiline ? Math.max(48, numberOfLines * 24 + 24) : 48;

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
        {icon && <View style={styles.iconContainer}>{icon}</View>}
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
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          textAlignVertical={multiline ? 'top' : 'center'}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor={colors.primary}
        />
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
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.medium.fontWeight,
    marginBottom: 8,
  },
  container: {
    borderRadius: 16,
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
    paddingVertical: 12,
  },
  multilineInput: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  errorText: {
    fontSize: Fonts.sizes.sm,
    marginTop: 6,
    marginLeft: 4,
  },
});

export default GlassInput;
