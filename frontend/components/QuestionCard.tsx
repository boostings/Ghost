import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Duration } from '../constants/motion';
import { haptic } from '../utils/haptics';
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
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

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
}) => {
  const { firstName, lastName } = parseAuthorName(question.authorName);

  return (
    <Animated.View
      entering={FadeInDown.duration(Duration.slow).springify().damping(18)}
      layout={LinearTransition.duration(Duration.slow)}
    >
      <GlassCard onPress={onPress} style={styles.card}>
        {/* Hidden overlay */}
        {question.isHidden && (
          <View style={styles.hiddenOverlay}>
            <Text style={styles.hiddenText}>[hidden]</Text>
          </View>
        )}

        {/* Top Row: Topic + Status + Pin */}
        <View style={styles.topRow}>
          <View style={styles.badges}>
            {question.topicName && (
              <TopicBadge name={question.topicName} style={styles.topicBadge} />
            )}
            <StatusBadge status={question.status} />
          </View>
          {question.isPinned && <Text style={styles.pinIcon}>📌</Text>}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {question.title}
        </Text>

        {/* Body Preview */}
        <Text style={styles.body} numberOfLines={3}>
          {question.isHidden ? '[hidden]' : question.body}
        </Text>

        {/* Bottom Row */}
        <View style={styles.bottomRow}>
          {/* Author */}
          <View style={styles.authorSection}>
            <Avatar firstName={firstName} lastName={lastName} size={28} />
            <Text style={styles.authorName} numberOfLines={1}>
              {question.authorName}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            {/* Karma */}
            <KarmaDisplay
              score={question.karmaScore}
              userVote={question.userVote}
              onUpvote={onUpvote}
              onDownvote={onDownvote}
              size="small"
            />

            {/* Comment Count */}
            <View style={styles.commentCount}>
              <Text style={styles.commentIcon}>💬</Text>
              <Text style={styles.commentText}>{question.commentCount}</Text>
            </View>

            {/* Bookmark */}
            {onBookmark && (
              <TouchableOpacity
                onPress={() => {
                  haptic.selection();
                  onBookmark();
                }}
                style={styles.bookmarkButton}
                accessibilityRole="button"
                accessibilityLabel={question.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                <Text style={styles.bookmarkIcon}>{question.isBookmarked ? '🔖' : '🏷️'}</Text>
              </TouchableOpacity>
            )}

            {/* Report */}
            {onReport && (
              <TouchableOpacity
                onPress={() => {
                  haptic.warning();
                  onReport();
                }}
                style={styles.bookmarkButton}
                accessibilityRole="button"
                accessibilityLabel="Report question"
              >
                <Text style={styles.bookmarkIcon}>{'\u{1F6A9}'}</Text>
              </TouchableOpacity>
            )}

            {/* Timestamp */}
            <Text style={styles.timestamp}>{formatTimestamp(question.createdAt)}</Text>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  hiddenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  hiddenText: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.bold.fontWeight,
    letterSpacing: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  pinIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  title: {
    color: Colors.text,
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.bold.fontWeight,
    marginBottom: 6,
    lineHeight: 24,
  },
  body: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.regular.fontWeight,
    lineHeight: 20,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '40%',
  },
  authorName: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.medium.fontWeight,
    marginLeft: 8,
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  commentText: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.medium.fontWeight,
  },
  bookmarkButton: {
    padding: 4,
  },
  bookmarkIcon: {
    fontSize: 16,
  },
  timestamp: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.regular.fontWeight,
  },
});

export default QuestionCard;
