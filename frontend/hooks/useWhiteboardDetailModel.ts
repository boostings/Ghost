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

export type SortMode = 'recent' | 'topVoted' | 'mostCommented';

export const SORT_OPTIONS: Array<{ label: string; value: SortMode }> = [
  { label: 'Recent activity', value: 'recent' },
  { label: 'Most upvoted', value: 'topVoted' },
  { label: 'Most commented', value: 'mostCommented' },
];

export type FeedSection = {
  key: 'pinned' | 'open' | 'answered';
  title: string;
  data: QuestionResponse[];
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

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
      return copy.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
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

  const isFaculty = user?.role === 'FACULTY';
  const isSearching = debouncedQuery.trim().length > 0;

  useEffect(() => {
    loadedWhiteboardIdRef.current = null;
    lastFetchRef.current = 0;
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
          ? questionService.search({
              q: trimmedQuery,
              whiteboard: whiteboardId,
              page: nextPage,
              size: PAGE_SIZE,
            })
          : questionService.list(whiteboardId, { page: nextPage, size: PAGE_SIZE });

        const [nextWhiteboard, questionPage] = await Promise.all([
          replace ? whiteboardService.getById(whiteboardId) : Promise.resolve(null),
          questionsPromise,
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

  // Re-run feed query when debounced search query changes (after the page is already loaded).
  useEffect(() => {
    if (!whiteboardId) return;
    if (loadedWhiteboardIdRef.current !== whiteboardId) return;
    fetchData({ page: 0, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const answered = topicMatched.filter((q) => !q.isPinned && q.verifiedAnswerId);
    const open = topicMatched.filter((q) => !q.isPinned && !q.verifiedAnswerId);

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
    return built;
  }, [isSearching, questions, sortMode, topicFilter]);

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
    sections,
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
    handleRefresh,
    handleLoadMore,
    handleToggleBookmark,
    handleTopicFilter,
    clearFilters,
    setSearchQuery,
    setSortMode,
    openReportModal,
    closeReportModal,
  };
}
