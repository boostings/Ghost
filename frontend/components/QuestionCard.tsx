import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { enterList } from '../constants/motion';
import { Spacing } from '../constants/spacing';
import { haptic } from '../utils/haptics';
import { isQuestionEdited } from '../utils/questionMeta';
import { QuestionResponse } from '../types';
import GlassCard from './ui/GlassCard';
import Avatar from './ui/Avatar';
import TopicBadge from './ui/TopicBadge';
import StatusBadge from './ui/StatusBadge';
import KarmaDisplay from './ui/KarmaDisplay';

interface QuestionCardProps {
  question: QuestionResponse;
  onPress: () => void;
  onUpvote: () => void;
  onDownvote: () => void;
  onBookmark?: () => void;
  onReport?: () => void;
  currentUserId?: string;
  index?: number;
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function parseAuthorName(authorName: string): { firstName: string; lastName: string } {
  const parts = authorName.trim().split(' ');
  const firstName = parts[0] || '';
  const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
  return { firstName, lastName };
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onPress,
  onUpvote,
  onDownvote,
  onBookmark,
  onReport,
  currentUserId,
  index = 0,
}) => {
  const colors = useThemeColors();
  const { firstName, lastName } = parseAuthorName(question.authorName);
  const canReport = Boolean(onReport && question.authorId !== currentUserId);
  const wasEdited = isQuestionEdited(question);
  const questionAccessibilityLabel = [
    `Open question: ${question.title}`,
    `By ${question.authorName}`,
    question.status === 'CLOSED' ? 'Closed' : 'Open',
    `${question.karmaScore} karma`,
    `${question.commentCount} ${question.commentCount === 1 ? 'comment' : 'comments'}`,
  ].join('. ');

  return (
    <Animated.View entering={enterList(index)} layout={LinearTransition.springify().damping(20)}>
      <GlassCard
        onPress={onPress}
        style={styles.card}
        accessibilityLabel={questionAccessibilityLabel}
      >
        {question.isHidden && (
          <View style={[styles.hiddenOverlay, { backgroundColor: colors.overlay }]}>
            <Text style={[styles.hiddenText, { color: colors.textMuted }]}>HIDDEN</Text>
          </View>
        )}

        <View style={styles.topRow}>
          <View style={styles.badges}>
            {question.topicName && (
              <TopicBadge name={question.topicName} style={styles.topicBadge} />
            )}
            <StatusBadge status={question.status} />
          </View>
          {question.isPinned && (
            <View
              style={[
                styles.pinChip,
                { backgroundColor: colors.primarySoft, borderColor: colors.primaryFaint },
              ]}
            >
              <Ionicons name="pin" size={12} color={colors.primary} />
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {question.title}
        </Text>

        {wasEdited && <Text style={[styles.editedText, { color: colors.textMuted }]}>Edited</Text>}

        <Text style={[styles.body, { color: colors.textMuted }]} numberOfLines={3}>
          {question.isHidden ? '[hidden]' : question.body}
        </Text>

        {question.verifiedAnswerId && question.verifiedAnswerPreview ? (
          <View
            style={[
              styles.answerStripe,
              {
                backgroundColor: `${colors.verifiedAnswer}1A`,
                borderColor: `${colors.verifiedAnswer}4D`,
              },
            ]}
          >
            <View style={styles.answerStripeHeader}>
              <Ionicons name="checkmark-circle" size={14} color={colors.verifiedAnswer} />
              <Text style={[styles.answerStripeLabel, { color: colors.verifiedAnswer }]}>
                Answered
                {question.verifiedAnswerAuthorName
                  ? ` by ${question.verifiedAnswerAuthorName}`
                  : ''}
              </Text>
            </View>
            <Text style={[styles.answerStripeBody, { color: colors.text }]} numberOfLines={2}>
              {question.verifiedAnswerPreview}
            </Text>
          </View>
        ) : null}

        <View style={[styles.bottomRow, { borderTopColor: colors.surfaceBorder }]}>
          <View style={styles.authorSection}>
            <Avatar firstName={firstName} lastName={lastName} size={28} />
            <View style={styles.authorMeta}>
              <Text style={[styles.authorName, { color: colors.textSecondary }]} numberOfLines={1}>
                {question.authorName}
              </Text>
              <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                {formatTimestamp(question.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.actionsSection}>
            <KarmaDisplay
              score={question.karmaScore}
              userVote={question.userVote}
              onUpvote={onUpvote}
              onDownvote={onDownvote}
              size="small"
            />

            <View style={styles.commentCount}>
              <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.commentText, { color: colors.textMuted }]}>
                {question.commentCount}
              </Text>
            </View>

            {onBookmark && (
              <Pressable
                onPress={() => {
                  haptic.selection();
                  onBookmark();
                }}
                hitSlop={8}
                style={styles.iconAction}
                accessibilityRole="button"
                accessibilityLabel={question.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                <Ionicons
                  name={question.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={16}
                  color={question.isBookmarked ? colors.primary : colors.textMuted}
                />
              </Pressable>
            )}

            {canReport && (
              <Pressable
                onPress={() => {
                  haptic.warning();
                  onReport?.();
                }}
                hitSlop={8}
                style={styles.iconAction}
                accessibilityRole="button"
                accessibilityLabel="Report question"
              >
                <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  hiddenOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.bold.fontWeight,
    letterSpacing: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 22,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  topicBadge: {
    marginRight: 0,
  },
  pinChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  editedText: {
    fontSize: Fonts.sizes.xs,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  body: {
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.regular.fontWeight,
    lineHeight: 20,
    marginBottom: 14,
  },
  answerStripe: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  answerStripeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  answerStripeLabel: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  answerStripeBody: {
    fontSize: Fonts.sizes.sm,
    lineHeight: 19,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '46%',
  },
  authorMeta: {
    marginLeft: 8,
    flexShrink: 1,
  },
  authorName: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.semiBold.fontWeight,
  },
  timestamp: {
    fontSize: Fonts.sizes.xs,
    marginTop: 1,
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.medium.fontWeight,
    fontVariant: ['tabular-nums'],
  },
  iconAction: {
    padding: 2,
  },
});

export default QuestionCard;
