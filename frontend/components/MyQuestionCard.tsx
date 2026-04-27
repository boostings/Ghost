import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'react-native';
import { useThemeColors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { PRESSED_SCALE, Spring } from '../constants/motion';
import { Radius, Spacing } from '../constants/spacing';
import { haptic } from '../utils/haptics';
import { AnimatedIcon } from './AnimatedIcon';
import type { QuestionResponse } from '../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MyQuestionCardProps {
  question: QuestionResponse;
  variant: 'awaiting' | 'answered';
  onPress: (question: QuestionResponse) => void;
}

const CARD_WIDTH = 260;

export const MyQuestionCard: React.FC<MyQuestionCardProps> = ({ question, variant, onPress }) => {
  const colorScheme = useColorScheme();
  const colors = useThemeColors();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    haptic.light();
    scale.value = withSpring(PRESSED_SCALE, Spring.press);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, Spring.press);
  };

  const isAnswered = variant === 'answered';
  const stripeColor = isAnswered ? colors.verifiedAnswer : colors.warning;
  const stripeBg = `${stripeColor}26`;
  const stripeBorder = `${stripeColor}40`;
  const stripeLabel = isAnswered ? 'Answered' : 'Awaiting answer';
  const stripeIcon = isAnswered ? 'checkmark-circle' : 'time-outline';

  return (
    <AnimatedPressable
      style={[styles.wrapper, animatedStyle]}
      onPress={() => onPress(question)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`${stripeLabel}: ${question.title}`}
    >
      <BlurView
        intensity={60}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}
      >
        <View style={styles.header}>
          {question.whiteboardCourseCode ? (
            <View
              style={[
                styles.codeChip,
                { backgroundColor: colors.primarySoft, borderColor: colors.primaryFaint },
              ]}
            >
              <Text style={[styles.codeText, { color: colors.primary }]} numberOfLines={1}>
                {question.whiteboardCourseCode}
              </Text>
            </View>
          ) : null}
          {question.topicName ? (
            <Text style={[styles.topic, { color: colors.textMuted }]} numberOfLines={1}>
              {question.topicName}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
          {question.title}
        </Text>

        <View style={[styles.stripe, { backgroundColor: stripeBg, borderColor: stripeBorder }]}>
          <AnimatedIcon name={stripeIcon} size={14} color={stripeColor} motion="none" />
          <Text style={[styles.stripeLabel, { color: stripeColor }]} numberOfLines={1}>
            {stripeLabel}
          </Text>
          {question.commentCount > 0 ? (
            <Text style={[styles.commentCount, { color: colors.textMuted }]}>
              · {question.commentCount} {question.commentCount === 1 ? 'reply' : 'replies'}
            </Text>
          ) : null}
        </View>
      </BlurView>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    overflow: 'hidden',
    minHeight: 140,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  codeChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  codeText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topic: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '600',
    flexShrink: 1,
  },
  title: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: Fonts.sizes.md + 4,
    marginBottom: 12,
  },
  stripe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stripeLabel: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  commentCount: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '500',
  },
});

export default MyQuestionCard;
