import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spring } from '../../constants/motion';
import { haptic } from '../../utils/haptics';
import { VoteType } from '../../types';

type KarmaSize = 'small' | 'normal';
type KarmaDirection = 'vertical' | 'horizontal';

interface KarmaDisplayProps {
  score: number;
  userVote?: VoteType | null;
  onUpvote: () => void;
  onDownvote: () => void;
  size?: KarmaSize;
  direction?: KarmaDirection;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const KarmaDisplay: React.FC<KarmaDisplayProps> = ({
  score,
  userVote = null,
  onUpvote,
  onDownvote,
  size = 'normal',
  direction = 'vertical',
}) => {
  const colors = useThemeColors();
  const isSmall = size === 'small';
  const arrowSize = isSmall ? 14 : 18;
  const scoreSize = isSmall ? Fonts.sizes.sm : Fonts.sizes.lg;

  const scoreColor = score > 0 ? colors.upvote : score < 0 ? colors.downvote : colors.text;
  const upvoteColor = userVote === 'UPVOTE' ? colors.upvote : colors.textMuted;
  const downvoteColor = userVote === 'DOWNVOTE' ? colors.downvote : colors.textMuted;

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

  const isHorizontal = direction === 'horizontal';

  return (
    <View
      style={[
        styles.container,
        isSmall && styles.containerSmall,
        isHorizontal && styles.containerHorizontal,
      ]}
    >
      <AnimatedPressable
        onPress={handleUp}
        hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
        style={[styles.arrowButton, upStyle]}
        accessibilityRole="button"
        accessibilityLabel="Upvote"
      >
        <Ionicons name="chevron-up" size={arrowSize} color={upvoteColor} />
      </AnimatedPressable>

      <Animated.Text
        style={[
          styles.score,
          { fontSize: scoreSize, color: scoreColor },
          isHorizontal && styles.scoreHorizontal,
          scoreStyle,
        ]}
      >
        {score}
      </Animated.Text>

      <AnimatedPressable
        onPress={handleDown}
        hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
        style={[styles.arrowButton, downStyle]}
        accessibilityRole="button"
        accessibilityLabel="Downvote"
      >
        <Ionicons name="chevron-down" size={arrowSize} color={downvoteColor} />
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
  containerHorizontal: {
    flexDirection: 'row',
    paddingVertical: 0,
    minWidth: 0,
  },
  scoreHorizontal: {
    marginVertical: 0,
    marginHorizontal: 6,
  },
  arrowButton: {
    padding: 2,
    alignItems: 'center',
  },
  score: {
    fontWeight: Fonts.bold.fontWeight,
    textAlign: 'center',
    marginVertical: 2,
    fontVariant: ['tabular-nums'],
  },
});

export default KarmaDisplay;
