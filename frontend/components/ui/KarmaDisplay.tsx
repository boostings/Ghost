import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { VoteType } from '../../types';

type KarmaSize = 'small' | 'normal';

interface KarmaDisplayProps {
  score: number;
  userVote?: VoteType | null;
  onUpvote: () => void;
  onDownvote: () => void;
  size?: KarmaSize;
}

const KarmaDisplay: React.FC<KarmaDisplayProps> = ({
  score,
  userVote = null,
  onUpvote,
  onDownvote,
  size = 'normal',
}) => {
  const isSmall = size === 'small';
  const arrowSize = isSmall ? Fonts.sizes.md : Fonts.sizes.xl;
  const scoreSize = isSmall ? Fonts.sizes.sm : Fonts.sizes.lg;

  const scoreColor =
    score > 0 ? '#00C851' : score < 0 ? '#FF4444' : Colors.text;

  const upvoteColor =
    userVote === 'UPVOTE' ? '#00C851' : Colors.textMuted;

  const downvoteColor =
    userVote === 'DOWNVOTE' ? '#FF4444' : Colors.textMuted;

  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <TouchableOpacity
        onPress={onUpvote}
        hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
        style={styles.arrowButton}
        accessibilityRole="button"
        accessibilityLabel="Upvote"
      >
        <Text style={[styles.arrow, { fontSize: arrowSize, color: upvoteColor }]}>
          ▲
        </Text>
      </TouchableOpacity>

      <Text
        style={[
          styles.score,
          { fontSize: scoreSize, color: scoreColor },
        ]}
      >
        {score}
      </Text>

      <TouchableOpacity
        onPress={onDownvote}
        hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
        style={styles.arrowButton}
        accessibilityRole="button"
        accessibilityLabel="Downvote"
      >
        <Text style={[styles.arrow, { fontSize: arrowSize, color: downvoteColor }]}>
          ▼
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 36,
  },
  containerSmall: {
    minWidth: 28,
    paddingVertical: 2,
  },
  arrowButton: {
    padding: 2,
    alignItems: 'center',
  },
  arrow: {
    textAlign: 'center',
  },
  score: {
    fontWeight: Fonts.bold.fontWeight,
    textAlign: 'center',
    marginVertical: 2,
  },
});

export default KarmaDisplay;
