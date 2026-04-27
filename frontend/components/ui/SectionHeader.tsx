import React from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle, StyleProp } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration } from '../../constants/motion';
import { Spacing } from '../../constants/spacing';
import { haptic } from '../../utils/haptics';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  onBack,
  trailing,
  style,
}) => {
  const colors = useThemeColors();

  return (
    <Animated.View
      entering={FadeInDown.duration(Duration.slow).springify().damping(20)}
      style={[styles.container, style]}
    >
      {onBack && (
        <Pressable
          onPress={() => {
            haptic.light();
            onBack();
          }}
          hitSlop={12}
          style={[
            styles.backButton,
            { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
      )}
      <View style={styles.titleBlock}>
        {eyebrow && (
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow.toUpperCase()}</Text>
        )}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.bold.fontWeight,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: Fonts.sizes.xxxl + 6,
  },
  subtitle: {
    fontSize: Fonts.sizes.md,
    marginTop: 6,
    lineHeight: 20,
  },
  trailing: {
    marginLeft: Spacing.sm,
    alignSelf: 'center',
  },
});

export default SectionHeader;
