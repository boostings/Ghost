import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';
import { Fonts } from '../../constants/fonts';

interface AvatarProps {
  firstName: string;
  lastName: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const AVATAR_PALETTE = [
  '#BB2744', // Crimson
  '#D4556D', // Rose
  '#00C9A7', // Teal
  '#FF9A56', // Orange
  '#845EC2', // Purple
  '#FF6F91', // Pink
  '#00C2A8', // Mint
  '#4B8BBE', // Blue
  '#C34A36', // Terracotta
  '#FF8066', // Coral
  '#00B8A9', // Cyan
  '#F9A825', // Amber
] as const;

function hashName(firstName: string, lastName: string): number {
  const str = `${firstName}${lastName}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0).toUpperCase();
  const last = lastName.trim().charAt(0).toUpperCase();
  return `${first}${last}`;
}

const Avatar: React.FC<AvatarProps> = ({ firstName, lastName, size = 40, style }) => {
  const backgroundColor = useMemo(() => {
    const hash = hashName(firstName, lastName);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  }, [firstName, lastName]);

  const initials = useMemo(() => getInitials(firstName, lastName), [firstName, lastName]);

  const fontSize = size * 0.38;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize, lineHeight: fontSize * 1.2 }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: Fonts.bold.fontWeight,
    textAlign: 'center',
  },
});

export default Avatar;
