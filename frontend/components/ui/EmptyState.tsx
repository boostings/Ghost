import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Stagger } from '../../constants/motion';
import { Spacing } from '../../constants/spacing';
import GlassButton from './GlassButton';

interface EmptyStateProps {
  icon?: string; // emoji passthrough (legacy)
  ionIcon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  ionIcon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  const colors = useThemeColors();

  return (
    <Animated.View
      entering={FadeIn.duration(Duration.slow).delay(Stagger.hero)}
      style={styles.container}
    >
      {ionIcon && (
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.primarySoft, borderColor: colors.primaryFaint },
          ]}
          accessible={false}
          importantForAccessibility="no"
        >
          <Ionicons
            name={ionIcon}
            size={36}
            color={colors.primary}
            accessible={false}
            importantForAccessibility="no"
          />
        </View>
      )}
      {!ionIcon && icon && (
        <Text style={styles.emoji} accessible={false} importantForAccessibility="no">
          {icon}
        </Text>
      )}
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <View style={styles.actionContainer}>
          <GlassButton title={actionLabel} onPress={onAction} variant="primary" solid />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  emoji: {
    fontSize: 56,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.bold.fontWeight,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.regular.fontWeight,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  actionContainer: {
    alignSelf: 'center',
    width: 240,
    marginTop: Spacing.xxl,
  },
});

export default EmptyState;
