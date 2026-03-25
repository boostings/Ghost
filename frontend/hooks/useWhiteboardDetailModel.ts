import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { bookmarkService } from '../services/bookmarkService';
import { questionService } from '../services/questionService';
import { whiteboardService } from '../services/whiteboardService';
import { useWebSocket } from './useWebSocket';
import { useAuthStore } from '../stores/authStore';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { reconcileQuestionEvent } from '../utils/questionEvents';
import type { QuestionResponse, QuestionStatus, WhiteboardResponse } from '../types';

export type FeedStatusFilter = 'ALL' | QuestionStatus;

export const FEED_STATUS_FILTERS: Array<{ label: string; value: FeedStatusFilter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
];

const PAGE_SIZE = 20;

type ReportTarget = {
  questionId?: string;
  commentId?: string;
};

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
  const [statusFilter, setStatusFilter] = useState<FeedStatusFilter>('ALL');
  const [topicFilter, setTopicFilter] = useState<'ALL' | string>('ALL');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const lastFetchRef = useRef(0);

  const isFaculty = user?.role === 'FACULTY';

  const fetchData = useCallback(
    async (options?: { page?: number; replace?: boolean }) => {
      if (!whiteboardId) {
        setLoadError('Missing whiteboard id.');
        setLoading(false);
        return;
      }

      const nextPage = options?.page ?? 0;
      const replace = options?.replace ?? true;
      if (!replace && (!hasMore || loadingMore)) {
        return;
      }

      try {
        if (replace) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const [nextWhiteboard, questionPage] = await Promise.all([
          replace ? whiteboardService.getById(whiteboardId) : Promise.resolve(whiteboard),
          questionService.list(whiteboardId, { page: nextPage, size: PAGE_SIZE }),
        ]);

        if (nextWhiteboard) {
          setWhiteboard(nextWhiteboard);
          setCurrentWhiteboard(nextWhiteboard);
        }

        setQuestions((previousQuestions) =>
          replace ? questionPage.content : [...previousQuestions, ...questionPage.content]
        );
        setPage(nextPage);
        setHasMore(nextPage + 1 < questionPage.totalPages);
        setLoadError(null);
        lastFetchRef.current = Date.now();
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
      }
    },
    [hasMore, loadingMore, setCurrentWhiteboard, whiteboard, whiteboardId]
  );

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchRef.current > 30000;
      if (!whiteboard || questions.length === 0 || isStale) {
        fetchData({ page: 0, replace: true });
      }
    }, [fetchData, questions.length, whiteboard])
  );

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
            item.id === questionId
              ? {
                  ...item,
                  isBookmarked: !item.isBookmarked,
                }
              : item
          )
        );
      } catch {
        Alert.alert('Error', 'Failed to update bookmark.');
      }
    },
    [questions]
  );

  const openReportModal = useCallback((questionId: string) => {
    setReportTarget({ questionId });
    setReportModalVisible(true);
  }, []);

  const closeReportModal = useCallback(() => {
    setReportModalVisible(false);
    setReportTarget(null);
  }, []);

  const handleStatusFilter = useCallback((nextFilter: FeedStatusFilter) => {
    setStatusFilter(nextFilter);
  }, []);

  const handleTopicFilter = useCallback((nextFilter: 'ALL' | string) => {
    setTopicFilter(nextFilter);
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('ALL');
    setTopicFilter('ALL');
  }, []);

  const pinnedQuestions = useMemo(
    () => questions.filter((question) => question.isPinned),
    [questions]
  );
  const regularQuestions = useMemo(
    () => questions.filter((question) => !question.isPinned),
    [questions]
  );
  const orderedQuestions = useMemo(
    () => [...pinnedQuestions, ...regularQuestions],
    [pinnedQuestions, regularQuestions]
  );

  const topicFilters = useMemo(
    () =>
      Array.from(
        new Map(
          questions
            .filter((question) => question.topicId && question.topicName)
            .map((question) => [question.topicId as string, question.topicName as string])
        ),
        ([id, name]) => ({ id, name })
      ),
    [questions]
  );

  const filteredQuestions = useMemo(
    () =>
      orderedQuestions.filter((question) => {
        const statusMatch = statusFilter === 'ALL' || question.status === statusFilter;
        const topicMatch = topicFilter === 'ALL' || question.topicId === topicFilter;
        return statusMatch && topicMatch;
      }),
    [orderedQuestions, statusFilter, topicFilter]
  );

  useEffect(() => {
    if (!whiteboardId) {
      return;
    }

    const subscription = subscribe(`/topic/whiteboard/${whiteboardId}/questions`, (frame) => {
      setQuestions((previousQuestions) => reconcileQuestionEvent(previousQuestions, frame.body));
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [subscribe, whiteboardId]);

  return {
    whiteboard,
    questions,
    filteredQuestions,
    pinnedQuestions,
    topicFilters,
    loading,
    refreshing,
    loadError,
    loadingMore,
    statusFilter,
    topicFilter,
    reportModalVisible,
    reportTarget,
    isFaculty,
    handleRefresh,
    handleLoadMore,
    handleToggleBookmark,
    handleStatusFilter,
    handleTopicFilter,
    clearFilters,
    openReportModal,
    closeReportModal,
  };
}
