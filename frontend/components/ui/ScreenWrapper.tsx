import React from 'react';
import { StyleSheet, ActivityIndicator, type ViewStyle, type StyleProp } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../constants/colors';

interface ScreenWrapperProps {
  children: React.ReactNode;
  edges?: Edge[];
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function ScreenWrapper({
  children,
  edges = ['top'],
  loading = false,
  style,
}: ScreenWrapperProps) {
  const colors = useThemeColors();

  if (loading) {
    return (
      <LinearGradient colors={[colors.background, colors.background]} style={styles.gradient}>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.background, colors.background]} style={styles.gradient}>
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
});
