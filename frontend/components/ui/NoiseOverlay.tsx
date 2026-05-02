import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export default function NoiseOverlay() {
  return (
    <View
      pointerEvents="none"
      style={styles.overlay}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={require('../../assets/noise-grain.png')}
        resizeMode="repeat"
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.07,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
});
