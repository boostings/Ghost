import React from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

interface TopicBadgeProps {
  name: string;
  isDefault?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TopicBadge: React.FC<TopicBadgeProps> = ({ name, isDefault = false, style }) => {
  return (
    <View style={[styles.badge, isDefault ? styles.defaultBadge : styles.customBadge, style]}>
      <Text
        style={[styles.text, isDefault ? styles.defaultText : styles.customText]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  defaultBadge: {
    backgroundColor: 'rgba(187,39,68,0.3)',
  },
  customBadge: {
    backgroundColor: 'rgba(187,39,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.4)',
  },
  text: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.medium.fontWeight,
  },
  defaultText: {
    color: Colors.primary,
  },
  customText: {
    color: Colors.primaryLight,
  },
});

export default TopicBadge;
