import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { enterList } from '../constants/motion';
import { Spacing } from '../constants/spacing';
import { haptic } from '../utils/haptics';
import { CommentResponse } from '../types';
import GlassCard from './ui/GlassCard';
import Avatar from './ui/Avatar';
import KarmaDisplay from './ui/KarmaDisplay';

interface CommentCardProps {
  comment: CommentResponse;
  onUpvote: () => void;
  onDownvote: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onVerify?: () => void;
  isCurrentUser?: boolean;
  canDelete?: boolean;
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

const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  onUpvote,
  onDownvote,
  onEdit,
  onDelete,
  onReport,
  onVerify,
  isCurrentUser = false,
  canDelete,
  index = 0,
}) => {
  const colors = useThemeColors();
  const { firstName, lastName } = parseAuthorName(comment.authorName);
  const wasEdited =
    new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000;
  const verified = comment.isVerifiedAnswer;

  return (
    <Animated.View
      entering={enterList(index)}
      layout={LinearTransition.springify().damping(20)}
    >
      <GlassCard
        style={[
          styles.card,
          verified && {
            borderLeftWidth: 3,
            borderLeftColor: colors.verifiedAnswer,
            backgroundColor: `${colors.verifiedAnswer}0F`,
          },
        ]}
      >
        {verified && (
          <View
            style={[
              styles.verifiedBadge,
              {
                backgroundColor: `${colors.verifiedAnswer}26`,
                borderColor: `${colors.verifiedAnswer}44`,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={14} color={colors.verifiedAnswer} />
            <Text style={[styles.verifiedText, { color: colors.verifiedAnswer }]}>
              {comment.verifiedByName ? `Verified by ${comment.verifiedByName}` : 'Verified Answer'}
            </Text>
          </View>
        )}

        <View style={styles.header}>
          <View style={styles.authorRow}>
            <Avatar firstName={firstName} lastName={lastName} size={32} />
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: colors.text }]}>
                {comment.authorName}
              </Text>
              <View style={styles.timestampRow}>
                <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                  {formatTimestamp(comment.createdAt)}
                </Text>
                {wasEdited && (
                  <Text style={[styles.editedLabel, { color: colors.textMuted }]}>
                    {' '}
                    · edited
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <Text style={[styles.body, { color: colors.textSecondary }]}>{comment.body}</Text>

        <View style={[styles.bottomRow, { borderTopColor: colors.surfaceBorder }]}>
          <KarmaDisplay
            score={comment.karmaScore}
            userVote={comment.userVote}
            onUpvote={onUpvote}
            onDownvote={onDownvote}
            size="small"
          />

          <View style={styles.actions}>
            {onVerify && !verified && (
              <Pressable
                onPress={() => {
                  haptic.success();
                  onVerify();
                }}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: `${colors.verifiedAnswer}1F`,
                    borderColor: `${colors.verifiedAnswer}40`,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Verify answer"
              >
                <Ionicons name="checkmark" size={14} color={colors.verifiedAnswer} />
                <Text
                  style={[
                    styles.verifyActionText,
                    { color: colors.verifiedAnswer },
                  ]}
                >
                  Verify
                </Text>
              </Pressable>
            )}

            {isCurrentUser && comment.canEdit && onEdit && (
              <Pressable
                onPress={() => {
                  haptic.selection();
                  onEdit();
                }}
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Edit comment"
              >
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>Edit</Text>
              </Pressable>
            )}

            {(canDelete ?? isCurrentUser) && onDelete && (
              <Pressable
                onPress={() => {
                  haptic.warning();
                  onDelete();
                }}
                style={[
                  styles.actionButton,
                  { backgroundColor: `${colors.error}14`, borderColor: `${colors.error}33` },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Delete comment"
              >
                <Text style={[styles.dangerActionText, { color: colors.error }]}>Delete</Text>
              </Pressable>
            )}

            {!isCurrentUser && onReport && (
              <Pressable
                onPress={() => {
                  haptic.warning();
                  onReport();
                }}
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Report comment"
              >
                <Text style={[styles.actionText, { color: colors.textMuted }]}>Report</Text>
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
    marginBottom: Spacing.sm + 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  verifiedText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.semiBold.fontWeight,
    letterSpacing: 0.3,
  },
  header: {
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorInfo: {
    marginLeft: 10,
  },
  authorName: {
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.semiBold.fontWeight,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timestamp: {
    fontSize: Fonts.sizes.xs,
  },
  editedLabel: {
    fontSize: Fonts.sizes.xs,
    fontStyle: 'italic',
  },
  body: {
    fontSize: Fonts.sizes.md,
    lineHeight: 22,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.medium.fontWeight,
  },
  dangerActionText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.semiBold.fontWeight,
  },
  verifyActionText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.semiBold.fontWeight,
  },
});

export default CommentCard;
