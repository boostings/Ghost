import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration } from '../../constants/motion';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export default function NetworkStatusBanner() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { isOffline } = useNetworkStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(Duration.normal).springify().damping(18)}
      exiting={FadeOutUp.duration(Duration.fast)}
      accessibilityRole="alert"
      accessibilityLabel="No internet connection"
      style={[
        styles.container,
        {
          top: insets.top + 6,
          backgroundColor: colors.error,
          borderColor: 'rgba(255,255,255,0.25)',
        },
      ]}
    >
      <View style={styles.row}>
        <Ionicons name="cloud-offline-outline" size={14} color="#FFFFFF" />
        <Text style={styles.text}>No internet connection</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.bold.fontWeight,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
