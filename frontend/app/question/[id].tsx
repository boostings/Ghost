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
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
import { formatTimestampLong } from '../../utils/formatTimestamp';
import { isQuestionEdited } from '../../utils/questionMeta';
import { getQuestionDisplayStatus } from '../../utils/questionStatus';
import type { CommentResponse, VoteType } from '../../types';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function QuestionDetailScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const reduceMotion = useReducedMotion();
  const { id, whiteboardId, reply, fromCard } = useLocalSearchParams<{
    id: string;
    whiteboardId: string;
    reply?: string;
    fromCard?: string;
  }>();
  const handleBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/home');
  }, [router]);
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
    canDeleteQuestion,
    canReportQuestion,
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
    onQuestionDeleted: handleBack,
  });

  React.useEffect(() => {
    if (reply === '1' && !loading && !isClosed) {
      const focusTimer = setTimeout(() => commentInputRef.current?.focus(), 250);
      return () => clearTimeout(focusTimer);
    }
    return undefined;
  }, [commentInputRef, isClosed, loading, reply]);

  const questionWasEdited = isQuestionEdited(question);
  const composerProgress = useSharedValue(0);
  const detailProgress = useSharedValue(fromCard === '1' && !reduceMotion ? 0 : 1);

  React.useEffect(() => {
    if (fromCard !== '1' || reduceMotion) {
      detailProgress.value = 1;
      return;
    }

    detailProgress.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [detailProgress, fromCard, reduceMotion]);

  React.useEffect(() => {
    composerProgress.value = withTiming(submitting && !reduceMotion ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [composerProgress, reduceMotion, submitting]);

  const composerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - composerProgress.value * 0.18,
    transform: [{ scaleY: 1 - composerProgress.value * 0.08 }],
  }));

  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -composerProgress.value * 18 },
      { scale: 1 + composerProgress.value * 0.08 },
    ],
  }));

  const detailHeroStyle = useAnimatedStyle(() => ({
    opacity: 0.88 + detailProgress.value * 0.12,
    transform: [
      { translateY: (1 - detailProgress.value) * 14 },
      { scale: 0.97 + detailProgress.value * 0.03 },
    ],
  }));

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
    if (!id || !canReportQuestion) {
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
      'Mark as Answer',
      'Mark this comment as the verified answer? The question will be closed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Answer',
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
    const canDeleteComment = isFaculty || (isCommentAuthor && !isClosed && !item.isVerifiedAnswer);

    return (
      <CommentCard
        comment={item}
        onUpvote={() => handleCommentVote(item.id, 'UPVOTE')}
        onDownvote={() => handleCommentVote(item.id, 'DOWNVOTE')}
        onEdit={isCommentAuthor && item.canEdit ? () => startEditingComment(item) : undefined}
        onDelete={canDeleteComment ? () => handleDeleteComment(item) : undefined}
        onReport={!isCommentAuthor ? () => handleReportComment(item.id) : undefined}
        onVerify={
          isFaculty && !isClosed && !item.isVerifiedAnswer
            ? () => handleVerifyAnswer(item.id)
            : undefined
        }
        isCurrentUser={isCommentAuthor}
        canDelete={canDeleteComment}
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
              onPress={handleBack}
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
              {canReportQuestion && (
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
              )}
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
                  <Animated.View style={detailHeroStyle}>
                    <GlassCard style={styles.questionCard}>
                      <View style={styles.questionMeta}>
                        {question.topicName && <TopicBadge name={question.topicName} />}
                        <StatusBadge status={getQuestionDisplayStatus(question)} />
                        {question.isPinned && (
                          <View style={styles.pinnedRow}>
                            <AnimatedIcon name="pin" size={12} color={Colors.warning} motion="none" />
                            <Text style={styles.pinnedText}>Pinned</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.questionTitle}>{question.title}</Text>

                      {questionWasEdited && <Text style={styles.editedText}>Edited</Text>}

                      <View style={styles.questionAuthorRow}>
                        <Text style={styles.authorName}>{question.authorName}</Text>
                        <Text style={styles.dateText}>{formatTimestampLong(question.createdAt)}</Text>
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
                          {canDeleteQuestion && (
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
                  </Animated.View>

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
                        {question.verifiedAnswerId
                          ? 'This question has a verified answer and is now closed.'
                          : 'This question is closed.'}
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
          {!isClosed ? (
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
              <Animated.View style={[styles.commentInputRow, composerAnimatedStyle]}>
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
                  accessibilityLabel={editingCommentId ? 'Edit comment' : 'Write a comment'}
                />
                <AnimatedTouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: themeColors.primary },
                    (!commentText.trim() || submitting) && styles.sendButtonDisabled,
                    sendAnimatedStyle,
                  ]}
                  onPress={submitComment}
                  disabled={!commentText.trim() || submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Post comment"
                  accessibilityState={{
                    disabled: !commentText.trim() || submitting,
                    busy: submitting,
                  }}
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
                </AnimatedTouchableOpacity>
              </Animated.View>
            </View>
          ) : (
            <View
              style={[
                styles.closedComposer,
                {
                  backgroundColor: themeColors.backgroundLight,
                  borderTopColor: themeColors.surfaceBorder,
                },
              ]}
            >
              <AnimatedIcon
                name="lock-closed"
                size={16}
                color={themeColors.textMuted}
                motion="none"
              />
              <Text style={[styles.closedComposerText, { color: themeColors.textMuted }]}>
                This question is closed.
              </Text>
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
    paddingBottom: 36,
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
  editedText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 10,
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
  },
  closedComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  closedComposerText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
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
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 9,
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
