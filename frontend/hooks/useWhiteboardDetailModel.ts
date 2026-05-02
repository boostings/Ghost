import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { bookmarkService } from '../services/bookmarkService';
import { commentService } from '../services/commentService';
import { questionService } from '../services/questionService';
import { whiteboardService } from '../services/whiteboardService';
import { extractErrorMessage } from './useApi';
import { useWebSocket } from './useWebSocket';
import { useAuthStore } from '../stores/authStore';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { subscribeToQuestionDeleted } from '../utils/questionDeletionEvents';
import { reconcileQuestionEvent } from '../utils/questionEvents';
import type { CommentResponse, QuestionResponse, WhiteboardResponse } from '../types';

export type SortMode = 'recent' | 'topVoted' | 'mostCommented';

export const SORT_OPTIONS: Array<{ label: string; value: SortMode }> = [
  { label: 'Recent activity', value: 'recent' },
  { label: 'Most upvoted', value: 'topVoted' },
  { label: 'Most commented', value: 'mostCommented' },
];

type FeedSection = {
  key: 'pinned' | 'open' | 'answered' | 'closed';
  title: string;
  data: QuestionResponse[];
};

type FeedStats = {
  pinned: number;
  open: number;
  answered: number;
  total: number;
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;

type ReportTarget = {
  questionId?: string;
  commentId?: string;
};

function sortQuestions(items: QuestionResponse[], mode: SortMode): QuestionResponse[] {
  const copy = [...items];
  switch (mode) {
    case 'topVoted':
      return copy.sort((a, b) => b.karmaScore - a.karmaScore);
    case 'mostCommented':
      return copy.sort((a, b) => b.commentCount - a.commentCount);
    case 'recent':
    default:
      return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

export function useWhiteboardDetailModel(whiteboardId?: string) {
  const user = useAuthStore((state) => state.user);
  const setCurrentWhiteboard = useWhiteboardStore((state) => state.setCurrentWhiteboard);
  const { subscribe } = useWebSocket();

  const [whiteboard, setWhiteboard] = useState<WhiteboardResponse | null>(null);
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [topicFilter, setTopicFilter] = useState<'ALL' | string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const lastFetchRef = useRef(0);
  const loadedWhiteboardIdRef = useRef<string | null>(null);
  const requestInFlightRef = useRef(false);
  const locallyDeletedQuestionIdsRef = useRef(new Set<string>());

  // Per-whiteboard faculty check (see useQuestionDetailModel for rationale).
  // A globally-FACULTY user may be enrolled here as STUDENT (observer mode); we
  // gate moderator UI on the membership role from the backend. Owner is always
  // faculty by definition. If myRole is missing (older backend that hasn't been
  // redeployed yet), fall back to global User.role + ownership so we don't
  // regress moderator access.
  const isOwner = whiteboard != null && user != null && whiteboard.ownerId === user.id;
  const isFaculty =
    whiteboard?.myRole === 'FACULTY' ||
    isOwner ||
    (whiteboard != null && whiteboard.myRole === undefined && user?.role === 'FACULTY') ||
    (whiteboard == null && user?.role === 'FACULTY');
  const isSearching = debouncedQuery.trim().length > 0;

  useEffect(() => {
    loadedWhiteboardIdRef.current = null;
    lastFetchRef.current = 0;
    locallyDeletedQuestionIdsRef.current = new Set();
    setWhiteboard(null);
    setQuestions([]);
    setPage(0);
    setHasMore(true);
  }, [whiteboardId]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const fetchData = useCallback(
    async (options?: { page?: number; replace?: boolean }) => {
      if (!whiteboardId) {
        setLoadError('Missing whiteboard id.');
        setLoading(false);
        return;
      }

      const nextPage = options?.page ?? 0;
      const replace = options?.replace ?? true;
      if (requestInFlightRef.current) {
        return;
      }

      if (!replace && (!hasMore || loadingMore)) {
        return;
      }

      requestInFlightRef.current = true;

      try {
        if (replace) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const trimmedQuery = debouncedQuery.trim();
        const questionsPromise = trimmedQuery
          ? questionService.searchQuestions({
              q: trimmedQuery,
              whiteboard: whiteboardId,
              page: nextPage,
              size: PAGE_SIZE,
            })
          : questionService.getQuestions(whiteboardId, { page: nextPage, size: PAGE_SIZE });

        const [nextWhiteboard, questionPage] = await Promise.all([
          replace ? whiteboardService.getWhiteboard(whiteboardId) : Promise.resolve(null),
          questionsPromise,
        ]);

        if (nextWhiteboard) {
          setWhiteboard(nextWhiteboard);
          setCurrentWhiteboard(nextWhiteboard);
        }

        const visibleQuestions = questionPage.content.filter(
          (question) => !locallyDeletedQuestionIdsRef.current.has(question.id)
        );
        setQuestions((previousQuestions) =>
          replace ? visibleQuestions : [...previousQuestions, ...visibleQuestions]
        );
        setPage(nextPage);
        setHasMore(nextPage + 1 < questionPage.totalPages);
        setLoadError(null);
        lastFetchRef.current = Date.now();
        loadedWhiteboardIdRef.current = whiteboardId;
      } catch {
        setLoadError('Failed to load this whiteboard.');
        if (replace) {
          setWhiteboard(null);
          setQuestions([]);
        }
        setHasMore(false);
      } finally {
        if (replace) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
        requestInFlightRef.current = false;
      }
    },
    [debouncedQuery, hasMore, loadingMore, setCurrentWhiteboard, whiteboardId]
  );
  const fetchDataRef = useRef(fetchData);

  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchRef.current > 30000;
      const hasLoadedCurrentWhiteboard =
        Boolean(whiteboardId) &&
        loadedWhiteboardIdRef.current === whiteboardId &&
        lastFetchRef.current > 0;
      if (!hasLoadedCurrentWhiteboard || isStale) {
        fetchData({ page: 0, replace: true });
      }
    }, [fetchData, whiteboardId])
  );

  useEffect(() => {
    if (!whiteboardId) return;
    if (loadedWhiteboardIdRef.current !== whiteboardId) return;
    fetchDataRef.current({ page: 0, replace: true });
  }, [debouncedQuery, whiteboardId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData({ page: 0, replace: true });
    setRefreshing(false);
  }, [fetchData]);

  const handleLoadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    await fetchData({ page: page + 1, replace: false });
  }, [fetchData, hasMore, loading, loadingMore, page]);

  const handleToggleBookmark = useCallback(
    async (questionId: string) => {
      const question = questions.find((item) => item.id === questionId);
      if (!question) {
        return;
      }

      try {
        if (question.isBookmarked) {
          await bookmarkService.remove(questionId);
        } else {
          await bookmarkService.add(questionId);
        }

        setQuestions((previousQuestions) =>
          previousQuestions.map((item) =>
            item.id === questionId ? { ...item, isBookmarked: !item.isBookmarked } : item
          )
        );
      } catch (error: unknown) {
        Alert.alert('Error', extractErrorMessage(error));
      }
    },
    [questions]
  );

  const handleTogglePin = useCallback(
    async (questionId: string) => {
      if (!whiteboardId || !isFaculty) {
        return;
      }

      const question = questions.find((item) => item.id === questionId);
      if (!question) {
        return;
      }

      const nextPinned = !question.isPinned;
      setQuestions((previousQuestions) =>
        previousQuestions.map((item) =>
          item.id === questionId ? { ...item, isPinned: nextPinned } : item
        )
      );

      try {
        if (nextPinned) {
          await questionService.pinQuestion(whiteboardId, questionId);
        } else {
          await questionService.unpinQuestion(whiteboardId, questionId);
        }
      } catch (error: unknown) {
        setQuestions((previousQuestions) =>
          previousQuestions.map((item) =>
            item.id === questionId ? { ...item, isPinned: question.isPinned } : item
          )
        );
        Alert.alert('Error', extractErrorMessage(error));
      }
    },
    [isFaculty, questions, whiteboardId]
  );

  const handleVerifyComment = useCallback(
    async (questionId: string, comment: CommentResponse) => {
      if (!whiteboardId || !isFaculty) {
        return;
      }

      const question = questions.find((item) => item.id === questionId);
      if (!question) {
        return;
      }

      const trimmedCommentBody = comment.body.trim();
      const verifiedAnswerPreview =
        trimmedCommentBody.length > 160
          ? `${trimmedCommentBody.slice(0, 160)}…`
          : trimmedCommentBody;

      setQuestions((previousQuestions) =>
        previousQuestions.map((item) =>
          item.id === questionId
            ? {
                ...item,
                status: 'CLOSED',
                verifiedAnswerId: comment.id,
                verifiedAnswerPreview,
                verifiedAnswerAuthorName: comment.authorName,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );

      try {
        await commentService.markVerifiedAnswer(whiteboardId, questionId, comment.id);
      } catch (error: unknown) {
        setQuestions((previousQuestions) =>
          previousQuestions.map((item) => (item.id === questionId ? question : item))
        );
        Alert.alert('Error', extractErrorMessage(error));
      }
    },
    [isFaculty, questions, whiteboardId]
  );

  const openReportModal = useCallback((questionId: string) => {
    setReportTarget({ questionId });
    setReportModalVisible(true);
  }, []);

  const closeReportModal = useCallback(() => {
    setReportModalVisible(false);
    setReportTarget(null);
  }, []);

  const handleTopicFilter = useCallback((nextFilter: 'ALL' | string) => {
    setTopicFilter(nextFilter);
  }, []);

  const clearFilters = useCallback(() => {
    setTopicFilter('ALL');
    setSearchQuery('');
  }, []);

  const topicFilters = useMemo(
    () =>
      Array.from(
        new Map(
          questions
            .filter((question) => question.topicId && question.topicName)
            .map((question) => [question.topicId as string, question.topicName as string])
        ),
        ([topicId, name]) => ({ id: topicId, name })
      ),
    [questions]
  );

  const sections: FeedSection[] = useMemo(() => {
    const topicMatched = questions.filter(
      (question) => topicFilter === 'ALL' || question.topicId === topicFilter
    );

    if (isSearching) {
      if (topicMatched.length === 0) {
        return [];
      }

      return [
        {
          key: 'open',
          title: `Search results · ${topicMatched.length}`,
          data: sortQuestions(topicMatched, sortMode),
        },
      ];
    }

    const pinned = topicMatched.filter((q) => q.isPinned);
    const open = topicMatched.filter((q) => !q.isPinned && q.status === 'OPEN');
    const answered = topicMatched.filter(
      (q) => !q.isPinned && q.status === 'CLOSED' && q.verifiedAnswerId
    );
    const closed = topicMatched.filter(
      (q) => !q.isPinned && q.status === 'CLOSED' && !q.verifiedAnswerId
    );

    const built: FeedSection[] = [];
    if (pinned.length > 0) {
      built.push({ key: 'pinned', title: `Pinned · ${pinned.length}`, data: pinned });
    }
    if (open.length > 0) {
      built.push({
        key: 'open',
        title: `Open · ${open.length}`,
        data: sortQuestions(open, sortMode),
      });
    }
    if (answered.length > 0) {
      built.push({
        key: 'answered',
        title: `Answered · ${answered.length}`,
        data: sortQuestions(answered, sortMode),
      });
    }
    if (closed.length > 0) {
      built.push({
        key: 'closed',
        title: `Closed · ${closed.length}`,
        data: sortQuestions(closed, sortMode),
      });
    }
    return built;
  }, [isSearching, questions, sortMode, topicFilter]);

  const stats: FeedStats = useMemo(() => {
    const topicMatched = questions.filter(
      (question) => topicFilter === 'ALL' || question.topicId === topicFilter
    );
    const pinned = topicMatched.filter((question) => question.isPinned).length;
    const answered = topicMatched.filter(
      (question) => !question.isPinned && question.status === 'CLOSED' && question.verifiedAnswerId
    ).length;
    const open = topicMatched.filter(
      (question) => !question.isPinned && question.status === 'OPEN'
    ).length;

    return {
      pinned,
      open,
      answered,
      total: topicMatched.length,
    };
  }, [questions, topicFilter]);

  useEffect(() => {
    if (!whiteboardId) {
      return;
    }

    const unsubscribeLocalDelete = subscribeToQuestionDeleted((event) => {
      if (event.whiteboardId !== whiteboardId) {
        return;
      }

      locallyDeletedQuestionIdsRef.current.add(event.questionId);
      setQuestions((previousQuestions) =>
        previousQuestions.filter((question) => question.id !== event.questionId)
      );
    });

    const subscription = subscribe(`/topic/whiteboard/${whiteboardId}/questions`, (frame) => {
      setQuestions((previousQuestions) => reconcileQuestionEvent(previousQuestions, frame.body));
    });

    return () => {
      unsubscribeLocalDelete();
      subscription?.unsubscribe();
    };
  }, [subscribe, whiteboardId]);

  return {
    whiteboard,
    questions,
    sections,
    stats,
    topicFilters,
    loading,
    refreshing,
    loadError,
    loadingMore,
    topicFilter,
    searchQuery,
    sortMode,
    isSearching,
    reportModalVisible,
    reportTarget,
    isFaculty,
    currentUserId: user?.id,
    handleRefresh,
    handleLoadMore,
    handleToggleBookmark,
    handleTogglePin,
    handleVerifyComment,
    handleTopicFilter,
    clearFilters,
    setSearchQuery,
    setSortMode,
    openReportModal,
    closeReportModal,
  };
}
