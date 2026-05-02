import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useWebSocket } from './useWebSocket';
import { useAuthStore } from '../stores/authStore';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { questionService } from '../services/questionService';
import { commentService } from '../services/commentService';
import { bookmarkService } from '../services/bookmarkService';
import { whiteboardService } from '../services/whiteboardService';
import { sanitizeText } from '../utils/sanitize';
import { extractErrorMessage } from './useApi';
import { reconcileCommentEvent, sortCommentsByCreatedAt } from '../utils/questionCommentEvents';
import { notifyQuestionDeleted } from '../utils/questionDeletionEvents';
import { isQuestionDeleteEvent, parseQuestionMessage } from '../utils/questionEvents';
import type { CommentResponse, QuestionResponse, VoteType } from '../types';

type ReportTarget = {
  questionId?: string;
  commentId?: string;
};

interface UseQuestionDetailModelOptions {
  questionId?: string;
  whiteboardId?: string;
  onQuestionDeleted?: () => void;
}

export function useQuestionDetailModel({
  questionId,
  whiteboardId,
  onQuestionDeleted,
}: UseQuestionDetailModelOptions) {
  const user = useAuthStore((state) => state.user);
  const whiteboards = useWhiteboardStore((state) => state.whiteboards);
  const addWhiteboard = useWhiteboardStore((state) => state.addWhiteboard);
  const { subscribe } = useWebSocket();
  const commentInputRef = useRef<TextInput>(null);
  const lastFetchRef = useRef(0);

  const [question, setQuestion] = useState<QuestionResponse | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  // Per-whiteboard faculty check. Backend enforces moderation by membership
  // role (verifyFacultyRole), and a globally-FACULTY user can be enrolled in
  // another teacher's class as STUDENT — so the global User.role is unsafe to
  // gate UI on. We resolve the viewer's whiteboard role from the store cache
  // (or fetch it below) and only show moderation affordances when authoritative.
  // Fallbacks: ownership grants faculty by definition; if the cached whiteboard
  // is from an older backend that hasn't been redeployed with myRole, fall back
  // to the global User.role so we don't regress access for legitimate faculty.
  const targetWhiteboardId = whiteboardId ?? question?.whiteboardId;
  const targetWhiteboard = targetWhiteboardId
    ? whiteboards.find((w) => w.id === targetWhiteboardId)
    : undefined;
  const isOwner = targetWhiteboard != null && user != null && targetWhiteboard.ownerId === user.id;
  const isFaculty =
    targetWhiteboard?.myRole === 'FACULTY' ||
    isOwner ||
    (targetWhiteboard != null && targetWhiteboard.myRole === undefined && user?.role === 'FACULTY');

  const fetchData = useCallback(async () => {
    if (!questionId) {
      setQuestion(null);
      setComments([]);
      setLoading(false);
      setLoadError('Missing question id.');
      return;
    }

    try {
      const resolvedQuestion = whiteboardId
        ? questionService.getById(whiteboardId, questionId)
        : questionService.getByIdGlobal(questionId);
      const nextQuestion = await resolvedQuestion;

      // Load comments and the whiteboard (for the viewer's per-board role) in
      // parallel. Whiteboard fetch is best-effort: if it fails the moderation
      // UI just stays hidden, which is the safe default.
      const [nextComments, nextWhiteboard] = await Promise.all([
        commentService.list(nextQuestion.whiteboardId, questionId),
        whiteboardService.getById(nextQuestion.whiteboardId).catch(() => null),
      ]);

      setQuestion(nextQuestion);
      setComments(sortCommentsByCreatedAt(nextComments));
      setIsBookmarked(nextQuestion.isBookmarked || false);
      if (nextWhiteboard) {
        addWhiteboard(nextWhiteboard);
      }
      setLoadError(null);
      lastFetchRef.current = Date.now();
    } catch {
      setLoadError('Failed to load this question.');
      setQuestion(null);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [addWhiteboard, questionId, whiteboardId]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchRef.current > 30_000;
      if (!question || isStale) {
        fetchData();
      }
    }, [fetchData, question])
  );

  useEffect(() => {
    if (!questionId) {
      return;
    }

    const subscription = subscribe(`/topic/question/${questionId}/comments`, (frame) => {
      setComments((previousComments) => reconcileCommentEvent(previousComments, frame.body));
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [questionId, subscribe]);

  useEffect(() => {
    const resolvedWhiteboardId = whiteboardId || question?.whiteboardId;
    if (!questionId || !resolvedWhiteboardId) {
      return;
    }

    const subscription = subscribe(
      `/topic/whiteboard/${resolvedWhiteboardId}/questions`,
      (frame) => {
        const {
          type,
          question: nextQuestion,
          questionId: eventQuestionId,
        } = parseQuestionMessage(frame.body);
        const affectedQuestionId = nextQuestion?.id ?? eventQuestionId;

        if (affectedQuestionId !== questionId) {
          return;
        }

        if (isQuestionDeleteEvent(type)) {
          onQuestionDeleted?.();
          return;
        }

        if (!nextQuestion) {
          return;
        }

        setQuestion(nextQuestion);
        setIsBookmarked(nextQuestion.isBookmarked || false);
        if (nextQuestion.status === 'CLOSED') {
          setEditingCommentId(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [onQuestionDeleted, question?.whiteboardId, questionId, subscribe, whiteboardId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const submitComment = useCallback(async () => {
    const sanitizedComment = sanitizeText(commentText);
    if (!sanitizedComment || !questionId || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const resolvedWhiteboardId = whiteboardId || question?.whiteboardId;
      if (!resolvedWhiteboardId) {
        throw new Error('Missing whiteboard context.');
      }

      if (editingCommentId) {
        const updatedComment = await commentService.update(
          resolvedWhiteboardId,
          questionId,
          editingCommentId,
          {
            body: sanitizedComment,
          }
        );
        setComments((previousComments) => {
          const existingIndex = previousComments.findIndex(
            (comment) => comment.id === updatedComment.id
          );

          if (existingIndex >= 0) {
            const nextComments = [...previousComments];
            nextComments[existingIndex] = updatedComment;
            return sortCommentsByCreatedAt(nextComments);
          }

          return sortCommentsByCreatedAt([...previousComments, updatedComment]);
        });
        setEditingCommentId(null);
      } else {
        const newComment = await commentService.create(resolvedWhiteboardId, questionId, {
          body: sanitizedComment,
        });
        setComments((previousComments) => {
          const existingIndex = previousComments.findIndex(
            (comment) => comment.id === newComment.id
          );

          if (existingIndex >= 0) {
            const nextComments = [...previousComments];
            nextComments[existingIndex] = newComment;
            return sortCommentsByCreatedAt(nextComments);
          }

          return sortCommentsByCreatedAt([...previousComments, newComment]);
        });
      }

      setCommentText('');
      commentInputRef.current?.blur();
    } catch (error: unknown) {
      Alert.alert('Error', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }, [commentText, editingCommentId, question?.whiteboardId, questionId, submitting, whiteboardId]);

  const startEditingComment = useCallback(
    (comment: CommentResponse) => {
      if (question?.status === 'CLOSED') {
        return;
      }

      setEditingCommentId(comment.id);
      setCommentText(comment.body);
      commentInputRef.current?.focus();
    },
    [question?.status]
  );

  const cancelEditingComment = useCallback(() => {
    setEditingCommentId(null);
    setCommentText('');
    commentInputRef.current?.blur();
  }, []);

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!questionId) {
        return;
      }

      const resolvedWhiteboardId = whiteboardId || question?.whiteboardId;
      if (!resolvedWhiteboardId) {
        throw new Error('Missing whiteboard context.');
      }

      await commentService.delete(resolvedWhiteboardId, questionId, commentId);
      setComments((previousComments) =>
        previousComments.filter((comment) => comment.id !== commentId)
      );

      if (editingCommentId === commentId) {
        cancelEditingComment();
      }
    },
    [cancelEditingComment, editingCommentId, question?.whiteboardId, questionId, whiteboardId]
  );

  const voteOnQuestion = useCallback(
    async (voteType: VoteType) => {
      if (!questionId) {
        return;
      }

      if (question?.userVote === voteType) {
        await questionService.removeVote(questionId);
        setQuestion((previousQuestion) =>
          previousQuestion
            ? {
                ...previousQuestion,
                userVote: null,
                karmaScore: previousQuestion.karmaScore + (voteType === 'UPVOTE' ? -1 : 1),
              }
            : previousQuestion
        );
        return;
      }

      await questionService.vote(questionId, voteType);
      const oldVote = question?.userVote;
      let scoreDifference = voteType === 'UPVOTE' ? 1 : -1;
      if (oldVote) {
        scoreDifference += oldVote === 'UPVOTE' ? -1 : 1;
      }

      setQuestion((previousQuestion) =>
        previousQuestion
          ? {
              ...previousQuestion,
              userVote: voteType,
              karmaScore: previousQuestion.karmaScore + scoreDifference,
            }
          : previousQuestion
      );
    },
    [question?.userVote, questionId]
  );

  const voteOnComment = useCallback(
    async (commentId: string, voteType: VoteType) => {
      const existingComment = comments.find((comment) => comment.id === commentId);

      if (existingComment?.userVote === voteType) {
        await commentService.removeVote(commentId);
        setComments((previousComments) =>
          previousComments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  userVote: null,
                  karmaScore: comment.karmaScore + (voteType === 'UPVOTE' ? -1 : 1),
                }
              : comment
          )
        );
        return;
      }

      await commentService.vote(commentId, voteType);
      const oldVote = existingComment?.userVote;
      let scoreDifference = voteType === 'UPVOTE' ? 1 : -1;
      if (oldVote) {
        scoreDifference += oldVote === 'UPVOTE' ? -1 : 1;
      }

      setComments((previousComments) =>
        previousComments.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                userVote: voteType,
                karmaScore: comment.karmaScore + scoreDifference,
              }
            : comment
        )
      );
    },
    [comments]
  );

  const verifyAnswer = useCallback(
    async (commentId: string) => {
      if (!questionId) {
        return;
      }

      const resolvedWhiteboardId = whiteboardId || question?.whiteboardId;
      if (!resolvedWhiteboardId) {
        throw new Error('Missing whiteboard context.');
      }

      const previousQuestion = question;
      const previousComments = comments;
      const targetComment = previousComments.find((comment) => comment.id === commentId);

      setComments((currentComments) =>
        currentComments.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                isVerifiedAnswer: true,
                verifiedById: user?.id ?? comment.verifiedById,
                verifiedByName:
                  user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`.trim()
                    : comment.verifiedByName,
              }
            : {
                ...comment,
                isVerifiedAnswer: false,
              }
        )
      );
      setQuestion((currentQuestion) =>
        currentQuestion
          ? {
              ...currentQuestion,
              status: 'CLOSED',
              verifiedAnswerId: commentId,
              verifiedAnswerPreview: targetComment?.body ?? currentQuestion.verifiedAnswerPreview,
              verifiedAnswerAuthorName:
                targetComment?.authorName ?? currentQuestion.verifiedAnswerAuthorName,
            }
          : currentQuestion
      );

      try {
        const verifiedComment = await commentService.verify(
          resolvedWhiteboardId,
          questionId,
          commentId
        );
        setComments((currentComments) =>
          currentComments.map((comment) =>
            comment.id === verifiedComment.id ? verifiedComment : comment
          )
        );
      } catch (error) {
        setQuestion(previousQuestion);
        setComments(previousComments);
        throw error;
      }
    },
    [comments, question, questionId, user, whiteboardId]
  );

  const toggleBookmark = useCallback(async () => {
    if (!questionId) {
      return;
    }

    if (isBookmarked) {
      await bookmarkService.remove(questionId);
      setIsBookmarked(false);
      return;
    }

    await bookmarkService.add(questionId);
    setIsBookmarked(true);
  }, [isBookmarked, questionId]);

  const openReportModal = useCallback((target: ReportTarget) => {
    setReportTarget(target);
    setReportModalVisible(true);
  }, []);

  const closeReportModal = useCallback(() => {
    setReportModalVisible(false);
    setReportTarget(null);
  }, []);

  const deleteQuestion = useCallback(async () => {
    if (!questionId) {
      return;
    }

    const resolvedWhiteboardId = whiteboardId || question?.whiteboardId;
    if (!resolvedWhiteboardId) {
      throw new Error('Missing whiteboard context.');
    }

    await questionService.delete(resolvedWhiteboardId, questionId);
    notifyQuestionDeleted({ whiteboardId: resolvedWhiteboardId, questionId });
    onQuestionDeleted?.();
  }, [onQuestionDeleted, question?.whiteboardId, questionId, whiteboardId]);

  const closeQuestion = useCallback(async () => {
    if (!questionId) {
      return;
    }

    const resolvedWhiteboardId = whiteboardId || question?.whiteboardId;
    if (!resolvedWhiteboardId) {
      throw new Error('Missing whiteboard context.');
    }

    await questionService.close(resolvedWhiteboardId, questionId);
    await fetchData();
  }, [fetchData, question?.whiteboardId, questionId, whiteboardId]);

  const togglePinnedState = useCallback(async () => {
    if (!questionId) {
      return;
    }

    const resolvedWhiteboardId = whiteboardId || question?.whiteboardId;
    if (!resolvedWhiteboardId) {
      throw new Error('Missing whiteboard context.');
    }

    if (question?.isPinned) {
      await questionService.unpin(resolvedWhiteboardId, questionId);
    } else {
      await questionService.pin(resolvedWhiteboardId, questionId);
    }

    await fetchData();
  }, [fetchData, question?.isPinned, question?.whiteboardId, questionId, whiteboardId]);

  const isClosed = question?.status === 'CLOSED';
  const isAuthor = question?.authorId === user?.id;
  const canEdit = Boolean(isAuthor && !isClosed && !question?.verifiedAnswerId);
  const canDeleteQuestion = Boolean(isFaculty || canEdit);
  const canReportQuestion = Boolean(question && !isAuthor);

  return {
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
    isAuthor,
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
  };
}
