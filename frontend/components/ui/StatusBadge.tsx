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

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: isOpen ? `${colors.openStatus}26` : `${colors.closedStatus}26` },
      ]}
    >
      <View
        style={[styles.dot, { backgroundColor: isOpen ? colors.openStatus : colors.closedStatus }]}
      />
      <Text style={[styles.text, { color: isOpen ? colors.openStatus : colors.closedStatus }]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
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
    letterSpacing: 0.5,
  },
});

export default StatusBadge;
