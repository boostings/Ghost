import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { questionService } from '../services/questionService';
import { whiteboardService } from '../services/whiteboardService';
import { bookmarkService } from '../services/bookmarkService';
import { extractErrorMessage } from './useApi';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import type { QuestionResponse, QuestionStatus, WhiteboardResponse } from '../types';

export type FilterStatus = 'ALL' | QuestionStatus;
type WhiteboardFilter = 'ALL' | string;
type TopicFilter = 'ALL' | string;

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;

type ReportTarget = {
  questionId?: string;
  commentId?: string;
};

export function useQuestionSearchModel() {
  const storeWhiteboards = useWhiteboardStore((state) => state.whiteboards);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuestionResponse[]>([]);
  const [fallbackWhiteboards, setFallbackWhiteboards] = useState<WhiteboardResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [whiteboardFilter, setWhiteboardFilter] = useState<WhiteboardFilter>('ALL');
  const [topicFilter, setTopicFilter] = useState<TopicFilter>('ALL');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const availableWhiteboards = storeWhiteboards.length > 0 ? storeWhiteboards : fallbackWhiteboards;

  const whiteboardLookup = useMemo(
    () => new Map(availableWhiteboards.map((whiteboard) => [whiteboard.id, whiteboard])),
    [availableWhiteboards]
  );

  const availableTopics = useMemo(
    () =>
      Array.from(
        new Map(
          results
            .filter((item) => item.topicId && item.topicName)
            .map((item) => [item.topicId as string, item.topicName as string])
        ),
        ([id, name]) => ({ id, name })
      ).sort((left, right) => left.name.localeCompare(right.name)),
    [results]
  );

  const activeFilters = useMemo(() => {
    const filters: string[] = [];

    if (statusFilter !== 'ALL') {
      filters.push(statusFilter === 'OPEN' ? 'Open only' : 'Closed only');
    }

    if (whiteboardFilter !== 'ALL') {
      const whiteboard = whiteboardLookup.get(whiteboardFilter);
      filters.push(whiteboard ? whiteboard.courseCode : 'Class selected');
    }

    if (topicFilter !== 'ALL') {
      const topic = availableTopics.find((item) => item.id === topicFilter);
      filters.push(topic ? topic.name : 'Topic selected');
    }

    return filters;
  }, [availableTopics, statusFilter, topicFilter, whiteboardFilter, whiteboardLookup]);

  const resultSummary = hasSearched
    ? `${results.length} matching question${results.length === 1 ? '' : 's'}`
    : 'Search by keyword, then narrow with filters.';

  useEffect(() => {
    let active = true;
    if (storeWhiteboards.length > 0) {
      return;
    }

    whiteboardService
      .getWhiteboards({ page: 0, size: PAGE_SIZE })
      .then((response) => {
        if (active) {
          setFallbackWhiteboards(response.content);
        }
      })
      .catch(() => {
        if (active) {
          setFallbackWhiteboards([]);
        }
      });

    return () => {
      active = false;
    };
  }, [storeWhiteboards.length]);

  const performSearch = useCallback(
    async (
      searchQuery: string,
      status: FilterStatus,
      selectedWhiteboard: WhiteboardFilter,
      selectedTopic: TopicFilter,
      nextPage = 0,
      replace = true
    ) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setHasSearched(false);
        setPage(0);
        setHasMore(false);
        setLoadError(null);
        return;
      }

      if (!replace && (!hasMore || loadingMore)) {
        return;
      }

      if (replace) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setHasSearched(true);

      try {
        const params: Record<string, string | number | undefined> = {
          q: searchQuery.trim(),
          page: nextPage,
          size: PAGE_SIZE,
        };

        if (status !== 'ALL') {
          params.status = status;
        }

        if (selectedWhiteboard !== 'ALL') {
          params.whiteboard = selectedWhiteboard;
        }

        if (selectedTopic !== 'ALL') {
          params.topic = selectedTopic;
        }

        const response = await questionService.searchQuestions(params);
        setResults((previousResults) =>
          replace ? response.content : [...previousResults, ...response.content]
        );
        setPage(nextPage);
        setHasMore(nextPage + 1 < response.totalPages);
        setLoadError(null);
      } catch {
        if (replace) {
          setResults([]);
        }
        setHasMore(false);
        setLoadError('Search failed. Please try again.');
      } finally {
        if (replace) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [hasMore, loadingMore]
  );

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        performSearch(text, statusFilter, whiteboardFilter, topicFilter, 0, true);
      }, SEARCH_DEBOUNCE_MS);
    },
    [performSearch, statusFilter, topicFilter, whiteboardFilter]
  );

  const submitSearch = useCallback(() => {
    return performSearch(query, statusFilter, whiteboardFilter, topicFilter, 0, true);
  }, [performSearch, query, statusFilter, topicFilter, whiteboardFilter]);

  const handleStatusFilter = useCallback(
    (status: FilterStatus) => {
      setStatusFilter(status);
      if (query.trim()) {
        performSearch(query, status, whiteboardFilter, topicFilter, 0, true);
      }
    },
    [performSearch, query, topicFilter, whiteboardFilter]
  );

  const handleWhiteboardFilter = useCallback(
    (selectedWhiteboard: WhiteboardFilter) => {
      setWhiteboardFilter(selectedWhiteboard);
      setTopicFilter('ALL');
      if (query.trim()) {
        performSearch(query, statusFilter, selectedWhiteboard, 'ALL', 0, true);
      }
    },
    [performSearch, query, statusFilter]
  );

  const handleTopicFilter = useCallback(
    (selectedTopic: TopicFilter) => {
      setTopicFilter(selectedTopic);
      if (query.trim()) {
        performSearch(query, statusFilter, whiteboardFilter, selectedTopic, 0, true);
      }
    },
    [performSearch, query, statusFilter, whiteboardFilter]
  );

  const handleClearQuery = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setQuery('');
    performSearch('', statusFilter, whiteboardFilter, topicFilter, 0, true);
  }, [performSearch, statusFilter, topicFilter, whiteboardFilter]);

  const handleLoadMore = useCallback(async () => {
    if (!query.trim() || !hasMore || loading || loadingMore) {
      return;
    }

    await performSearch(query, statusFilter, whiteboardFilter, topicFilter, page + 1, false);
  }, [
    hasMore,
    loading,
    loadingMore,
    page,
    performSearch,
    query,
    statusFilter,
    topicFilter,
    whiteboardFilter,
  ]);

  const toggleBookmark = useCallback(
    async (questionId: string) => {
      const question = results.find((item) => item.id === questionId);
      if (!question) {
        return;
      }

      try {
        if (question.isBookmarked) {
          await bookmarkService.remove(questionId);
        } else {
          await bookmarkService.add(questionId);
        }

        setResults((previousResults) =>
          previousResults.map((item) =>
            item.id === questionId
              ? {
                  ...item,
                  isBookmarked: !item.isBookmarked,
                }
              : item
          )
        );
      } catch (error: unknown) {
        Alert.alert('Error', extractErrorMessage(error));
      }
    },
    [results]
  );

  const openReportModal = useCallback((target: ReportTarget) => {
    setReportTarget(target);
    setReportModalVisible(true);
  }, []);

  const closeReportModal = useCallback(() => {
    setReportModalVisible(false);
    setReportTarget(null);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    query,
    results,
    availableWhiteboards,
    availableTopics,
    whiteboardLookup,
    loading,
    loadingMore,
    hasSearched,
    statusFilter,
    whiteboardFilter,
    topicFilter,
    page,
    hasMore,
    loadError,
    reportModalVisible,
    reportTarget,
    activeFilters,
    resultSummary,
    handleQueryChange,
    submitSearch,
    handleStatusFilter,
    handleWhiteboardFilter,
    handleTopicFilter,
    handleClearQuery,
    handleLoadMore,
    toggleBookmark,
    openReportModal,
    closeReportModal,
  };
}
