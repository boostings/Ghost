import React from 'react';
import { StyleSheet, View, Text, useColorScheme } from 'react-native';
import { Fonts } from '../../constants/fonts';
import { type DisplayQuestionStatus, STATUS_COLORS } from '../../constants/colors';
import type { QuestionStatus } from '../../types';

interface StatusBadgeProps {
  status: QuestionStatus | DisplayQuestionStatus;
  label?: string;
  accentColor?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, accentColor }) => {
  const colorScheme = useColorScheme();
  const config = STATUS_COLORS[status as DisplayQuestionStatus] ?? STATUS_COLORS.CLOSED;
  const accent = accentColor ?? (colorScheme === 'dark' ? config.fgDark : config.fg);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label ?? config.label} status`}
      style={[
        styles.badge,
        {
          backgroundColor: accentColor ? `${accent}1F` : config.bg,
          borderColor: `${accent}33`,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text style={[styles.text, { color: accent }]}>{label ?? config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.bold.fontWeight,
    letterSpacing: 0.6,
  },
});

export default StatusBadge;
