import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Alert,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import ReportModal from '../../components/ReportModal';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useAuthStore } from '../../stores/authStore';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { whiteboardService } from '../../services/whiteboardService';
import { questionService } from '../../services/questionService';
import { bookmarkService } from '../../services/bookmarkService';
import { useWebSocket } from '../../hooks/useWebSocket';
import { formatDate } from '../../utils/formatDate';
import type { QuestionResponse, QuestionStatus, WhiteboardResponse } from '../../types';

type FeedStatusFilter = 'ALL' | QuestionStatus;

const FEED_STATUS_FILTERS: Array<{ label: string; value: FeedStatusFilter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
];

function sortQuestionsForFeed(questions: QuestionResponse[]): QuestionResponse[] {
  return [...questions].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function parseQuestionMessage(body: string): {
  type?: string;
  question?: QuestionResponse;
  questionId?: string;
} {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    const envelope = parsed as { type?: unknown; payload?: unknown; id?: unknown };
    const type = typeof envelope.type === 'string' ? envelope.type : undefined;
    const payload = envelope.payload ?? parsed;

    if (payload && typeof payload === 'object') {
      const payloadObj = payload as Record<string, unknown>;
      const payloadId = typeof payloadObj.id === 'string' ? payloadObj.id : undefined;
      const hasQuestionShape =
        typeof payloadObj.title === 'string' &&
        typeof payloadObj.body === 'string' &&
        typeof payloadObj.status === 'string';

      if (hasQuestionShape && payloadId) {
        return { type, question: payloadObj as unknown as QuestionResponse };
      }
      if (payloadId) {
        return { type, questionId: payloadId };
      }
    }

    const rootId = typeof envelope.id === 'string' ? envelope.id : undefined;
    return { type, questionId: rootId };
  } catch {
    return {};
  }
}

export default function WhiteboardDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const setCurrentWhiteboard = useWhiteboardStore((state) => state.setCurrentWhiteboard);

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
  const [reportTarget, setReportTarget] = useState<{
    questionId?: string;
    commentId?: string;
  } | null>(null);
  const lastFetchRef = useRef(0);
  const PAGE_SIZE = 20;
  const { subscribe } = useWebSocket();

  const isFaculty = user?.role === 'FACULTY';

  const fetchData = useCallback(
    async (options?: { page?: number; replace?: boolean }) => {
      if (!id) {
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

        const [wb, qs] = await Promise.all([
          replace ? whiteboardService.getById(id) : Promise.resolve(whiteboard),
          questionService.list(id, { page: nextPage, size: PAGE_SIZE, sort: 'recent' }),
        ]);
        if (wb) {
          setWhiteboard(wb);
          setCurrentWhiteboard(wb);
        }
        setQuestions((prev) => (replace ? qs.content : [...prev, ...qs.content]));
        setPage(nextPage);
        setHasMore(nextPage + 1 < qs.totalPages);
        lastFetchRef.current = Date.now();
        setLoadError(null);
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
    [hasMore, id, loadingMore, setCurrentWhiteboard, whiteboard]
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData({ page: 0, replace: true });
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    await fetchData({ page: page + 1, replace: false });
  };

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
        setQuestions((prev) =>
          prev.map((item) =>
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

  const handleOpenReportModal = useCallback((questionId: string) => {
    setReportTarget({ questionId });
    setReportModalVisible(true);
  }, []);

  const stopCardPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

  const pinnedQuestions = useMemo(() => questions.filter((q) => q.isPinned), [questions]);
  const regularQuestions = useMemo(() => questions.filter((q) => !q.isPinned), [questions]);
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

  const filteredQuestions = useMemo(() => {
    return orderedQuestions.filter((question) => {
      const statusMatch = statusFilter === 'ALL' || question.status === statusFilter;
      const topicMatch = topicFilter === 'ALL' || question.topicId === topicFilter;
      return statusMatch && topicMatch;
    });
  }, [orderedQuestions, statusFilter, topicFilter]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const subscription = subscribe(`/topic/whiteboard/${id}/questions`, (frame) => {
      const { type, question, questionId } = parseQuestionMessage(frame.body);
      const normalizedType = type?.toUpperCase() ?? '';
      const isDeleteEvent = normalizedType.includes('DELETE') || normalizedType.includes('REMOVE');

      if (isDeleteEvent && questionId) {
        setQuestions((prev) => prev.filter((existing) => existing.id !== questionId));
        return;
      }

      if (question) {
        setQuestions((prev) => {
          const index = prev.findIndex((existing) => existing.id === question.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = question;
            return sortQuestionsForFeed(next);
          }
          return sortQuestionsForFeed([question, ...prev]);
        });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [id, subscribe]);

  const renderQuestionCard = useCallback(
    ({ item }: { item: QuestionResponse }) => (
      <GlassCard
        style={[styles.questionCard, item.isPinned && styles.pinnedCard]}
        accessibilityLabel={`Open question: ${item.title}`}
        onPress={() =>
          router.push({
            pathname: '/question/[id]',
            params: { id: item.id, whiteboardId: id },
          })
        }
      >
        {item.isPinned && (
          <View style={styles.pinnedBanner}>
            <Text style={styles.pinnedIcon}>{'\u{1F4CC}'}</Text>
            <Text style={styles.pinnedText}>PINNED</Text>
          </View>
        )}

        <View style={styles.questionHeader}>
          {item.topicName && <TopicBadge name={item.topicName} style={styles.topicBadge} />}
          <StatusBadge status={item.status} />
        </View>

        <Text style={styles.questionTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.questionBody} numberOfLines={3}>
          {item.isHidden ? '[hidden]' : item.body}
        </Text>

        <View style={styles.questionFooter}>
          <Text style={styles.authorText}>{item.authorName}</Text>
          <Text style={styles.dotSep}>{' \u00B7 '}</Text>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          <View style={styles.footerRight}>
            <TouchableOpacity
              onPress={(event) => {
                stopCardPress(event);
                handleToggleBookmark(item.id);
              }}
              style={styles.footerActionButton}
              accessibilityRole="button"
              accessibilityLabel={item.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Text style={styles.footerActionIcon}>{item.isBookmarked ? '\u2605' : '\u2606'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(event) => {
                stopCardPress(event);
                handleOpenReportModal(item.id);
              }}
              style={styles.footerActionButton}
              accessibilityRole="button"
              accessibilityLabel="Report question"
            >
              <Text style={styles.footerActionIcon}>{'\u{1F6A9}'}</Text>
            </TouchableOpacity>
            <Text
              style={[
                styles.karmaText,
                item.karmaScore > 0 && styles.karmaPositive,
                item.karmaScore < 0 && styles.karmaNegative,
              ]}
            >
              {'\u25B2'} {item.karmaScore}
            </Text>
            <Text style={styles.commentText}>
              {'\u{1F4AC}'} {item.commentCount}
            </Text>
            {item.verifiedAnswerId && <Text style={styles.verifiedText}>{'\u2705'}</Text>}
          </View>
        </View>
      </GlassCard>
    ),
    [handleOpenReportModal, handleToggleBookmark, id, router]
  );

  if (loading) {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={styles.gradient}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.backButton} />
            <View style={styles.headerCenter}>
              <Text style={styles.courseCode}>Loading...</Text>
              <Text style={styles.courseName}>Fetching whiteboard</Text>
            </View>
            <View style={styles.headerButton} />
          </View>
          <View style={styles.skeletonWrapper}>
            <LoadingSkeleton type="question" count={4} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backArrow}>{'\u2190'}</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.courseCode}>{whiteboard?.courseCode || ''}</Text>
            <Text style={styles.courseName} numberOfLines={1}>
              {whiteboard?.courseName || ''}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/whiteboard/members',
                  params: { whiteboardId: id },
                })
              }
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="View whiteboard members"
            >
              <Text style={styles.headerButtonIcon}>{'\u{1F465}'}</Text>
            </TouchableOpacity>
            {isFaculty && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/whiteboard/settings',
                    params: { whiteboardId: id },
                  })
                }
                style={styles.headerButton}
                accessibilityRole="button"
                accessibilityLabel="Open whiteboard settings"
              >
                <Text style={styles.headerButtonIcon}>{'\u2699\uFE0F'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Status</Text>
          <View style={styles.filterContainer}>
            {FEED_STATUS_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterChip,
                  statusFilter === filter.value && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(filter.value)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${filter.label}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === filter.value && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Topic</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity
              style={[styles.filterChip, topicFilter === 'ALL' && styles.filterChipActive]}
              onPress={() => setTopicFilter('ALL')}
              accessibilityRole="button"
              accessibilityLabel="Filter by all topics"
            >
              <Text
                style={[
                  styles.filterChipText,
                  topicFilter === 'ALL' && styles.filterChipTextActive,
                ]}
              >
                All Topics
              </Text>
            </TouchableOpacity>
            {topicFilters.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={[styles.filterChip, topicFilter === topic.id && styles.filterChipActive]}
                onPress={() => setTopicFilter(topic.id)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by topic ${topic.name}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    topicFilter === topic.id && styles.filterChipTextActive,
                  ]}
                >
                  {topic.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Question Feed */}
        <FlatList
          data={filteredQuestions}
          renderItem={renderQuestionCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            filteredQuestions.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          ListHeaderComponent={
            pinnedQuestions.length > 0 ? (
              <Text style={styles.sectionLabel}>{pinnedQuestions.length} Pinned</Text>
            ) : null
          }
          ListEmptyComponent={
            questions.length > 0 ? (
              <EmptyState
                icon={'\u{1F50E}'}
                title="No Matching Questions"
                subtitle="Adjust filters to see more questions."
                actionLabel="Clear Filters"
                onAction={() => {
                  setStatusFilter('ALL');
                  setTopicFilter('ALL');
                }}
              />
            ) : (
              <EmptyState
                icon={'\u2753'}
                title="No Questions Yet"
                subtitle={loadError || 'Be the first to ask a question in this class!'}
                actionLabel="Ask a Question"
                onAction={() =>
                  router.push({
                    pathname: '/question/create',
                    params: { whiteboardId: id },
                  })
                }
              />
            )
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
        />

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: '/question/create',
              params: { whiteboardId: id },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Ask a question"
        >
          <Text style={styles.fabIcon}>{'+ Ask'}</Text>
        </TouchableOpacity>
        <ReportModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          target={reportTarget}
          title="Report Question"
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
  headerCenter: {
    flex: 1,
  },
  courseCode: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  courseName: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '600',
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
  filterSection: {
    marginTop: 8,
  },
  filterTitle: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  filterRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: 'rgba(108,99,255,0.25)',
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
  sectionLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  questionCard: {
    marginBottom: 12,
  },
  pinnedCard: {
    borderColor: 'rgba(255,187,51,0.3)',
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinnedIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  pinnedText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  topicBadge: {
    marginRight: 4,
  },
  questionTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  questionBody: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  questionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  dotSep: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
  },
  dateText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  footerRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  footerActionButton: {
    minHeight: 36,
    minWidth: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  footerActionIcon: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  karmaText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  karmaPositive: {
    color: Colors.success,
  },
  karmaNegative: {
    color: Colors.error,
  },
  commentText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  verifiedText: {
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonWrapper: {
    flex: 1,
    paddingTop: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  fabIcon: {
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    fontWeight: '700',
  },
});
