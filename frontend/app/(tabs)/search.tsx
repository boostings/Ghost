import React, { useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GlassInput from '../../components/ui/GlassInput';
import GlassCard from '../../components/ui/GlassCard';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import ReportModal from '../../components/ReportModal';
import ScreenWrapper from '../../components/ui/ScreenWrapper';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing } from '../../constants/spacing';
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
  const colors = useThemeColors();
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
                <View
                  style={[
                    styles.classBadge,
                    {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primaryFaint,
                    },
                  ]}
                >
                  <Text style={[styles.classBadgeText, { color: colors.primary }]}>
                    {classCode}
                  </Text>
                </View>
                {item.topicName && <TopicBadge name={item.topicName} style={styles.topicBadge} />}
              </View>
              <StatusBadge status={item.status} />
            </View>

            {renderHighlightedText(
              item.title,
              query,
              [styles.questionTitle, { color: colors.text }],
              [
                styles.highlightText,
                {
                  color: colors.primary,
                  backgroundColor: colors.primarySoft,
                },
              ],
              2
            )}

            {renderHighlightedText(
              item.isHidden ? '[hidden]' : item.body,
              query,
              [styles.questionBody, { color: colors.textSecondary }],
              [
                styles.highlightText,
                {
                  color: colors.primary,
                  backgroundColor: colors.primarySoft,
                },
              ],
              2
            )}

            <View style={styles.questionMetaRow}>
              <Text style={[styles.authorText, { color: colors.textMuted }]}>{item.authorName}</Text>
              <Text style={[styles.dotSeparator, { color: colors.textMuted }]}>{' · '}</Text>
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                {formatDate(item.createdAt)}
              </Text>
            </View>

            <View style={[styles.questionFooter, { borderTopColor: colors.surfaceBorder }]}>
              <View
                style={[
                  styles.statPill,
                  { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
                ]}
              >
                <Ionicons name="arrow-up" size={12} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {item.karmaScore}
                </Text>
              </View>
              <View
                style={[
                  styles.statPill,
                  { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
                ]}
              >
                <Ionicons name="chatbubble-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {item.commentCount}
                </Text>
              </View>
              <View style={styles.footerRight}>
                <TouchableOpacity
                  onPress={(event) => {
                    stopCardPress(event);
                    toggleBookmark(item.id);
                  }}
                  style={[
                    styles.footerActionButton,
                    {
                      backgroundColor: colors.surfaceLight,
                      borderColor: colors.surfaceBorder,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={item.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                >
                  <Ionicons
                    name={item.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={14}
                    color={item.isBookmarked ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(event) => {
                    stopCardPress(event);
                    openReportModal({ questionId: item.id });
                  }}
                  style={[
                    styles.footerActionButton,
                    {
                      backgroundColor: colors.surfaceLight,
                      borderColor: colors.surfaceBorder,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Report question"
                >
                  <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      );
    },
    [cardEntry, colors, openReportModal, query, router, toggleBookmark, whiteboardLookup]
  );

  return (
    <ScreenWrapper edges={['top']}>
      <View style={styles.headerSection}>
        <Text style={[styles.eyebrowText, { color: colors.primary }]}>SEARCH</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Discover answers faster</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{resultSummary}</Text>
      </View>

      <GlassCard style={styles.searchHeroCard} blurIntensity={72}>
        <View style={styles.searchInputRow}>
          <GlassInput
            placeholder="Search by question title or body…"
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            onSubmitEditing={submitSearch}
            style={styles.searchInput}
            icon={<Ionicons name="search" size={16} color={colors.textMuted} />}
            showClear
          />
          {query.trim() ? (
            <TouchableOpacity
              style={[
                styles.clearButton,
                { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
              ]}
              onPress={handleClearQuery}
              accessibilityRole="button"
              accessibilityLabel="Clear search query"
            >
              <Text style={[styles.clearButtonText, { color: colors.text }]}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={[styles.searchHintText, { color: colors.textMuted }]}>
          Live search runs after you pause typing for a moment.
        </Text>
      </GlassCard>

      <GlassCard style={styles.filterPanelCard} blurIntensity={62}>
        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { color: colors.textMuted }]}>STATUS</Text>
          <View style={styles.filterWrap}>
            {STATUS_FILTERS.map((filter) => {
              const active = statusFilter === filter.value;
              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.primarySoft : colors.surfaceLight,
                      borderColor: active ? colors.primary : colors.surfaceBorder,
                    },
                  ]}
                  onPress={() => handleStatusFilter(filter.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${filter.label}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { color: colors.textMuted }]}>CLASS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    whiteboardFilter === 'ALL' ? colors.primarySoft : colors.surfaceLight,
                  borderColor:
                    whiteboardFilter === 'ALL' ? colors.primary : colors.surfaceBorder,
                },
              ]}
              onPress={() => handleWhiteboardFilter('ALL')}
              accessibilityRole="button"
              accessibilityLabel="Filter by all classes"
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: whiteboardFilter === 'ALL' ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                All Classes
              </Text>
            </TouchableOpacity>
            {availableWhiteboards.map((whiteboard) => {
              const active = whiteboardFilter === whiteboard.id;
              return (
                <TouchableOpacity
                  key={whiteboard.id}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.primarySoft : colors.surfaceLight,
                      borderColor: active ? colors.primary : colors.surfaceBorder,
                    },
                  ]}
                  onPress={() => handleWhiteboardFilter(whiteboard.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${whiteboard.courseCode}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {whiteboard.courseCode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { color: colors.textMuted }]}>TOPIC</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    topicFilter === 'ALL' ? colors.primarySoft : colors.surfaceLight,
                  borderColor: topicFilter === 'ALL' ? colors.primary : colors.surfaceBorder,
                },
              ]}
              onPress={() => handleTopicFilter('ALL')}
              accessibilityRole="button"
              accessibilityLabel="Filter by all topics"
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: topicFilter === 'ALL' ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                All Topics
              </Text>
            </TouchableOpacity>
            {availableTopics.map((topic) => {
              const active = topicFilter === topic.id;
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.primarySoft : colors.surfaceLight,
                      borderColor: active ? colors.primary : colors.surfaceBorder,
                    },
                  ]}
                  onPress={() => handleTopicFilter(topic.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by topic ${topic.name}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {topic.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
            <View
              key={filterLabel}
              style={[
                styles.activeFilterPill,
                { backgroundColor: colors.primarySoft, borderColor: colors.primaryFaint },
              ]}
            >
              <Text style={[styles.activeFilterText, { color: colors.primary }]}>
                {filterLabel}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {hasSearched && (
        <View style={styles.resultsSummaryRow}>
          <Text style={[styles.resultsSummaryText, { color: colors.text }]}>{resultSummary}</Text>
          <Text style={[styles.resultsSummarySubtext, { color: colors.textMuted }]}>
            Sorted by relevance
          </Text>
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
                ionIcon="search-outline"
                title="No matching questions"
                subtitle={loadError || 'Try broader keywords or clear one filter at a time.'}
              />
            ) : (
              <EmptyState
                ionIcon="telescope-outline"
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
                <ActivityIndicator size="small" color={colors.primary} />
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  eyebrowText: {
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  searchHeroCard: {
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.md,
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
  clearButton: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  clearButtonText: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
  },
  searchHintText: {
    marginTop: 10,
    fontSize: Fonts.sizes.sm,
  },
  filterPanelCard: {
    marginHorizontal: Spacing.xxl,
    marginBottom: 10,
  },
  filterSection: {
    marginBottom: 10,
  },
  filterTitle: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    letterSpacing: 1,
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
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
  },
  activeFiltersRow: {
    paddingHorizontal: Spacing.xxl,
    gap: 8,
    marginBottom: 8,
  },
  activeFilterPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 28,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  activeFilterText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  resultsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 8,
  },
  resultsSummaryText: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
  },
  resultsSummarySubtext: {
    fontSize: Fonts.sizes.sm,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 12,
  },
  listContent: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 130,
    paddingTop: 4,
  },
  emptyList: {
    flexGrow: 1,
  },
  questionCardEntry: {
    marginBottom: 12,
  },
  questionCard: {},
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
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  classBadgeText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topicBadge: {
    marginRight: 0,
  },
  questionTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: Fonts.lineHeights.xl,
    letterSpacing: -0.2,
  },
  questionBody: {
    fontSize: Fonts.sizes.md,
    lineHeight: Fonts.lineHeights.md,
    marginBottom: 12,
  },
  highlightText: {
    fontWeight: '700',
    borderRadius: 4,
  },
  questionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorText: {
    fontSize: Fonts.sizes.sm,
  },
  dotSeparator: {
    fontSize: Fonts.sizes.sm,
  },
  dateText: {
    fontSize: Fonts.sizes.sm,
  },
  questionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  statText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  footerRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  footerActionButton: {
    minHeight: 32,
    minWidth: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footerLoader: {
    paddingVertical: 14,
    alignItems: 'center',
  },
});
