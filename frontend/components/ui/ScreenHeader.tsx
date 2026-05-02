import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import IconButton from './IconButton';

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
  border?: boolean;
};

export default function ScreenHeader({
  title,
  subtitle,
  rightElement,
  onBack,
  style,
  border = true,
}: ScreenHeaderProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      style={[
        styles.header,
        border && { borderBottomColor: colors.surfaceBorder, borderBottomWidth: StyleSheet.hairlineWidth },
        style,
      ]}
    >
      <IconButton
        name="chevron-back"
        onPress={handleBack}
        accessibilityLabel="Go back"
        size={21}
      />

      <View style={styles.titleBlock}>
        {title ? (
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightSlot}>{rightElement}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: Fonts.sizes.sm,
    marginTop: 2,
  },
  rightSlot: {
    minWidth: 42,
    minHeight: 42,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
