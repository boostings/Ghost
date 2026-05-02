import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  LinearTransition,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { enterList } from '../constants/motion';
import { Spacing } from '../constants/spacing';
import { haptic } from '../utils/haptics';
import { formatTimestamp } from '../utils/formatTimestamp';
import { CommentResponse } from '../types';
import GlassCard from './ui/GlassCard';
import Avatar from './ui/Avatar';
import KarmaDisplay from './ui/KarmaDisplay';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const reduceMotion = useReducedMotion();
  const verifyScale = useSharedValue(1);
  const verifiedBadgeScale = useSharedValue(1);
  const verifiedPulseOpacity = useSharedValue(0);
  const { firstName, lastName } = parseAuthorName(comment.authorName);
  const verified = comment.isVerifiedAnswer;
  const verifyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: verifyScale.value }],
  }));
  const verifiedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: verifiedBadgeScale.value }],
  }));
  const verifiedPulseStyle = useAnimatedStyle(() => ({
    opacity: verifiedPulseOpacity.value,
  }));

  React.useEffect(() => {
    if (!verified || reduceMotion) {
      verifiedBadgeScale.value = 1;
      verifiedPulseOpacity.value = 0;
      return;
    }

    verifiedBadgeScale.value = 0.94;
    verifiedBadgeScale.value = withSpring(1, { damping: 12, stiffness: 260 });
    verifiedPulseOpacity.value = 0.42;
    verifiedPulseOpacity.value = withTiming(0, { duration: 600 });
  }, [reduceMotion, verified, verifiedBadgeScale, verifiedPulseOpacity]);
  // Hibernate sets created/updated to the same instant on insert (off by ms),
  // and verifying a comment bumps updatedAt without an actual body edit. So
  // require a non-trivial gap AND skip the badge when the comment is verified.
  const wasEdited =
    !verified &&
    new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000;

  return (
    <Animated.View entering={enterList(index)} layout={LinearTransition.springify().damping(20)}>
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
          <Animated.View
            pointerEvents="none"
            style={[
              styles.verifiedPulseOverlay,
              { borderColor: colors.verifiedAnswer },
              verifiedPulseStyle,
            ]}
          />
        )}
        {verified && (
          <Animated.View
            style={[
              styles.verifiedBadge,
              {
                backgroundColor: `${colors.verifiedAnswer}26`,
                borderColor: `${colors.verifiedAnswer}44`,
              },
              verifiedBadgeStyle,
            ]}
          >
            <Ionicons name="checkmark-circle" size={14} color={colors.verifiedAnswer} />
            <Text style={[styles.verifiedText, { color: colors.verifiedAnswer }]}>
              {comment.verifiedByName ? `Verified by ${comment.verifiedByName}` : 'Verified Answer'}
            </Text>
          </Animated.View>
        )}

        <View style={styles.header}>
          <View style={styles.authorRow}>
            <Avatar firstName={firstName} lastName={lastName} size={32} />
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: colors.text }]}>{comment.authorName}</Text>
              <View style={styles.timestampRow}>
                <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                  {formatTimestamp(comment.createdAt)}
                </Text>
                {wasEdited && (
                  <Text style={[styles.editedLabel, { color: colors.textMuted }]}> · edited</Text>
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
            direction="horizontal"
          />

          <View style={styles.actions}>
            {onVerify && !verified && (
              <AnimatedPressable
                onPress={() => {
                  haptic.success();
                  onVerify();
                }}
                onPressIn={() => {
                  verifyScale.value = withSpring(0.96, { damping: 18, stiffness: 260 });
                }}
                onPressOut={() => {
                  verifyScale.value = withSpring(1, { damping: 16, stiffness: 220 });
                }}
                style={[
                  styles.actionButton,
                  styles.verifyActionButton,
                  {
                    backgroundColor: 'transparent',
                    borderColor: `${colors.verifiedAnswer}40`,
                  },
                  verifyStyle,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Mark comment as answer"
              >
                <Ionicons name="checkmark" size={14} color={colors.verifiedAnswer} />
                <Text style={[styles.verifyActionText, { color: colors.verifiedAnswer }]}>
                  Mark as Answer
                </Text>
              </AnimatedPressable>
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
  verifiedPulseOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
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
  verifyActionButton: {
    borderWidth: 1,
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
