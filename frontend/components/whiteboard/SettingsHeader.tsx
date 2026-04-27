import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import IconButton from '../ui/IconButton';

type SettingsHeaderProps = {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
};

export default function SettingsHeader({ title, subtitle, rightElement }: SettingsHeaderProps) {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
      <IconButton
        name="chevron-back"
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        size={20}
      />

      <View style={styles.titleBlock}>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    minWidth: 38,
    minHeight: 38,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
