import React from 'react';
import { StyleSheet, ActivityIndicator, View, type ViewStyle, type StyleProp } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../constants/colors';

interface ScreenWrapperProps {
  children: React.ReactNode;
  edges?: Edge[];
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Adds a subtle primary-tinted glow at the top of the screen for hero surfaces. */
  ambient?: boolean;
}

export default function ScreenWrapper({
  children,
  edges = ['top'],
  loading = false,
  style,
  ambient = false,
}: ScreenWrapperProps) {
  const colors = useThemeColors();

  if (loading) {
    return (
      <LinearGradient colors={colors.bgGradient} style={styles.gradient}>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={colors.bgGradient} style={styles.gradient}>
      {ambient && (
        <View style={styles.ambient} pointerEvents="none">
          <View
            style={[
              styles.glow,
              styles.glowOuter,
              { backgroundColor: colors.primaryFaint },
            ]}
          />
          <View
            style={[
              styles.glow,
              styles.glowInner,
              { backgroundColor: colors.primarySoft },
            ]}
          />
        </View>
      )}
      <SafeAreaView style={[styles.container, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambient: {
    position: 'absolute',
    top: -200,
    left: 0,
    right: 0,
    height: 520,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  glowOuter: {
    width: 560,
    height: 560,
    borderRadius: 280,
  },
  glowInner: {
    width: 320,
    height: 320,
    borderRadius: 160,
  },
});
