import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Ease, Stagger } from '../../constants/motion';
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
  const reduceMotion = useReducedMotion();
  const breathScale = useSharedValue(1);

  React.useEffect(() => {
    if (reduceMotion) {
      breathScale.value = 1;
      return;
    }

    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000, easing: Ease.inOut }),
        withTiming(1, { duration: 2000, easing: Ease.inOut })
      ),
      -1,
      false
    );
  }, [breathScale, reduceMotion]);

  const breathingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(Duration.slow).delay(Stagger.hero)}
      style={styles.container}
    >
      {ionIcon && (
        <Animated.View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.primarySoft, borderColor: colors.primaryFaint },
            breathingStyle,
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
        </Animated.View>
      )}
      {!ionIcon && icon && (
        <Animated.View style={breathingStyle} accessible={false} importantForAccessibility="no">
          <Text style={styles.emoji}>{icon}</Text>
        </Animated.View>
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
