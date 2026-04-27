import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
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
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/ui/GlassCard';
import GlassModal from '../../components/ui/GlassModal';
import TopicBadge from '../../components/ui/TopicBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import ReportModal from '../../components/ReportModal';
import ContactFacultySheet from '../../components/whiteboard/ContactFacultySheet';
import { AnimatedIcon } from '../../components/AnimatedIcon';
import { Colors, useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Stagger, enterList } from '../../constants/motion';
import { Shadow } from '../../constants/spacing';
import { haptic } from '../../utils/haptics';
import { getCourseVisual, visualColors } from '../../utils/courseIcon';
import {
  SORT_OPTIONS,
  useWhiteboardDetailModel,
  type SortMode,
} from '../../hooks/useWhiteboardDetailModel';
import { formatDate } from '../../utils/formatDate';
import type { QuestionResponse } from '../../types';

export default function WhiteboardDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const reduceMotion = useReducedMotion();
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

  const visual = useMemo(() => getCourseVisual(whiteboard?.courseCode), [whiteboard?.courseCode]);
  const visualTint = useMemo(() => visualColors(visual), [visual]);

  const stats = useMemo(() => {
    const pinned = sections.find((section) => section.key === 'pinned')?.data.length ?? 0;
    const open = sections.find((section) => section.key === 'open')?.data.length ?? 0;
    const answered = sections.find((section) => section.key === 'answered')?.data.length ?? 0;
    return { pinned, open, answered, total: pinned + open + answered };
  }, [sections]);

  const heroEntering = reduceMotion
    ? FadeIn.duration(Duration.normal)
    : FadeInDown.duration(Duration.hero).delay(Stagger.hero).springify().damping(22);

  const actionRowEntering = reduceMotion
    ? FadeIn.duration(Duration.normal)
    : FadeInDown.duration(Duration.slow).delay(60).springify().damping(20);

  const controlsEntering = reduceMotion
    ? FadeIn.duration(Duration.normal)
    : FadeInDown.duration(Duration.slow).delay(120).springify().damping(20);

  const filtersEntering = reduceMotion
    ? FadeIn.duration(Duration.normal)
    : FadeIn.duration(Duration.normal).delay(180);

  const fabEntering = reduceMotion
    ? FadeIn.duration(Duration.normal)
    : FadeInUp.duration(Duration.slow).delay(Stagger.footer).springify().damping(14);

  const renderQuestionCard = useCallback(
    ({ item, index }: { item: QuestionResponse; index: number }) => {
      const cardEntering = reduceMotion ? FadeIn.duration(Duration.fast) : enterList(index);
      return (
        <GlassCard
          style={[styles.questionCard, item.isPinned && styles.pinnedCard]}
          entering={cardEntering}
          layout={
            reduceMotion ? undefined : LinearTransition.springify().damping(22).stiffness(180)
          }
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
                  Answered
                  {item.verifiedAnswerAuthorName ? ` by ${item.verifiedAnswerAuthorName}` : ''}
                </Text>
              </View>
              <Text style={styles.answerStripeBody} numberOfLines={2}>
                {item.verifiedAnswerPreview}
              </Text>
            </View>
          ) : null}

          <View style={styles.questionFooter}>
            <Text style={styles.authorText} numberOfLines={1}>
              {item.authorName}
            </Text>
            <Text style={styles.dotSep}>{' · '}</Text>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            <View style={styles.footerRight}>
              <TouchableOpacity
                onPress={(event) => {
                  stopCardPress(event);
                  handleToggleBookmark(item.id);
                }}
                style={[styles.footerActionButton, item.isBookmarked && styles.footerActionActive]}
                accessibilityRole="button"
                accessibilityLabel={item.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                <AnimatedIcon
                  name={item.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={14}
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
                <AnimatedIcon
                  name="flag-outline"
                  size={14}
                  color={Colors.textMuted}
                  motion="none"
                />
              </TouchableOpacity>
              <View style={styles.metaItem}>
                <AnimatedIcon
                  name="arrow-up"
                  size={13}
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
                  size={13}
                  color={Colors.textMuted}
                  motion="none"
                />
                <Text style={styles.metaCount}>{item.commentCount}</Text>
              </View>
            </View>
          </View>
        </GlassCard>
      );
    },
    [handleToggleBookmark, id, openReportModal, reduceMotion, router]
  );

  const renderSectionHeader = ({
    section,
  }: {
    section: { key: 'pinned' | 'open' | 'answered'; title: string };
  }) => {
    if (isSearching) return null;
    const sectionIcon =
      section.key === 'pinned'
        ? 'pin'
        : section.key === 'answered'
          ? 'checkmark-circle'
          : 'ellipse-outline';
    const sectionColor =
      section.key === 'pinned'
        ? Colors.warning
        : section.key === 'answered'
          ? Colors.verifiedAnswer
          : Colors.textMuted;
    return (
      <Animated.View
        entering={reduceMotion ? FadeIn.duration(Duration.fast) : FadeIn.duration(Duration.normal)}
        style={styles.sectionHeader}
      >
        <AnimatedIcon name={sectionIcon} size={14} color={sectionColor} motion="none" />
        <Text style={styles.sectionLabel}>{section.title}</Text>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[`${colors.primary}24`, colors.background, colors.background] as const}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.45 }}
        />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.topRow}>
            <BackButton onPress={() => router.back()} />
          </View>
          <View style={styles.heroSkeleton}>
            <View style={[styles.skeletonChip, { backgroundColor: colors.surfaceLight }]} />
            <View style={[styles.skeletonHeading, { backgroundColor: colors.surfaceLight }]} />
            <View style={[styles.skeletonMeta, { backgroundColor: colors.surfaceLight }]} />
          </View>
          <View style={styles.skeletonWrapper}>
            <LoadingSkeleton type="question" count={4} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const ownerName = whiteboard?.ownerName?.trim();
  const semester = whiteboard?.semester?.trim();
  const memberCount = whiteboard?.memberCount ?? 0;
  const metaParts = [
    semester || null,
    `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`,
    ownerName || null,
  ].filter(Boolean) as string[];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${colors.primary}24`, colors.background, colors.background] as const}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.45 }}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Top row: just the back button. The title moves into the hero. */}
        <View style={styles.topRow}>
          <BackButton onPress={() => router.back()} />
        </View>

        {/* Hero */}
        <Animated.View entering={heroEntering} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View
              style={[
                styles.iconDisc,
                { backgroundColor: visualTint.background, borderColor: visualTint.border },
              ]}
            >
              <AnimatedIcon
                name={visual.icon}
                size={18}
                color={visualTint.foreground}
                motion="none"
              />
            </View>
            <View
              style={[
                styles.codeChip,
                { backgroundColor: colors.primarySoft, borderColor: colors.primaryFaint },
              ]}
            >
              <Text style={[styles.codeChipText, { color: colors.primary }]} numberOfLines={1}>
                {whiteboard?.courseCode || 'CLASS'}
              </Text>
            </View>
            {whiteboard?.isDemo ? (
              <View
                style={[
                  styles.demoChip,
                  { backgroundColor: `${colors.warning}26`, borderColor: `${colors.warning}40` },
                ]}
              >
                <Text style={[styles.demoChipText, { color: colors.warning }]}>DEMO</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
            {whiteboard?.courseName || 'Whiteboard'}
          </Text>

          {metaParts.length > 0 ? (
            <Text style={[styles.heroMeta, { color: colors.textMuted }]} numberOfLines={2}>
              {metaParts.join(' · ')}
            </Text>
          ) : null}

          {/* Stats strip — hide pills with zero counts to reduce visual noise */}
          <View style={styles.statsStrip}>
            <StatPill
              label="Total"
              value={stats.total}
              color={colors.text}
              accent={colors.surfaceBorder}
            />
            {stats.open > 0 ? (
              <StatPill
                label="Open"
                value={stats.open}
                color={colors.text}
                accent={Colors.openStatus}
              />
            ) : null}
            {stats.answered > 0 ? (
              <StatPill
                label="Answered"
                value={stats.answered}
                color={colors.text}
                accent={Colors.verifiedAnswer}
              />
            ) : null}
            {stats.pinned > 0 ? (
              <StatPill
                label="Pinned"
                value={stats.pinned}
                color={colors.text}
                accent={Colors.warning}
              />
            ) : null}
          </View>
        </Animated.View>

        {/* Action chips */}
        <Animated.View entering={actionRowEntering} style={styles.actionRow}>
          <ActionChip
            icon="mail-outline"
            label="Contact"
            onPress={() => {
              haptic.selection();
              setContactSheetVisible(true);
            }}
            accessibilityLabel="Contact faculty"
          />
          <ActionChip
            icon="people-outline"
            label="Members"
            onPress={() => {
              haptic.selection();
              router.push({
                pathname: '/whiteboard/members',
                params: { whiteboardId: id },
              });
            }}
            accessibilityLabel="View whiteboard members"
          />
          {isFaculty ? (
            <ActionChip
              icon="settings-outline"
              label="Settings"
              onPress={() => {
                haptic.selection();
                router.push({
                  pathname: '/whiteboard/settings',
                  params: { whiteboardId: id },
                });
              }}
              accessibilityLabel="Open whiteboard settings"
            />
          ) : null}
        </Animated.View>

        {/* Search + sort row */}
        <Animated.View entering={controlsEntering} style={styles.controlsRow}>
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
            style={({ pressed }) => [styles.sortChip, pressed && styles.sortChipPressed]}
            onPress={() => {
              haptic.selection();
              setSortSheetVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Change sort order. Current: ${sortLabel}`}
          >
            <AnimatedIcon name="swap-vertical" size={14} color={Colors.text} motion="none" />
            <Text style={styles.sortChipText} numberOfLines={1}>
              {sortLabel}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Topic filter */}
        {topicFilters.length > 0 ? (
          <Animated.View entering={filtersEntering}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <FilterChip
                label="All Topics"
                active={topicFilter === 'ALL'}
                onPress={() => handleTopicFilter('ALL')}
              />
              {topicFilters.map((topic) => (
                <FilterChip
                  key={topic.id}
                  label={topic.name}
                  active={topicFilter === topic.id}
                  onPress={() => handleTopicFilter(topic.id)}
                />
              ))}
            </ScrollView>
          </Animated.View>
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
        <Animated.View entering={fabEntering} style={styles.fabWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.96 : 1 }] },
              Shadow.primaryGlow(colors.primary),
            ]}
            onPress={() => {
              haptic.medium();
              router.push({
                pathname: '/question/create',
                params: { whiteboardId: id },
              });
            }}
            accessibilityRole="button"
            accessibilityLabel="Ask a question"
          >
            <AnimatedIcon name="add" size={20} color="#FFFFFF" motion="pop" />
            <Text style={styles.fabLabel}>Ask</Text>
          </Pressable>
        </Animated.View>

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
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
    >
      <AnimatedIcon name="chevron-back" size={18} color={Colors.text} motion="none" />
      <Text style={styles.backButtonLabel}>Back</Text>
    </Pressable>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionChip, pressed && styles.actionChipPressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <AnimatedIcon name={icon} size={16} color={Colors.text} motion="none" />
      <Text style={styles.actionChipLabel}>{label}</Text>
    </Pressable>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.filterChipPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter by ${label}`}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatPill({
  label,
  value,
  color,
  accent,
}: {
  label: string;
  value: number;
  color: string;
  accent: string;
}) {
  return (
    <View style={styles.statPill}>
      <View style={[styles.statDot, { backgroundColor: accent }]} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  topRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 12,
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backButtonLabel: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },

  hero: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  codeChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  codeChipText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  demoChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  demoChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  heroMeta: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  statsStrip: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statValue: {
    fontSize: Fonts.sizes.md,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  actionChipPressed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(187,39,68,0.45)',
  },
  actionChipLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.2,
  },

  controlsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
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
  sortChipPressed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sortChipText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.text,
    maxWidth: 130,
  },

  filterRow: {
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    height: 36,
    flexShrink: 0,
    alignSelf: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: 'rgba(187,39,68,0.20)',
    borderColor: Colors.primary,
  },
  filterChipPressed: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },
  filterChipTextActive: {
    color: Colors.text,
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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 130,
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
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: -0.2,
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
    flexShrink: 1,
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
    gap: 8,
  },
  footerActionButton: {
    minHeight: 32,
    minWidth: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  footerActionActive: {
    backgroundColor: 'rgba(187,39,68,0.14)',
    borderColor: 'rgba(187,39,68,0.32)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaCount: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
    paddingTop: 4,
    paddingHorizontal: 24,
  },
  heroSkeleton: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  skeletonChip: {
    width: 100,
    height: 22,
    borderRadius: 999,
    opacity: 0.6,
  },
  skeletonHeading: {
    width: '70%',
    height: 28,
    borderRadius: 8,
    opacity: 0.55,
  },
  skeletonMeta: {
    width: '55%',
    height: 14,
    borderRadius: 6,
    opacity: 0.4,
  },

  fabWrap: {
    position: 'absolute',
    right: 20,
    bottom: 24,
  },
  fab: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  fabLabel: {
    fontSize: Fonts.sizes.md,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.3,
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
