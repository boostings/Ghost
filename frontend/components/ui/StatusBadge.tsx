import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Fonts } from '../../constants/fonts';
import { useThemeColors } from '../../constants/colors';
import { QuestionStatus } from '../../types';

interface StatusBadgeProps {
  status: QuestionStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colors = useThemeColors();
  const isOpen = status === 'OPEN';
  const accent = isOpen ? colors.openStatus : colors.closedStatus;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${accent}1F`,
          borderColor: `${accent}33`,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text style={[styles.text, { color: accent }]}>{status}</Text>
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
