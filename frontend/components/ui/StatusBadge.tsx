import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Fonts } from '../../constants/fonts';
import { QuestionStatus } from '../../types';

interface StatusBadgeProps {
  status: QuestionStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const isOpen = status === 'OPEN';

  return (
    <View
      style={[
        styles.badge,
        isOpen ? styles.openBadge : styles.closedBadge,
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: isOpen ? '#00C851' : '#FF6584' },
        ]}
      />
      <Text
        style={[
          styles.text,
          { color: isOpen ? '#00C851' : '#FF6584' },
        ]}
      >
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
  openBadge: {
    backgroundColor: 'rgba(0,200,81,0.15)',
  },
  closedBadge: {
    backgroundColor: 'rgba(255,101,132,0.15)',
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
