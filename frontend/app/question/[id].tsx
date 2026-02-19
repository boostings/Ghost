import React, { useState, useCallback, useRef } from 'react';
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
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import KarmaDisplay from '../../components/ui/KarmaDisplay';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useAuthStore } from '../../stores/authStore';
import { questionService } from '../../services/questionService';
import { commentService } from '../../services/commentService';
import { bookmarkService } from '../../services/bookmarkService';
import { reportService } from '../../services/reportService';
import { formatDate, formatFullDate } from '../../utils/formatDate';
import { extractErrorMessage } from '../../hooks/useApi';
import { sanitizeText } from '../../utils/sanitize';
import type { QuestionResponse, CommentResponse, VoteType, ReportReason } from '../../types';

export default function QuestionDetailScreen() {
  const router = useRouter();
  const { id, whiteboardId } = useLocalSearchParams<{ id: string; whiteboardId: string }>();
  const user = useAuthStore((state) => state.user);
  const isFaculty = user?.role === 'FACULTY';
  const commentInputRef = useRef<TextInput>(null);

  const [question, setQuestion] = useState<QuestionResponse | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastFetchRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!id) {
      setQuestion(null);
      setComments([]);
      setLoading(false);
      setLoadError('Missing question id.');
      return;
    }

    try {
      const resolvedQuestion = whiteboardId
        ? questionService.getById(whiteboardId, id)
        : questionService.getByIdGlobal(id);
      const [q, c] = await Promise.all([
        resolvedQuestion,
        commentService.list(id),
      ]);
      setQuestion(q);
      setComments(c);
      setIsBookmarked(q.isBookmarked || false);
      setLoadError(null);
      lastFetchRef.current = Date.now();
    } catch {
      setLoadError('Failed to load this question.');
      setQuestion(null);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [id, whiteboardId]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchRef.current > 30000;
      if (!question || isStale) {
        fetchData();
      }
    }, [fetchData, question])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSubmitComment = async () => {
    const sanitizedComment = sanitizeText(commentText);
    if (!sanitizedComment || !id) return;
    setSubmitting(true);
    try {
      const newComment = await commentService.create(id, { body: sanitizedComment });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      commentInputRef.current?.blur();
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuestionVote = async (voteType: VoteType) => {
    if (!id) return;
    try {
      if (question?.userVote === voteType) {
        await questionService.removeVote(id);
        setQuestion((prev) =>
          prev
            ? {
                ...prev,
                userVote: null,
                karmaScore:
                  prev.karmaScore + (voteType === 'UPVOTE' ? -1 : 1),
              }
            : prev
        );
      } else {
        await questionService.vote(id, voteType);
        const oldVote = question?.userVote;
        let scoreDiff = voteType === 'UPVOTE' ? 1 : -1;
        if (oldVote) scoreDiff += oldVote === 'UPVOTE' ? -1 : 1;
        setQuestion((prev) =>
          prev
            ? { ...prev, userVote: voteType, karmaScore: prev.karmaScore + scoreDiff }
            : prev
        );
      }
    } catch {
      Alert.alert('Error', 'Could not record your vote. Please try again.');
    }
  };

  const handleCommentVote = async (commentId: string, voteType: VoteType) => {
    try {
      const comment = comments.find((c) => c.id === commentId);
      if (comment?.userVote === voteType) {
        await commentService.removeVote(commentId);
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, userVote: null, karmaScore: c.karmaScore + (voteType === 'UPVOTE' ? -1 : 1) }
              : c
          )
        );
      } else {
        await commentService.vote(commentId, voteType);
        const oldVote = comment?.userVote;
        let scoreDiff = voteType === 'UPVOTE' ? 1 : -1;
        if (oldVote) scoreDiff += oldVote === 'UPVOTE' ? -1 : 1;
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, userVote: voteType, karmaScore: c.karmaScore + scoreDiff }
              : c
          )
        );
      }
    } catch {
      Alert.alert('Error', 'Could not record your vote. Please try again.');
    }
  };

  const handleVerifyAnswer = async (commentId: string) => {
    if (!id) return;
    Alert.alert(
      'Verify Answer',
      'Mark this comment as the verified answer? This will close the question and prevent new comments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            try {
              await commentService.verify(id, commentId);
              await fetchData();
            } catch {
              Alert.alert('Error', 'Failed to verify answer.');
            }
          },
        },
      ]
    );
  };

  const handleBookmark = async () => {
    if (!id) return;
    try {
      if (isBookmarked) {
        await bookmarkService.remove(id);
        setIsBookmarked(false);
      } else {
        await bookmarkService.add(id);
        setIsBookmarked(true);
      }
    } catch {
      Alert.alert('Error', 'Failed to update bookmark.');
    }
  };

  const handleReport = () => {
    Alert.alert('Report Content', 'Select a reason for reporting:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Spam',
        onPress: () => submitReport('SPAM'),
      },
      {
        text: 'Inappropriate',
        onPress: () => submitReport('INAPPROPRIATE'),
      },
      {
        text: 'Off Topic',
        onPress: () => submitReport('OFF_TOPIC'),
      },
    ]);
  };

  const submitReport = async (reason: ReportReason) => {
    if (!id) return;
    try {
      await reportService.create({ questionId: id, reason });
      Alert.alert('Reported', 'Thank you for your report. It will be reviewed by faculty.');
    } catch {
      Alert.alert('Error', 'Failed to submit report.');
    }
  };

  const handleDeleteQuestion = () => {
    Alert.alert('Delete Question', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) {
            return;
          }
          try {
            const wbId = whiteboardId || question?.whiteboardId;
            if (!wbId) {
              Alert.alert('Error', 'Missing whiteboard context.');
              return;
            }
            await questionService.delete(wbId, id);
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete question.');
          }
        },
      },
    ]);
  };

  const isClosed = question?.status === 'CLOSED';
  const isAuthor = question?.authorId === user?.id;
  const canEdit = isAuthor && !isClosed && !question?.verifiedAnswerId;

  const renderComment = ({ item }: { item: CommentResponse }) => (
    <GlassCard
      style={[
        styles.commentCard,
        item.isVerifiedAnswer && styles.verifiedCard,
      ]}
    >
      {item.isVerifiedAnswer && (
        <View style={styles.verifiedBanner}>
          <Text style={styles.verifiedIcon}>{"\u2705"}</Text>
          <Text style={styles.verifiedText}>Verified Answer</Text>
        </View>
      )}

      <View style={styles.commentRow}>
        <KarmaDisplay
          score={item.karmaScore}
          userVote={item.userVote}
          onUpvote={() => handleCommentVote(item.id, 'UPVOTE')}
          onDownvote={() => handleCommentVote(item.id, 'DOWNVOTE')}
          size="small"
        />

        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{item.authorName}</Text>
            <Text style={styles.commentDate}>{formatDate(item.createdAt)}</Text>
          </View>

          <Text style={styles.commentBody}>{item.body}</Text>

          <View style={styles.commentActions}>
            {isFaculty && !item.isVerifiedAnswer && !isClosed && (
              <TouchableOpacity
                onPress={() => handleVerifyAnswer(item.id)}
                style={styles.actionButton}
                accessibilityRole="button"
                accessibilityLabel="Verify this answer"
              >
                <Text style={styles.actionButtonText}>{"\u2713 Verify"}</Text>
              </TouchableOpacity>
            )}
            {item.canEdit && (
              <TouchableOpacity
                style={styles.actionButton}
                accessibilityRole="button"
                accessibilityLabel="Edit comment"
              >
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </GlassCard>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1A1A2E', '#16213E', '#0F3460']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backArrow}>{"\u2190"}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Question
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleBookmark}
                style={styles.headerButton}
                accessibilityRole="button"
                accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                <Text style={styles.headerButtonIcon}>
                  {isBookmarked ? '\u2605' : '\u2606'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReport}
                style={styles.headerButton}
                accessibilityRole="button"
                accessibilityLabel="Report question"
              >
                <Text style={styles.headerButtonIcon}>{"\u{1F6A9}"}</Text>
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
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
              />
            }
            ListHeaderComponent={
              question ? (
                <View style={styles.questionSection}>
                  {/* Question Card */}
                  <GlassCard style={styles.questionCard}>
                    <View style={styles.questionMeta}>
                      {question.topicName && (
                        <TopicBadge name={question.topicName} />
                      )}
                      <StatusBadge status={question.status} />
                      {question.isPinned && (
                        <Text style={styles.pinnedText}>{"\u{1F4CC}"} Pinned</Text>
                      )}
                    </View>

                    <Text style={styles.questionTitle}>{question.title}</Text>

                    <View style={styles.questionAuthorRow}>
                      <Text style={styles.authorName}>{question.authorName}</Text>
                      <Text style={styles.dateText}>
                        {formatFullDate(question.createdAt)}
                      </Text>
                    </View>

                    <Text style={styles.questionBody}>{question.body}</Text>

                    <View style={styles.questionStats}>
                      <KarmaDisplay
                        score={question.karmaScore}
                        userVote={question.userVote}
                        onUpvote={() => handleQuestionVote('UPVOTE')}
                        onDownvote={() => handleQuestionVote('DOWNVOTE')}
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
                            style={styles.questionAction}
                            accessibilityRole="button"
                            accessibilityLabel="Edit question"
                          >
                            <Text style={styles.questionActionText}>Edit</Text>
                          </TouchableOpacity>
                        )}
                        {(isAuthor || isFaculty) && (
                          <TouchableOpacity
                            onPress={handleDeleteQuestion}
                            style={styles.questionAction}
                            accessibilityRole="button"
                            accessibilityLabel="Delete question"
                          >
                            <Text style={styles.questionActionTextDanger}>
                              Delete
                            </Text>
                          </TouchableOpacity>
                        )}
                        {isFaculty && !isClosed && (
                          <TouchableOpacity
                            onPress={async () => {
                              if (!id) {
                                return;
                              }
                              try {
                                const wbId = whiteboardId || question.whiteboardId;
                                await questionService.close(wbId, id);
                                await fetchData();
                              } catch {
                                Alert.alert('Error', 'Failed to close question.');
                              }
                            }}
                            style={styles.questionAction}
                            accessibilityRole="button"
                            accessibilityLabel="Close question"
                          >
                            <Text style={styles.questionActionText}>Close</Text>
                          </TouchableOpacity>
                        )}
                        {isFaculty && (
                          <TouchableOpacity
                            onPress={async () => {
                              if (!id) {
                                return;
                              }
                              try {
                                const wbId = whiteboardId || question.whiteboardId;
                                if (question.isPinned) {
                                  await questionService.unpin(wbId, id);
                                } else {
                                  await questionService.pin(wbId, id);
                                }
                                await fetchData();
                              } catch {
                                Alert.alert('Error', 'Max 3 pinned questions per whiteboard.');
                              }
                            }}
                            style={styles.questionAction}
                            accessibilityRole="button"
                            accessibilityLabel={question.isPinned ? 'Unpin question' : 'Pin question'}
                          >
                            <Text style={styles.questionActionText}>
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
                      <Text style={styles.closedIcon}>{"\u{1F512}"}</Text>
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
            <View style={styles.commentInputContainer}>
              <View style={styles.commentInputRow}>
                <TextInput
                  ref={commentInputRef}
                  style={styles.commentInput}
                  placeholder="Write a comment..."
                  placeholderTextColor={Colors.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={2000}
                  selectionColor={Colors.primary}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!commentText.trim() || submitting) && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSubmitComment}
                  disabled={!commentText.trim() || submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Post comment"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={Colors.text} />
                  ) : (
                    <Text style={styles.sendIcon}>{"\u2191"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
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
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionActionText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    backgroundColor: 'rgba(26,26,46,0.95)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
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
});
