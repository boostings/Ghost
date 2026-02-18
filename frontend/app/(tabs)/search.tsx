import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import GlassInput from '../../components/ui/GlassInput';
import GlassCard from '../../components/ui/GlassCard';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { questionService } from '../../services/questionService';
import { formatDate } from '../../utils/formatDate';
import type { QuestionResponse, QuestionStatus } from '../../types';

type FilterStatus = 'ALL' | QuestionStatus;

const STATUS_FILTERS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
];

export default function SearchScreen() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuestionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string, status: FilterStatus) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setHasSearched(true);
      try {
        const params: Record<string, string | number | undefined> = {
          q: searchQuery.trim(),
          page: 0,
          size: 20,
        };
        if (status !== 'ALL') {
          params.status = status;
        }
        const response = await questionService.search(params);
        setResults(response.content);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(text, statusFilter);
    }, 400);
  };

  const handleStatusFilter = (status: FilterStatus) => {
    setStatusFilter(status);
    if (query.trim()) {
      performSearch(query, status);
    }
  };

  const renderQuestionItem = ({ item }: { item: QuestionResponse }) => (
    <GlassCard
      style={styles.questionCard}
      onPress={() => router.push(`/question/${item.id}?whiteboardId=${item.whiteboardId}`)}
    >
      <View style={styles.questionHeader}>
        {item.topicName && (
          <TopicBadge name={item.topicName} style={styles.topicBadge} />
        )}
        <StatusBadge status={item.status} />
      </View>

      <Text style={styles.questionTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={styles.questionBody} numberOfLines={2}>
        {item.body}
      </Text>

      <View style={styles.questionFooter}>
        <Text style={styles.authorText}>{item.authorName}</Text>
        <Text style={styles.dotSeparator}>{" \u00B7 "}</Text>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        <View style={styles.footerRight}>
          <Text style={styles.statText}>
            {"\u25B2"} {item.karmaScore}
          </Text>
          <Text style={styles.statText}>
            {"\u{1F4AC}"} {item.commentCount}
          </Text>
        </View>
      </View>
    </GlassCard>
  );

  return (
    <LinearGradient
      colors={['#1A1A2E', '#16213E', '#0F3460']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
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
            onSubmitEditing={() => performSearch(query, statusFilter)}
            style={styles.searchInput}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                statusFilter === filter.value && styles.filterChipActive,
              ]}
              onPress={() => handleStatusFilter(filter.value)}
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
            contentContainerStyle={[
              styles.listContent,
              results.length === 0 && styles.emptyList,
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              hasSearched ? (
                <EmptyState
                  icon={"\u{1F50D}"}
                  title="No Results"
                  subtitle="Try different keywords or adjust your filters"
                />
              ) : (
                <EmptyState
                  icon={"\u{1F50E}"}
                  title="Search Across All Classes"
                  subtitle="Find questions, answers, and discussions from any of your enrolled classes"
                />
              )
            }
          />
        )}
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
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
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
});
