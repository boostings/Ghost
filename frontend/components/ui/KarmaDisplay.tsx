import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spring } from '../../constants/motion';
import { haptic } from '../../utils/haptics';
import { VoteType } from '../../types';

type KarmaSize = 'small' | 'normal';

interface KarmaDisplayProps {
  score: number;
  userVote?: VoteType | null;
  onUpvote: () => void;
  onDownvote: () => void;
  size?: KarmaSize;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  const scoreColor = score > 0 ? '#00C851' : score < 0 ? '#FF4444' : Colors.text;
  const upvoteColor = userVote === 'UPVOTE' ? '#00C851' : Colors.textMuted;
  const downvoteColor = userVote === 'DOWNVOTE' ? '#FF4444' : Colors.textMuted;

  const upScale = useSharedValue(1);
  const downScale = useSharedValue(1);
  const scoreScale = useSharedValue(1);

  const upStyle = useAnimatedStyle(() => ({ transform: [{ scale: upScale.value }] }));
  const downStyle = useAnimatedStyle(() => ({ transform: [{ scale: downScale.value }] }));
  const scoreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scoreScale.value }] }));

  const pop = (sv: typeof upScale) => {
    sv.value = withSequence(withSpring(1.25, Spring.press), withSpring(1, Spring.press));
    scoreScale.value = withSequence(withSpring(1.15, Spring.press), withSpring(1, Spring.press));
  };

  const handleUp = () => {
    haptic.medium();
    pop(upScale);
    onUpvote();
  };
  const handleDown = () => {
    haptic.medium();
    pop(downScale);
    onDownvote();
  };

  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <AnimatedPressable
        onPress={handleUp}
        hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
        style={[styles.arrowButton, upStyle]}
        accessibilityRole="button"
        accessibilityLabel="Upvote"
      >
        <Text style={[styles.arrow, { fontSize: arrowSize, color: upvoteColor }]}>▲</Text>
      </AnimatedPressable>

      <Animated.Text style={[styles.score, { fontSize: scoreSize, color: scoreColor }, scoreStyle]}>
        {score}
      </Animated.Text>

      <AnimatedPressable
        onPress={handleDown}
        hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
        style={[styles.arrowButton, downStyle]}
        accessibilityRole="button"
        accessibilityLabel="Downvote"
      >
        <Text style={[styles.arrow, { fontSize: arrowSize, color: downvoteColor }]}>▼</Text>
      </AnimatedPressable>
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
