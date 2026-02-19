import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';

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
  const content = (
    <View style={[styles.container, style]}>
      <BlurView intensity={blurIntensity} tint="dark" style={styles.blur}>
        <View style={styles.inner}>{children}</View>
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
    borderColor: 'rgba(255,255,255,0.3)',
  },
  blur: {
    overflow: 'hidden',
  },
  inner: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 16,
  },
});

export default GlassCard;
