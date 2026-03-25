import React, { useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Platform,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  type GestureResponderEvent,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import GlassInput from '../../components/ui/GlassInput';
import GlassCard from '../../components/ui/GlassCard';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import ReportModal from '../../components/ReportModal';
import ScreenWrapper from '../../components/ui/ScreenWrapper';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useQuestionSearchModel, type FilterStatus } from '../../hooks/useQuestionSearchModel';
import { formatDate } from '../../utils/formatDate';
import type { QuestionResponse } from '../../types';

const STATUS_FILTERS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
];

function renderHighlightedText(
  text: string,
  searchQuery: string,
  textStyle: StyleProp<TextStyle>,
  highlightStyle: StyleProp<TextStyle>,
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
  const cardEntry = useRef(new Animated.Value(0)).current;
  const {
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
  } = useQuestionSearchModel();

  useEffect(() => {
    if (results.length === 0) {
      cardEntry.setValue(0);
      return;
    }
    if (page !== 0) {
      return;
    }
    cardEntry.setValue(0);
    Animated.timing(cardEntry, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, [cardEntry, page, results.length]);

  const stopCardPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

  const renderQuestionItem = useCallback(
    ({ item, index }: { item: QuestionResponse; index: number }) => {
      const classCode = whiteboardLookup.get(item.whiteboardId)?.courseCode ?? 'CLASS';
      const animationStart = Math.min(index * 0.08, 0.72);
      const animationEnd = Math.min(animationStart + 0.24, 1);
      const opacity = cardEntry.interpolate({
        inputRange: [animationStart, animationEnd],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });
      const translateY = cardEntry.interpolate({
        inputRange: [animationStart, animationEnd],
        outputRange: [18, 0],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View style={[styles.questionCardEntry, { opacity, transform: [{ translateY }] }]}>
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
            <View style={styles.questionTopRow}>
              <View style={styles.badgeRow}>
                <View style={styles.classBadge}>
                  <Text style={styles.classBadgeText}>{classCode}</Text>
                </View>
                {item.topicName && <TopicBadge name={item.topicName} style={styles.topicBadge} />}
              </View>
              <StatusBadge status={item.status} />
            </View>

            {renderHighlightedText(
              item.title,
              query,
              styles.questionTitle,
              styles.highlightText,
              2
            )}

            {renderHighlightedText(
              item.isHidden ? '[hidden]' : item.body,
              query,
              styles.questionBody,
              styles.highlightText,
              2
            )}

            <View style={styles.questionMetaRow}>
              <Text style={styles.authorText}>{item.authorName}</Text>
              <Text style={styles.dotSeparator}>{' \u00B7 '}</Text>
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>

            <View style={styles.questionFooter}>
              <View style={styles.statPill}>
                <Text style={styles.statText}>
                  {'\u25B2'} {item.karmaScore}
                </Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statText}>
                  {'\u{1F4AC}'} {item.commentCount}
                </Text>
              </View>
              <View style={styles.footerRight}>
                <TouchableOpacity
                  onPress={(event) => {
                    stopCardPress(event);
                    toggleBookmark(item.id);
                  }}
                  style={styles.footerActionButton}
                  accessibilityRole="button"
                  accessibilityLabel={item.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                >
                  <Text style={styles.footerActionIcon}>
                    {item.isBookmarked ? '\u2605' : '\u2606'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(event) => {
                    stopCardPress(event);
                    openReportModal({ questionId: item.id });
                  }}
                  style={styles.footerActionButton}
                  accessibilityRole="button"
                  accessibilityLabel="Report question"
                >
                  <Text style={styles.footerActionIcon}>{'\u{1F6A9}'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      );
    },
    [cardEntry, openReportModal, query, router, toggleBookmark, whiteboardLookup]
  );

  return (
    <ScreenWrapper edges={['top']}>
      <View style={styles.headerSection}>
        <Text style={styles.eyebrowText}>Search</Text>
        <Text style={styles.headerTitle}>Discover Answers Faster</Text>
        <Text style={styles.headerSubtitle}>{resultSummary}</Text>
      </View>

      <GlassCard style={styles.searchHeroCard} blurIntensity={72}>
        <View style={styles.searchInputRow}>
          <GlassInput
            placeholder="Search by question title or body..."
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            onSubmitEditing={submitSearch}
            style={styles.searchInput}
            icon={<Text style={styles.searchInputIcon}>{'\u{1F50D}'}</Text>}
          />
          {query.trim() ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearQuery}
              accessibilityRole="button"
              accessibilityLabel="Clear search query"
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.searchHintText}>
          Live search runs after you pause typing for a moment.
        </Text>
      </GlassCard>

      <GlassCard style={styles.filterPanelCard} blurIntensity={62}>
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Status</Text>
          <View style={styles.filterWrap}>
            {STATUS_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterChip,
                  statusFilter === filter.value && styles.filterChipActive,
                ]}
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
                style={[
                  styles.filterChipText,
                  topicFilter === 'ALL' && styles.filterChipTextActive,
                ]}
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
      </GlassCard>

      {activeFilters.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersRow}
        >
          {activeFilters.map((filterLabel) => (
            <View key={filterLabel} style={styles.activeFilterPill}>
              <Text style={styles.activeFilterText}>{filterLabel}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {hasSearched && (
        <View style={styles.resultsSummaryRow}>
          <Text style={styles.resultsSummaryText}>{resultSummary}</Text>
          <Text style={styles.resultsSummarySubtext}>Sorted by relevance</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingSkeleton type="question" count={4} />
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderQuestionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, results.length === 0 && styles.emptyList]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            hasSearched ? (
              <EmptyState
                icon={'\u{1F50D}'}
                title="No matching questions"
                subtitle={loadError || 'Try broader keywords or clear one filter at a time.'}
              />
            ) : (
              <EmptyState
                icon={'\u{1F50E}'}
                title="Search across your whiteboards"
                subtitle="Look up any question and use filters to narrow by class, topic, or status."
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

      <ReportModal
        visible={reportModalVisible}
        onClose={closeReportModal}
        target={reportTarget}
        title="Report Question"
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  eyebrowText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSubtitle: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
    lineHeight: Fonts.lineHeights.md,
  },
  searchHeroCard: {
    marginHorizontal: 24,
    marginBottom: 12,
    borderColor: 'rgba(255,255,255,0.35)',
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 22px rgba(187,39,68,0.24)',
      },
      default: {
        shadowColor: Colors.primary,
        shadowOpacity: 0.24,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 8,
      },
    }),
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  searchInputIcon: {
    fontSize: 16,
    color: Colors.primaryLight,
  },
  clearButton: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  clearButtonText: {
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
  },
  searchHintText: {
    marginTop: 10,
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
  },
  filterPanelCard: {
    marginHorizontal: 24,
    marginBottom: 10,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  filterSection: {
    marginBottom: 10,
  },
  filterTitle: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  filterWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  filterRow: {
    gap: 8,
    paddingRight: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: 'rgba(187,39,68,0.28)',
    borderColor: Colors.primaryLight,
  },
  filterChipText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.text,
  },
  activeFiltersRow: {
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 8,
  },
  activeFilterPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 30,
    backgroundColor: 'rgba(212,85,109,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(212,85,109,0.45)',
    justifyContent: 'center',
  },
  activeFilterText: {
    color: Colors.primaryLight,
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
  },
  resultsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  resultsSummaryText: {
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
  },
  resultsSummarySubtext: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 12,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    paddingTop: 4,
  },
  emptyList: {
    flexGrow: 1,
  },
  questionCardEntry: {
    marginBottom: 14,
  },
  questionCard: {
    borderColor: 'rgba(255,255,255,0.32)',
  },
  questionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  classBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  classBadgeText: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  topicBadge: {
    marginRight: 2,
  },
  questionTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    lineHeight: Fonts.lineHeights.xl,
  },
  questionBody: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    lineHeight: Fonts.lineHeights.md,
    marginBottom: 12,
  },
  highlightText: {
    color: '#FFE08A',
    backgroundColor: 'rgba(255,224,138,0.18)',
    fontWeight: '700',
  },
  questionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  questionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 12,
  },
  statPill: {
    minHeight: 32,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginRight: 8,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  statText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
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
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  footerActionIcon: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  footerLoader: {
    paddingVertical: 14,
    alignItems: 'center',
  },
});
