import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import CommentCard from '../../components/CommentCard';
import ReportModal from '../../components/ReportModal';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import KarmaDisplay from '../../components/ui/KarmaDisplay';
import { AnimatedIcon } from '../../components/AnimatedIcon';
import { Colors, useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useQuestionDetailModel } from '../../hooks/useQuestionDetailModel';
import { extractErrorMessage } from '../../hooks/useApi';
import { formatFullDate } from '../../utils/formatDate';
import type { CommentResponse, VoteType } from '../../types';

export default function QuestionDetailScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { id, whiteboardId } = useLocalSearchParams<{ id: string; whiteboardId: string }>();
  const {
    commentInputRef,
    question,
    comments,
    loading,
    refreshing,
    commentText,
    editingCommentId,
    submitting,
    isBookmarked,
    loadError,
    reportModalVisible,
    reportTarget,
    isClosed,
    canEdit,
    isFaculty,
    user,
    setCommentText,
    refresh,
    submitComment,
    startEditingComment,
    cancelEditingComment,
    deleteComment,
    voteOnQuestion,
    voteOnComment,
    verifyAnswer,
    toggleBookmark,
    openReportModal,
    closeReportModal,
    deleteQuestion,
    closeQuestion,
    togglePinnedState,
  } = useQuestionDetailModel({
    questionId: id,
    whiteboardId,
    onQuestionDeleted: () => router.back(),
  });

  const isAuthor = question?.authorId === user?.id;

  const handleQuestionVote = async (voteType: VoteType) => {
    try {
      await voteOnQuestion(voteType);
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    }
  };

  const handleCommentVote = async (commentId: string, voteType: VoteType) => {
    try {
      await voteOnComment(commentId, voteType);
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    }
  };

  const handleToggleBookmark = async () => {
    try {
      await toggleBookmark();
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    }
  };

  const handleReportQuestion = () => {
    if (!id) {
      return;
    }

    openReportModal({ questionId: id });
  };

  const handleReportComment = (commentId: string) => {
    openReportModal({ commentId });
  };

  const handleDeleteComment = (comment: CommentResponse) => {
    Alert.alert('Delete Comment', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(comment.id);
          } catch (error: unknown) {
            Alert.alert('Error', extractErrorMessage(error));
          }
        },
      },
    ]);
  };

  const handleVerifyAnswer = (commentId: string) => {
    Alert.alert(
      'Verify Answer',
      'Mark this comment as the verified answer? This will close the question and prevent new comments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            try {
              await verifyAnswer(commentId);
            } catch (error: unknown) {
              Alert.alert('Error', extractErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  const handleDeleteQuestion = () => {
    Alert.alert('Delete Question', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteQuestion();
          } catch (error: unknown) {
            Alert.alert('Error', extractErrorMessage(error));
          }
        },
      },
    ]);
  };

  const handleCloseQuestion = async () => {
    try {
      await closeQuestion();
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    }
  };

  const handleTogglePinnedState = async () => {
    try {
      await togglePinnedState();
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    }
  };

  const renderComment = ({ item }: { item: CommentResponse }) => {
    const isCommentAuthor = item.authorId === user?.id;

    return (
      <CommentCard
        comment={item}
        onUpvote={() => handleCommentVote(item.id, 'UPVOTE')}
        onDownvote={() => handleCommentVote(item.id, 'DOWNVOTE')}
        onEdit={isCommentAuthor && item.canEdit ? () => startEditingComment(item) : undefined}
        onDelete={isCommentAuthor || isFaculty ? () => handleDeleteComment(item) : undefined}
        onReport={!isCommentAuthor ? () => handleReportComment(item.id) : undefined}
        onVerify={
          isFaculty && !isClosed && !item.isVerifiedAnswer
            ? () => handleVerifyAnswer(item.id)
            : undefined
        }
        isCurrentUser={isCommentAuthor}
        canDelete={isCommentAuthor || isFaculty}
      />
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={[Colors.background, Colors.background]} style={styles.gradient}>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.background, Colors.background]} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: themeColors.surfaceBorder }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: themeColors.surfaceLight }]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <AnimatedIcon name="chevron-back" size={20} color={themeColors.text} motion="none" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
              Question
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleToggleBookmark}
                style={[styles.headerButton, { backgroundColor: themeColors.surfaceLight }]}
                accessibilityRole="button"
                accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                <AnimatedIcon
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={isBookmarked ? themeColors.primary : themeColors.textMuted}
                  motion="none"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReportQuestion}
                style={[styles.headerButton, { backgroundColor: themeColors.surfaceLight }]}
                accessibilityRole="button"
                accessibilityLabel="Report question"
              >
                <AnimatedIcon
                  name="flag-outline"
                  size={18}
                  color={themeColors.textMuted}
                  motion="none"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={Colors.primary}
              />
            }
            ListHeaderComponent={
              question ? (
                <View style={styles.questionSection}>
                  {/* Question Card */}
                  <GlassCard style={styles.questionCard}>
                    <View style={styles.questionMeta}>
                      {question.topicName && <TopicBadge name={question.topicName} />}
                      <StatusBadge status={question.status} />
                      {question.isPinned && (
                        <View style={styles.pinnedRow}>
                          <AnimatedIcon name="pin" size={12} color={Colors.warning} motion="none" />
                          <Text style={styles.pinnedText}>Pinned</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.questionTitle}>{question.title}</Text>

                    <View style={styles.questionAuthorRow}>
                      <Text style={styles.authorName}>{question.authorName}</Text>
                      <Text style={styles.dateText}>{formatFullDate(question.createdAt)}</Text>
                    </View>

                    <Text style={styles.questionBody}>{question.body}</Text>

                    <View
                      style={[styles.questionStats, { borderTopColor: themeColors.surfaceBorder }]}
                    >
                      <KarmaDisplay
                        score={question.karmaScore}
                        userVote={question.userVote}
                        onUpvote={() => handleQuestionVote('UPVOTE')}
                        onDownvote={() => handleQuestionVote('DOWNVOTE')}
                        direction="horizontal"
                      />

                      <View style={styles.questionActionsRow}>
                        {canEdit && (
                          <TouchableOpacity
                            onPress={() =>
                              router.push({
                                pathname: '/question/edit',
                                params: {
                                  questionId: id,
                                  whiteboardId: whiteboardId || question.whiteboardId,
                                },
                              })
                            }
                            style={[
                              styles.questionAction,
                              {
                                backgroundColor: themeColors.surfaceLight,
                                borderColor: themeColors.surfaceBorder,
                              },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Edit question"
                          >
                            <Text style={[styles.questionActionText, { color: themeColors.text }]}>
                              Edit
                            </Text>
                          </TouchableOpacity>
                        )}
                        {(isAuthor || isFaculty) && (
                          <TouchableOpacity
                            onPress={handleDeleteQuestion}
                            style={[styles.questionAction, styles.questionActionDanger]}
                            accessibilityRole="button"
                            accessibilityLabel="Delete question"
                          >
                            <Text style={styles.questionActionTextDanger}>Delete</Text>
                          </TouchableOpacity>
                        )}
                        {isFaculty && !isClosed && (
                          <TouchableOpacity
                            onPress={handleCloseQuestion}
                            style={[
                              styles.questionAction,
                              {
                                backgroundColor: themeColors.surfaceLight,
                                borderColor: themeColors.surfaceBorder,
                              },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Close question"
                          >
                            <Text style={[styles.questionActionText, { color: themeColors.text }]}>
                              Close
                            </Text>
                          </TouchableOpacity>
                        )}
                        {isFaculty && (
                          <TouchableOpacity
                            onPress={handleTogglePinnedState}
                            style={[
                              styles.questionAction,
                              {
                                backgroundColor: themeColors.surfaceLight,
                                borderColor: themeColors.surfaceBorder,
                              },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={
                              question.isPinned ? 'Unpin question' : 'Pin question'
                            }
                          >
                            <Text style={[styles.questionActionText, { color: themeColors.text }]}>
                              {question.isPinned ? 'Unpin' : 'Pin'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </GlassCard>

                  {/* Closed Banner */}
                  {isClosed && (
                    <View style={styles.closedBanner}>
                      <AnimatedIcon
                        name="lock-closed"
                        size={16}
                        color={Colors.warning}
                        motion="none"
                      />
                      <Text style={styles.closedText}>
                        This question has been answered and is now closed
                      </Text>
                    </View>
                  )}

                  {/* Comments Header */}
                  <Text style={styles.commentsTitle}>
                    {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.noComments}>
                  <Text style={styles.noCommentsText}>
                    {loadError || 'No comments yet. Be the first to respond!'}
                  </Text>
                </View>
              ) : null
            }
          />

          {/* Comment Input */}
          {!isClosed && (
            <View
              style={[
                styles.commentInputContainer,
                {
                  backgroundColor: themeColors.backgroundLight,
                  borderTopColor: themeColors.surfaceBorder,
                },
              ]}
            >
              {editingCommentId && (
                <View style={styles.editingBanner}>
                  <Text style={styles.editingText}>Editing comment</Text>
                  <TouchableOpacity
                    onPress={cancelEditingComment}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel comment edit"
                  >
                    <Text style={styles.editingCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.commentInputRow}>
                <TextInput
                  ref={commentInputRef}
                  style={[
                    styles.commentInput,
                    {
                      backgroundColor: themeColors.inputBg,
                      borderColor: themeColors.inputBorder,
                      color: themeColors.text,
                    },
                  ]}
                  placeholder={editingCommentId ? 'Update your comment...' : 'Write a comment...'}
                  placeholderTextColor={themeColors.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={2000}
                  selectionColor={themeColors.primary}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: themeColors.primary },
                    (!commentText.trim() || submitting) && styles.sendButtonDisabled,
                  ]}
                  onPress={submitComment}
                  disabled={!commentText.trim() || submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Post comment"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <AnimatedIcon
                      name={editingCommentId ? 'checkmark' : 'arrow-up'}
                      size={20}
                      color="#FFFFFF"
                      motion="none"
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>

        <ReportModal
          visible={reportModalVisible}
          onClose={closeReportModal}
          target={reportTarget}
          title={reportTarget?.questionId ? 'Report Question' : 'Report Comment'}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: {
    fontSize: 18,
    color: Colors.text,
  },
  headerTitle: {
    flex: 1,
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonIcon: {
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  questionSection: {
    marginBottom: 8,
  },
  questionCard: {
    marginBottom: 12,
  },
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinnedText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.warning,
  },
  questionTitle: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  questionAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  authorName: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dateText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  questionBody: {
    fontSize: Fonts.sizes.lg,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  questionStats: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
  },
  questionActionsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  questionAction: {
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionActionDanger: {
    backgroundColor: `${Colors.error}14`,
    borderColor: `${Colors.error}33`,
  },
  questionActionText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  questionActionTextDanger: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.error,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,200,81,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,200,81,0.2)',
  },
  closedIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  closedText: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    color: Colors.success,
    fontWeight: '500',
  },
  commentsTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 12,
  },
  commentCard: {
    marginBottom: 10,
  },
  verifiedCard: {
    borderColor: 'rgba(0,200,81,0.3)',
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,200,81,0.15)',
  },
  verifiedIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  verifiedText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.success,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentContent: {
    flex: 1,
    marginLeft: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  commentDate: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
  },
  commentBody: {
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    lineHeight: 22,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 10,
    minHeight: 44,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  noComments: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: Fonts.sizes.md,
    color: Colors.textMuted,
  },
  commentInputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(187,39,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.3)',
  },
  editingText: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
  },
  editingCancelText: {
    color: Colors.primary,
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '700',
  },
  reportModalSubtitle: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  reportReasonList: {
    gap: 8,
    marginBottom: 14,
  },
  reportReasonOption: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reportReasonOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(187,39,68,0.22)',
  },
  reportReasonLabel: {
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  reportReasonLabelActive: {
    color: Colors.primary,
  },
  reportReasonDescription: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  reportNotesLabel: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  reportNotesInput: {
    minHeight: 86,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    lineHeight: 20,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  reportSubmitButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitButtonDisabled: {
    opacity: 0.45,
  },
  reportSubmitText: {
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    fontWeight: '700',
  },
});
