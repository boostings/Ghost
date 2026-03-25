import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleProp,
  useColorScheme,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '../../constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  blurIntensity?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  blurIntensity = 60,
  onPress,
  accessibilityLabel,
}) => {
  const colorScheme = useColorScheme();
  const colors = useThemeColors();

  const content = (
    <View style={[styles.container, { borderColor: colors.cardBorder }, style]}>
      <BlurView
        intensity={blurIntensity}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={styles.blur}
      >
        <View style={[styles.inner, { backgroundColor: colors.cardBg }]}>{children}</View>
      </BlurView>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  blur: {
    overflow: 'hidden',
  },
  inner: {
    padding: 16,
  },
});

export default GlassCard;
