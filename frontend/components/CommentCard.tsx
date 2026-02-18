import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
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
}) => {
  const { firstName, lastName } = parseAuthorName(comment.authorName);
  const wasEdited = comment.updatedAt !== comment.createdAt;

  return (
    <GlassCard
      style={[
        styles.card,
        comment.isVerifiedAnswer && styles.verifiedCard,
      ]}
    >
      {/* Verified Answer Badge */}
      {comment.isVerifiedAnswer && (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedCheckmark}>✓</Text>
          <Text style={styles.verifiedText}>Verified Answer</Text>
        </View>
      )}

      {/* Header: Avatar + Name + Timestamp */}
      <View style={styles.header}>
        <View style={styles.authorRow}>
          <Avatar firstName={firstName} lastName={lastName} size={32} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{comment.authorName}</Text>
            <View style={styles.timestampRow}>
              <Text style={styles.timestamp}>
                {formatTimestamp(comment.createdAt)}
              </Text>
              {wasEdited && (
                <Text style={styles.editedLabel}> (edited)</Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Body */}
      <Text style={styles.body}>{comment.body}</Text>

      {/* Bottom Row: Karma + Actions */}
      <View style={styles.bottomRow}>
        <KarmaDisplay
          score={comment.karmaScore}
          userVote={comment.userVote}
          onUpvote={onUpvote}
          onDownvote={onDownvote}
          size="small"
        />

        <View style={styles.actions}>
          {/* Verify Button (faculty only) */}
          {onVerify && !comment.isVerifiedAnswer && (
            <TouchableOpacity onPress={onVerify} style={styles.actionButton}>
              <Text style={styles.verifyActionText}>✓ Verify</Text>
            </TouchableOpacity>
          )}

          {/* Edit Button (own comment, within edit window) */}
          {isCurrentUser && comment.canEdit && onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
          )}

          {/* Delete Button (own comment) */}
          {isCurrentUser && onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
              <Text style={styles.dangerActionText}>Delete</Text>
            </TouchableOpacity>
          )}

          {/* Report Button (not own comment) */}
          {!isCurrentUser && onReport && (
            <TouchableOpacity onPress={onReport} style={styles.actionButton}>
              <Text style={styles.actionText}>Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  verifiedCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#00C851',
    backgroundColor: 'rgba(0,200,81,0.06)',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,200,81,0.15)',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  verifiedCheckmark: {
    color: '#00C851',
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.bold.fontWeight,
    marginRight: 4,
  },
  verifiedText: {
    color: '#00C851',
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.semiBold.fontWeight,
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
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.semiBold.fontWeight,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timestamp: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.regular.fontWeight,
  },
  editedLabel: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.xs,
    fontStyle: 'italic',
  },
  body: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.regular.fontWeight,
    lineHeight: 22,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actionText: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.medium.fontWeight,
  },
  dangerActionText: {
    color: '#FF4444',
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.medium.fontWeight,
  },
  verifyActionText: {
    color: '#00C851',
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.semiBold.fontWeight,
  },
});

export default CommentCard;
