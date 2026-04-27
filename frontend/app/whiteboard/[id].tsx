import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Platform,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  SectionList,
  TextInput,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GlassModal from '../../components/ui/GlassModal';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import ReportModal from '../../components/ReportModal';
import ContactFacultySheet from '../../components/whiteboard/ContactFacultySheet';
import { AnimatedIcon } from '../../components/AnimatedIcon';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import {
  SORT_OPTIONS,
  useWhiteboardDetailModel,
  type SortMode,
} from '../../hooks/useWhiteboardDetailModel';
import { formatDate } from '../../utils/formatDate';
import type { QuestionResponse } from '../../types';

export default function WhiteboardDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
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
  } = useWhiteboardDetailModel(id);

  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [contactSheetVisible, setContactSheetVisible] = useState(false);

  const stopCardPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? 'Recent activity';

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
            <AnimatedIcon name="pin" size={12} color={Colors.warning} motion="none" />
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

        {item.verifiedAnswerId && item.verifiedAnswerPreview ? (
          <View style={styles.answerStripe}>
            <View style={styles.answerStripeHeader}>
              <AnimatedIcon
                name="checkmark-circle"
                size={14}
                color={Colors.verifiedAnswer}
                motion="none"
              />
              <Text style={styles.answerStripeLabel}>
                Answered{item.verifiedAnswerAuthorName ? ` by ${item.verifiedAnswerAuthorName}` : ''}
              </Text>
            </View>
            <Text style={styles.answerStripeBody} numberOfLines={2}>
              {item.verifiedAnswerPreview}
            </Text>
          </View>
        ) : null}

        <View style={styles.questionFooter}>
          <Text style={styles.authorText}>{item.authorName}</Text>
          <Text style={styles.dotSep}>{' · '}</Text>
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
              <AnimatedIcon
                name={item.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={item.isBookmarked ? Colors.primary : Colors.textMuted}
                motion="none"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(event) => {
                stopCardPress(event);
                openReportModal(item.id);
              }}
              style={styles.footerActionButton}
              accessibilityRole="button"
              accessibilityLabel="Report question"
            >
              <AnimatedIcon name="flag-outline" size={16} color={Colors.textMuted} motion="none" />
            </TouchableOpacity>
            <View style={styles.metaItem}>
              <AnimatedIcon
                name="arrow-up"
                size={14}
                color={
                  item.karmaScore > 0
                    ? Colors.success
                    : item.karmaScore < 0
                      ? Colors.error
                      : Colors.textMuted
                }
                motion="none"
              />
              <Text
                style={[
                  styles.metaCount,
                  item.karmaScore > 0 && styles.karmaPositive,
                  item.karmaScore < 0 && styles.karmaNegative,
                ]}
              >
                {item.karmaScore}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <AnimatedIcon
                name="chatbubble-outline"
                size={14}
                color={Colors.textMuted}
                motion="none"
              />
              <Text style={styles.metaCount}>{item.commentCount}</Text>
            </View>
          </View>
        </View>
      </GlassCard>
    ),
    [handleToggleBookmark, id, openReportModal, router]
  );

  const renderSectionHeader = ({
    section,
  }: {
    section: { key: 'pinned' | 'open' | 'answered'; title: string };
  }) => {
    if (isSearching) return null;
    return (
      <View style={styles.sectionHeader}>
        {section.key === 'pinned' ? (
          <AnimatedIcon name="pin" size={14} color={Colors.warning} motion="none" />
        ) : section.key === 'answered' ? (
          <AnimatedIcon
            name="checkmark-circle"
            size={14}
            color={Colors.verifiedAnswer}
            motion="none"
          />
        ) : (
          <AnimatedIcon name="ellipse-outline" size={14} color={Colors.textMuted} motion="none" />
        )}
        <Text style={styles.sectionLabel}>{section.title}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={[Colors.background, Colors.background]} style={styles.gradient}>
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
    <LinearGradient colors={[Colors.background, Colors.background]} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AnimatedIcon name="chevron-back" size={20} color={Colors.text} motion="none" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.courseCode}>{whiteboard?.courseCode || ''}</Text>
            <Text style={styles.courseName} numberOfLines={2}>
              {whiteboard?.courseName || ''}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setContactSheetVisible(true)}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Contact faculty"
            >
              <AnimatedIcon name="mail-outline" size={18} color={Colors.text} motion="none" />
            </TouchableOpacity>
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
              <AnimatedIcon name="people-outline" size={18} color={Colors.text} motion="none" />
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
                <AnimatedIcon
                  name="settings-outline"
                  size={18}
                  color={Colors.text}
                  motion="none"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search + sort row */}
        <View style={styles.controlsRow}>
          <View style={styles.searchField}>
            <AnimatedIcon name="search" size={16} color={Colors.textMuted} motion="none" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search questions"
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AnimatedIcon
                  name="close-circle"
                  size={16}
                  color={Colors.textMuted}
                  motion="none"
                />
              </TouchableOpacity>
            ) : null}
          </View>
          <Pressable
            style={({ pressed }) => [styles.sortChip, pressed && { opacity: 0.7 }]}
            onPress={() => setSortSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Change sort order"
          >
            <AnimatedIcon name="swap-vertical" size={14} color={Colors.text} motion="none" />
            <Text style={styles.sortChipText} numberOfLines={1}>
              {sortLabel}
            </Text>
          </Pressable>
        </View>

        {/* Topic filter */}
        {topicFilters.length > 0 ? (
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
            {topicFilters.map((topic) => (
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
        ) : null}

        {/* Question Feed */}
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderQuestionCard}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[
            styles.listContent,
            sections.every((s) => s.data.length === 0) && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            isSearching ? (
              <EmptyState
                ionIcon="search-outline"
                title="No matches"
                subtitle={`No questions match “${searchQuery.trim()}”.`}
                actionLabel="Clear search"
                onAction={clearFilters}
              />
            ) : questions.length > 0 ? (
              <EmptyState
                ionIcon="filter-outline"
                title="No matching questions"
                subtitle="Adjust filters to see more questions."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            ) : (
              <EmptyState
                ionIcon="help-circle-outline"
                title="No questions yet"
                subtitle={loadError || 'Be the first to ask a question in this class!'}
                actionLabel="Ask a question"
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
          <AnimatedIcon name="add" size={20} color={Colors.text} motion="none" />
          <Text style={styles.fabLabel}>Ask</Text>
        </TouchableOpacity>

        <ReportModal
          visible={reportModalVisible}
          onClose={closeReportModal}
          target={reportTarget}
          title="Report Question"
        />

        <GlassModal
          visible={sortSheetVisible}
          onClose={() => setSortSheetVisible(false)}
          title="Sort by"
        >
          {SORT_OPTIONS.map((option) => {
            const selected = option.value === sortMode;
            return (
              <Pressable
                key={option.value}
                style={({ pressed }) => [
                  styles.sortOption,
                  selected && styles.sortOptionSelected,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  setSortMode(option.value as SortMode);
                  setSortSheetVisible(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.sortOptionLabel, selected && styles.sortOptionLabelSelected]}>
                  {option.label}
                </Text>
                {selected ? (
                  <AnimatedIcon name="checkmark" size={18} color={Colors.primary} motion="none" />
                ) : null}
              </Pressable>
            );
          })}
        </GlassModal>

        <ContactFacultySheet
          visible={contactSheetVisible}
          onClose={() => setContactSheetVisible(false)}
          whiteboardId={id}
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
  controlsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    paddingVertical: 0,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  sortChipText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.text,
    maxWidth: 130,
  },
  filterRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 0,
    height: 36,
    flexShrink: 0,
    alignSelf: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: 'rgba(187,39,68,0.25)',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
    gap: 4,
    marginBottom: 8,
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
  answerStripe: {
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderColor: 'rgba(34,197,94,0.30)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  answerStripeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  answerStripeLabel: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.verifiedAnswer,
    letterSpacing: 0.3,
  },
  answerStripeBody: {
    fontSize: Fonts.sizes.sm,
    color: Colors.text,
    lineHeight: 19,
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
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaCount: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
  },
  karmaPositive: {
    color: Colors.success,
  },
  karmaNegative: {
    color: Colors.error,
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
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(187,39,68,0.4)',
      },
      default: {
        elevation: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
    }),
  },
  fabLabel: {
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    fontWeight: '700',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
  },
  sortOptionSelected: {
    backgroundColor: 'rgba(187,39,68,0.12)',
  },
  sortOptionLabel: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  sortOptionLabelSelected: {
    color: Colors.primary,
  },
});
