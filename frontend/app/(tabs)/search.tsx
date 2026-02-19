import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import GlassInput from '../../components/ui/GlassInput';
import GlassCard from '../../components/ui/GlassCard';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ScreenWrapper from '../../components/ui/ScreenWrapper';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { questionService } from '../../services/questionService';
import { whiteboardService } from '../../services/whiteboardService';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { formatDate } from '../../utils/formatDate';
import type { QuestionResponse, QuestionStatus, WhiteboardResponse } from '../../types';

type FilterStatus = 'ALL' | QuestionStatus;
type WhiteboardFilter = 'ALL' | string;
type TopicFilter = 'ALL' | string;

const STATUS_FILTERS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
];

function renderHighlightedText(
  text: string,
  searchQuery: string,
  textStyle: object,
  highlightStyle: object,
  numberOfLines?: number
) {
  const normalizedQuery = searchQuery.trim();
  if (!normalizedQuery) {
    return (
      <Text style={textStyle} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'ig');
  const queryLower = normalizedQuery.toLowerCase();
  const parts = text.split(regex);

  return (
    <Text style={textStyle} numberOfLines={numberOfLines}>
      {parts.map((part, index) => (
        <Text
          key={`${part}-${index}`}
          style={part.toLowerCase() === queryLower ? [textStyle, highlightStyle] : textStyle}
        >
          {part}
        </Text>
      ))}
    </Text>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const storeWhiteboards = useWhiteboardStore((state) => state.whiteboards);

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAGE_SIZE = 20;

  const availableWhiteboards = storeWhiteboards.length > 0 ? storeWhiteboards : fallbackWhiteboards;

  const availableTopics = Array.from(
    new Map(
      results
        .filter((item) => item.topicId && item.topicName)
        .map((item) => [item.topicId as string, item.topicName as string])
    ),
    ([id, name]) => ({ id, name })
  );

  useEffect(() => {
    let active = true;
    if (storeWhiteboards.length > 0) {
      return;
    }

    whiteboardService
      .list(0, PAGE_SIZE)
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
  }, [PAGE_SIZE, storeWhiteboards.length]);

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
        const response = await questionService.search(params);
        setResults((prev) => (replace ? response.content : [...prev, ...response.content]));
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

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(text, statusFilter, whiteboardFilter, topicFilter, 0, true);
    }, 400);
  };

  const handleStatusFilter = (status: FilterStatus) => {
    setStatusFilter(status);
    if (query.trim()) {
      performSearch(query, status, whiteboardFilter, topicFilter, 0, true);
    }
  };

  const handleWhiteboardFilter = (selected: WhiteboardFilter) => {
    setWhiteboardFilter(selected);
    setTopicFilter('ALL');
    if (query.trim()) {
      performSearch(query, statusFilter, selected, 'ALL', 0, true);
    }
  };

  const handleTopicFilter = (selected: TopicFilter) => {
    setTopicFilter(selected);
    if (query.trim()) {
      performSearch(query, statusFilter, whiteboardFilter, selected, 0, true);
    }
  };

  const handleLoadMore = async () => {
    if (!query.trim() || !hasMore || loading || loadingMore) {
      return;
    }
    await performSearch(query, statusFilter, whiteboardFilter, topicFilter, page + 1, false);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const renderQuestionItem = useCallback(
    ({ item }: { item: QuestionResponse }) => (
      <GlassCard
        style={styles.questionCard}
        accessibilityLabel={`Open question: ${item.title}`}
        onPress={() =>
          router.push({
            pathname: '/question/[id]',
            params: { id: item.id, whiteboardId: item.whiteboardId },
          })
        }
      >
        <View style={styles.questionHeader}>
          {item.topicName && <TopicBadge name={item.topicName} style={styles.topicBadge} />}
          <StatusBadge status={item.status} />
        </View>

        {renderHighlightedText(item.title, query, styles.questionTitle, styles.highlightText, 2)}

        {renderHighlightedText(
          item.isHidden ? '[hidden]' : item.body,
          query,
          styles.questionBody,
          styles.highlightText,
          2
        )}

        <View style={styles.questionFooter}>
          <Text style={styles.authorText}>{item.authorName}</Text>
          <Text style={styles.dotSeparator}>{' \u00B7 '}</Text>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          <View style={styles.footerRight}>
            <Text style={styles.statText}>
              {'\u25B2'} {item.karmaScore}
            </Text>
            <Text style={styles.statText}>
              {'\u{1F4AC}'} {item.commentCount}
            </Text>
          </View>
        </View>
      </GlassCard>
    ),
    [query, router]
  );

  return (
    <ScreenWrapper edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <GlassInput
          placeholder="Search across all your classes..."
          value={query}
          onChangeText={handleQueryChange}
          returnKeyType="search"
          onSubmitEditing={() =>
            performSearch(query, statusFilter, whiteboardFilter, topicFilter, 0, true)
          }
          style={styles.searchInput}
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Status</Text>
        <View style={styles.filterContainer}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive]}
              onPress={() => handleStatusFilter(filter.value)}
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
        <Text style={styles.filterTitle}>Class</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, whiteboardFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => handleWhiteboardFilter('ALL')}
            accessibilityRole="button"
            accessibilityLabel="Filter by all classes"
          >
            <Text
              style={[
                styles.filterChipText,
                whiteboardFilter === 'ALL' && styles.filterChipTextActive,
              ]}
            >
              All Classes
            </Text>
          </TouchableOpacity>
          {availableWhiteboards.map((whiteboard) => (
            <TouchableOpacity
              key={whiteboard.id}
              style={[
                styles.filterChip,
                whiteboardFilter === whiteboard.id && styles.filterChipActive,
              ]}
              onPress={() => handleWhiteboardFilter(whiteboard.id)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${whiteboard.courseCode}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  whiteboardFilter === whiteboard.id && styles.filterChipTextActive,
                ]}
              >
                {whiteboard.courseCode}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
            onPress={() => handleTopicFilter('ALL')}
            accessibilityRole="button"
            accessibilityLabel="Filter by all topics"
          >
            <Text
              style={[styles.filterChipText, topicFilter === 'ALL' && styles.filterChipTextActive]}
            >
              All Topics
            </Text>
          </TouchableOpacity>
          {availableTopics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={[styles.filterChip, topicFilter === topic.id && styles.filterChipActive]}
              onPress={() => handleTopicFilter(topic.id)}
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

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderQuestionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, results.length === 0 && styles.emptyList]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            hasSearched ? (
              <EmptyState
                icon={'\u{1F50D}'}
                title="No Results"
                subtitle={loadError || 'Try different keywords or adjust your filters'}
              />
            ) : (
              <EmptyState
                icon={'\u{1F50E}'}
                title="Search Across All Classes"
                subtitle="Find questions, answers, and discussions from any of your enrolled classes"
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
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  searchContainer: {
    paddingHorizontal: 24,
  },
  searchInput: {
    marginBottom: 4,
  },
  filterSection: {
    marginTop: 6,
  },
  filterTitle: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
  },
  filterRow: {
    paddingHorizontal: 24,
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  emptyList: {
    flexGrow: 1,
  },
  questionCard: {
    marginBottom: 12,
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
  highlightText: {
    color: Colors.warning,
    fontWeight: '700',
  },
  questionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  dotSeparator: {
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
    gap: 12,
  },
  statText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});
