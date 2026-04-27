import React from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

interface TopicBadgeProps {
  name: string;
  isDefault?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TopicBadge: React.FC<TopicBadgeProps> = ({ name, isDefault = false, style }) => {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isDefault ? colors.primarySoft : colors.primaryFaint,
          borderColor: isDefault ? 'transparent' : colors.primarySoft,
          borderWidth: isDefault ? 0 : StyleSheet.hairlineWidth,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: colors.primary }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.semiBold.fontWeight,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});

export default TopicBadge;
