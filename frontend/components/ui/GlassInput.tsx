import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Text,
  View,
  ViewStyle,
  StyleProp,
  TextInputProps,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

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

  const inputHeight = multiline ? Math.max(48, numberOfLines * 24 + 24) : 48;

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.container,
          { minHeight: inputHeight },
          isFocused && styles.containerFocused,
          error ? styles.containerError : null,
          !editable && styles.containerDisabled,
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
            icon ? styles.inputWithIcon : null,
          ]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
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
          selectionColor={Colors.primary}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.medium.fontWeight,
    marginBottom: 8,
  },
  container: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  containerFocused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  containerError: {
    borderColor: '#FF4444',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: Colors.text,
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
    color: '#FF4444',
    fontSize: Fonts.sizes.sm,
    marginTop: 6,
    marginLeft: 4,
  },
});

export default GlassInput;
