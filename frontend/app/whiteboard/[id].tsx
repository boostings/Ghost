import React, { useCallback } from 'react';
import {
  StyleSheet,
  Platform,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import ReportModal from '../../components/ReportModal';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import {
  FEED_STATUS_FILTERS,
  useWhiteboardDetailModel,
} from '../../hooks/useWhiteboardDetailModel';
import { formatDate } from '../../utils/formatDate';
import type { QuestionResponse } from '../../types';

export default function WhiteboardDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
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
    openReportModal: handleOpenReportModal,
    closeReportModal,
  } = useWhiteboardDetailModel(id);

  const stopCardPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

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
                onAction={clearFilters}
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
          onClose={closeReportModal}
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
  fabIcon: {
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    fontWeight: '700',
  },
});
