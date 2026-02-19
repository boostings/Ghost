import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export default function NetworkStatusBanner() {
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <View style={[styles.container, { top: insets.top + 6 }]}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.error,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  text: {
    color: Colors.text,
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
});
