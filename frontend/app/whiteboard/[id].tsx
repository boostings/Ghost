import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Alert,
  type GestureResponderEvent,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
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
import NoiseOverlay from '../../components/ui/NoiseOverlay';
import ScreenHeader from '../../components/ui/ScreenHeader';
import ReportModal from '../../components/ReportModal';
import ContactFacultySheet from '../../components/whiteboard/ContactFacultySheet';
import { AnimatedIcon } from '../../components/AnimatedIcon';
import { GhostMark } from '../../components/brand/GhostBrand';
import { accentForWhiteboard, Colors, STATUS_COLORS, useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Ease, enterList } from '../../constants/motion';
import { commentService } from '../../services/commentService';
import { haptic } from '../../utils/haptics';
import { getCourseVisual, visualColors } from '../../utils/courseIcon';
import { smartTitleCase } from '../../utils/titleCase';
import {
  SORT_OPTIONS,
  useWhiteboardDetailModel,
  type SortMode,
} from '../../hooks/useWhiteboardDetailModel';
import { formatTimestamp } from '../../utils/formatTimestamp';
import { isQuestionEdited } from '../../utils/questionMeta';
import { getQuestionDisplayStatus } from '../../utils/questionStatus';
import type { CommentResponse, QuestionResponse } from '../../types';

type GroupMode = 'status' | 'topic' | 'chronological';
type QuestionSection = { key: string; title: string; data: QuestionResponse[] };

const GROUP_OPTIONS: Array<{ value: GroupMode; label: string }> = [
  { value: 'status', label: 'Status' },
  { value: 'topic', label: 'Topic' },
  { value: 'chronological', label: 'Recent' },
];

export default function WhiteboardDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const reduceMotion = useReducedMotion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    whiteboard,
    questions,
    sections,
    stats,
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
    currentUserId,
    handleRefresh,
    handleLoadMore,
    handleToggleBookmark,
    handleTogglePin,
    handleVerifyComment,
    handleTopicFilter,
    clearFilters,
    setSearchQuery,
    setSortMode,
    openReportModal,
    closeReportModal,
  } = useWhiteboardDetailModel(id);

  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [contactSheetVisible, setContactSheetVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'questions' | 'triage'>('questions');
  const [groupMode, setGroupMode] = useState<GroupMode>('status');
  const [triageVerifyQuestion, setTriageVerifyQuestion] = useState<QuestionResponse | null>(null);
  const [triageComments, setTriageComments] = useState<CommentResponse[]>([]);
  const [loadingTriageComments, setLoadingTriageComments] = useState(false);
  const whiteboardAccent = useMemo(() => accentForWhiteboard(id ?? ''), [id]);
  const triageOnly = isFaculty && viewMode === 'triage';

  useEffect(() => {
    if (isFaculty) {
      setViewMode('triage');
    }
  }, [isFaculty]);

  const stopCardPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? 'Recent activity';

  const visual = useMemo(() => getCourseVisual(whiteboard?.courseCode), [whiteboard?.courseCode]);
  const visualTint = useMemo(() => visualColors(visual), [visual]);

  const heroEntering = reduceMotion
    ? FadeIn.duration(Duration.fast)
    : FadeInDown.duration(Duration.normal).easing(Ease.out);

  const controlsEntering = reduceMotion
    ? FadeIn.duration(Duration.fast)
    : FadeInDown.duration(Duration.normal).delay(60).easing(Ease.out);

  const filtersEntering = reduceMotion
    ? FadeIn.duration(Duration.fast)
    : FadeIn.duration(Duration.normal).delay(100).easing(Ease.out);

  const activeTopicName =
    topicFilter === 'ALL'
      ? null
      : (topicFilters.find((topic) => topic.id === topicFilter)?.name ?? null);

  const triageQuestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return questions
      .filter((question) => {
        const topicMatches = topicFilter === 'ALL' || question.topicId === topicFilter;
        const searchMatches =
          query.length === 0 ||
          question.title.toLowerCase().includes(query) ||
          question.body.toLowerCase().includes(query);
        return topicMatches && searchMatches && question.status === 'OPEN';
      })
      .sort((a, b) => {
        if (b.karmaScore !== a.karmaScore) return b.karmaScore - a.karmaScore;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [questions, searchQuery, topicFilter]);

  const questionSections = useMemo<QuestionSection[]>(() => {
    if (groupMode === 'status') {
      return sections;
    }

    if (groupMode === 'chronological') {
      return questions.length > 0
        ? [
            {
              key: 'all',
              title: `All questions · ${questions.length}`,
              data: questions,
            },
          ]
        : [];
    }

    const topicGroups = new Map<string, QuestionResponse[]>();
    questions.forEach((question) => {
      const topic = question.topicName || 'Untagged';
      const group = topicGroups.get(topic) ?? [];
      group.push(question);
      topicGroups.set(topic, group);
    });

    return Array.from(topicGroups.entries()).map(([topic, data]) => ({
      key: `topic-${topic}`,
      title: `${topic} · ${data.length}`,
      data,
    }));
  }, [groupMode, questions, sections]);

  const displaySections = triageOnly
    ? [
        {
          key: 'open' as const,
          title: `Needs triage · ${triageQuestions.length}`,
          data: triageQuestions,
        },
      ].filter((section) => section.data.length > 0)
    : questionSections;

  const openTriageVerifyPicker = useCallback(
    async (question: QuestionResponse) => {
      if (!id) {
        return;
      }

      setTriageVerifyQuestion(question);
      setTriageComments([]);
      setLoadingTriageComments(true);

      try {
        const comments = await commentService.getComments(id, question.id, { page: 0, size: 50 });
        setTriageComments(comments.filter((comment) => !comment.isVerifiedAnswer));
      } catch {
        Alert.alert('Error', 'Could not load comments for this question.');
        setTriageVerifyQuestion(null);
      } finally {
        setLoadingTriageComments(false);
      }
    },
    [id]
  );

  const closeTriageVerifyPicker = useCallback(() => {
    setTriageVerifyQuestion(null);
    setTriageComments([]);
    setLoadingTriageComments(false);
  }, []);

  const renderQuestionCard = useCallback(
    ({ item, index }: { item: QuestionResponse; index: number }) => {
      const cardEntering = reduceMotion ? FadeIn.duration(Duration.fast) : enterList(index);
      const wasEdited = isQuestionEdited(item);
      const displayStatus = getQuestionDisplayStatus(item);
      const displayStatusLabel =
        displayStatus === 'ANSWERED' ? 'Answered' : displayStatus === 'CLOSED' ? 'Closed' : 'Open';
      return (
        <GlassCard
          style={[styles.questionCard, item.isPinned && styles.pinnedCard]}
          entering={cardEntering}
          layout={
            reduceMotion ? undefined : LinearTransition.duration(Duration.fast).easing(Ease.out)
          }
          accessibilityLabel={`${displayStatusLabel} question: ${item.title}`}
          onPress={() =>
            router.push({
              pathname: '/question/[id]',
              params: { id: item.id, whiteboardId: id, fromCard: '1' },
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
            <TopicBadge name={item.topicName || 'Untagged'} style={styles.topicBadge} />
            <StatusBadge status={displayStatus} />
          </View>

          <Text style={styles.questionTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {wasEdited && <Text style={styles.editedText}>Edited</Text>}

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
            <Text style={styles.dateText}>{formatTimestamp(item.createdAt)}</Text>
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
              {item.authorId !== currentUserId && (
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
              )}
              <View style={styles.footerStatGroup}>
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
          </View>

          {triageOnly ? (
            <View style={[styles.triageActionRow, { borderTopColor: colors.surfaceBorder }]}>
              {item.commentCount > 0 ? (
                <Pressable
                  onPress={(event) => {
                    stopCardPress(event);
                    haptic.success();
                    openTriageVerifyPicker(item);
                  }}
                  style={({ pressed }) => [
                    styles.triageInlineAction,
                    styles.triageVerifyAction,
                    { borderColor: `${colors.verifiedAnswer}44` },
                    pressed && { opacity: 0.75 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Mark an answer for this question"
                >
                  <AnimatedIcon
                    name="checkmark"
                    size={14}
                    color={colors.verifiedAnswer}
                    motion="none"
                  />
                  <Text style={[styles.triageVerifyText, { color: colors.verifiedAnswer }]}>
                    Mark as Answer
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={(event) => {
                  stopCardPress(event);
                  haptic.selection();
                  handleTogglePin(item.id);
                }}
                style={({ pressed }) => [
                  styles.triageInlineAction,
                  { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight },
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.isPinned ? 'Unpin question' : 'Pin question'}
              >
                <AnimatedIcon
                  name={item.isPinned ? 'pin' : 'pin-outline'}
                  size={14}
                  color={item.isPinned ? Colors.warning : colors.textSecondary}
                  motion="none"
                />
                <Text style={[styles.triageActionText, { color: colors.textSecondary }]}>
                  {item.isPinned ? 'Unpin' : 'Pin'}
                </Text>
              </Pressable>
              <Pressable
                onPress={(event) => {
                  stopCardPress(event);
                  haptic.selection();
                  router.push({
                    pathname: '/question/[id]',
                    params: { id: item.id, whiteboardId: id, reply: '1', fromCard: '1' },
                  });
                }}
                style={({ pressed }) => [
                  styles.triageInlineAction,
                  { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight },
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Reply to question"
              >
                <AnimatedIcon name="chatbubble-outline" size={14} color={colors.textSecondary} motion="none" />
                <Text style={[styles.triageActionText, { color: colors.textSecondary }]}>Reply</Text>
              </Pressable>
            </View>
          ) : null}
        </GlassCard>
      );
    },
    [
      colors.surfaceBorder,
      colors.surfaceLight,
      colors.textSecondary,
      colors.verifiedAnswer,
      currentUserId,
      handleToggleBookmark,
      handleTogglePin,
      id,
      openReportModal,
      openTriageVerifyPicker,
      reduceMotion,
      router,
      triageOnly,
    ]
  );

  const renderSectionHeader = ({
    section,
  }: {
    section: QuestionSection;
  }) => {
    if (isSearching) return null;
    const sectionIcon =
      section.key === 'pinned'
        ? 'pin'
        : section.key === 'answered'
          ? 'checkmark-circle'
        : section.key === 'closed'
            ? 'lock-closed'
            : section.key === 'all'
              ? 'time-outline'
              : section.key.startsWith('topic-')
                ? 'pricetag-outline'
                : 'ellipse-outline';
    const sectionColor =
      section.key === 'pinned'
        ? Colors.warning
        : section.key === 'answered'
          ? STATUS_COLORS.ANSWERED.fg
          : section.key === 'closed'
            ? STATUS_COLORS.CLOSED.fg
            : section.key.startsWith('topic-')
              ? colors.primary
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
          colors={[whiteboardAccent.soft, colors.background, colors.background] as const}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.45 }}
        />
        <NoiseOverlay />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ScreenHeader onBack={() => router.back()} border={false} style={styles.topRow} />
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
  const instructorSummary = whiteboard?.instructorSummary?.trim();
  const semester = whiteboard?.semester?.trim();
  const memberCount = whiteboard?.memberCount ?? 0;
  const sectionCount = whiteboard?.sectionCount ?? 0;
  const metaParts = [
    semester || null,
    sectionCount > 1 ? `${sectionCount} sections` : null,
    `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`,
    instructorSummary || ownerName || null,
  ].filter(Boolean) as string[];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[whiteboardAccent.soft, colors.background, colors.background] as const}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.45 }}
      />
      <NoiseOverlay />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Top row: back + class actions (icon-only) */}
        <Animated.View entering={heroEntering} style={styles.topRow}>
          <ScreenHeader onBack={() => router.back()} border={false} style={styles.inlineHeader} />
          <View style={styles.topActions}>
            {!whiteboard?.isDemo ? (
              <IconAction
                icon="add-circle-outline"
                onPress={() => {
                  haptic.medium();
                  router.push({
                    pathname: '/question/create',
                    params: { whiteboardId: id },
                  });
                }}
                accessibilityLabel="Ask a question"
              />
            ) : null}
            <IconAction
              icon="mail-outline"
              onPress={() => {
                haptic.selection();
                setContactSheetVisible(true);
              }}
              accessibilityLabel="Contact faculty"
            />
            <IconAction
              icon="people-outline"
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
              <IconAction
                icon="settings-outline"
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
          </View>
        </Animated.View>

        {/* Hero */}
        <Animated.View
          entering={heroEntering}
          style={[
            styles.hero,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          ]}
        >
          <View style={styles.heroTitleRow}>
            <View
              style={[
                styles.iconDisc,
                { backgroundColor: visualTint.background, borderColor: visualTint.border },
              ]}
            >
              <AnimatedIcon
                name={visual.icon}
                size={20}
                color={visualTint.foreground}
                motion="none"
              />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
              {whiteboard?.courseName ? smartTitleCase(whiteboard.courseName) : 'Whiteboard'}
            </Text>
          </View>

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
                accent={STATUS_COLORS.OPEN.fg}
              />
            ) : null}
            {stats.answered > 0 ? (
              <StatPill
                label="Answered"
                value={stats.answered}
                color={colors.text}
                accent={STATUS_COLORS.ANSWERED.fg}
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

        {/* Search + sort row */}
        {isFaculty ? (
          <Animated.View entering={controlsEntering} style={styles.facultyTabs}>
            <Pressable
              onPress={() => setViewMode('questions')}
              style={({ pressed }) => [
                styles.facultyTab,
                { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight },
                viewMode === 'questions' && {
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}26`,
                },
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: viewMode === 'questions' }}
              accessibilityLabel="Question list tab"
            >
              <Text
                style={[
                  styles.facultyTabText,
                  { color: viewMode === 'questions' ? colors.primary : colors.textSecondary },
                ]}
              >
                Questions
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('triage')}
              style={({ pressed }) => [
                styles.facultyTab,
                { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight },
                viewMode === 'triage' && {
                  borderColor: STATUS_COLORS.OPEN.fg,
                  backgroundColor: STATUS_COLORS.OPEN.bg,
                },
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: viewMode === 'triage' }}
              accessibilityLabel="Triage tab"
            >
              <Text
                style={[
                  styles.facultyTabText,
                  { color: viewMode === 'triage' ? STATUS_COLORS.OPEN.fg : colors.textSecondary },
                ]}
              >
                Triage
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/whiteboard/members',
                  params: { whiteboardId: id },
                })
              }
              style={({ pressed }) => [
                styles.facultyTab,
                { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight },
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="tab"
              accessibilityLabel="Members tab"
            >
              <Text style={[styles.facultyTabText, { color: colors.textSecondary }]}>Members</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        <Animated.View entering={controlsEntering} style={styles.controlsRow}>
          <View
            style={[
              styles.searchField,
              { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
            ]}
          >
            <AnimatedIcon name="search" size={16} color={colors.textMuted} motion="none" />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search questions"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              accessibilityLabel="Search questions"
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
                  color={colors.textMuted}
                  motion="none"
                />
              </TouchableOpacity>
            ) : null}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.sortChip,
              { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
              pressed && { borderColor: colors.primary },
            ]}
            onPress={() => {
              haptic.selection();
              setSortSheetVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Change sort order. Current: ${sortLabel}`}
          >
            <AnimatedIcon name="swap-vertical" size={14} color={colors.text} motion="none" />
            <Text style={[styles.sortChipText, { color: colors.text }]} numberOfLines={1}>
              {sortLabel}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Topic filter */}
        {topicFilters.length > 0 ? (
          <Animated.View entering={filtersEntering} style={styles.filterScroller}>
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
            <View pointerEvents="none" style={styles.filterFade}>
              <LinearGradient
                colors={['rgba(10,12,20,0)', Colors.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <AnimatedIcon
                name="chevron-forward"
                size={12}
                color={colors.textMuted}
                motion="none"
              />
            </View>
          </Animated.View>
        ) : null}

        {isFaculty ? (
          <Animated.View
            entering={filtersEntering}
            style={[
              styles.facultyToolbar,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
            ]}
          >
            <View style={styles.facultyToolbarCopy}>
              <Text style={[styles.facultyToolbarTitle, { color: colors.text }]}>
                {stats.open} unanswered
              </Text>
              <Text style={[styles.facultyToolbarMeta, { color: colors.textMuted }]}>
                {triageQuestions.length} in triage ·{' '}
                {triageQuestions.filter((question) => question.commentCount === 0).length} without replies
              </Text>
            </View>
            <Pressable
              onPress={() => {
                haptic.selection();
                setViewMode((value) => (value === 'triage' ? 'questions' : 'triage'));
              }}
              style={({ pressed }) => [
                styles.triageButton,
                {
                  backgroundColor: triageOnly ? STATUS_COLORS.OPEN.bg : colors.surfaceLight,
                  borderColor: triageOnly ? STATUS_COLORS.OPEN.fg : colors.surfaceBorder,
                },
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: triageOnly }}
              accessibilityLabel="Show questions without replies"
            >
              <AnimatedIcon
                name="filter"
                size={14}
                color={triageOnly ? STATUS_COLORS.OPEN.fg : colors.text}
                motion="none"
              />
              <Text
                style={[
                  styles.triageButtonText,
                  { color: triageOnly ? STATUS_COLORS.OPEN.fg : colors.text },
                ]}
              >
                Triage
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {!triageOnly ? (
          <Animated.View entering={filtersEntering} style={styles.groupModeRow}>
            {GROUP_OPTIONS.map((option) => {
              const selected = groupMode === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    haptic.selection();
                    setGroupMode(option.value);
                  }}
                  style={({ pressed }) => [
                    styles.groupModeChip,
                    { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
                    selected && {
                      backgroundColor: `${colors.primary}24`,
                      borderColor: colors.primary,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Group by ${option.label}`}
                >
                  <Text
                    style={[
                      styles.groupModeText,
                      { color: selected ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
        ) : null}

        {/* Question Feed */}
        <SectionList
          sections={displaySections}
          keyExtractor={(item) => item.id}
          renderItem={renderQuestionCard}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          windowSize={5}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          contentContainerStyle={[
            styles.listContent,
            displaySections.every((s) => s.data.length === 0) && styles.emptyList,
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
            triageOnly ? (
              <EmptyState
                ionIcon="checkmark-circle-outline"
                title={
                  activeTopicName
                    ? `No triage questions in ${activeTopicName}`
                    : 'No triage questions'
                }
                subtitle="Everything in this view is already answered or closed."
                actionLabel="View all questions"
                onAction={() => setViewMode('questions')}
              />
            ) : isSearching ? (
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
                subtitle={
                  loadError ||
                  (whiteboard?.isDemo
                    ? 'This demo class is read-only.'
                    : 'Be the first to ask a question in this class!')
                }
                actionLabel={whiteboard?.isDemo ? undefined : 'Ask a question'}
                onAction={
                  whiteboard?.isDemo
                    ? undefined
                    : () =>
                        router.push({
                          pathname: '/question/create',
                          params: { whiteboardId: id },
                        })
                }
              />
            )
          }
          ListHeaderComponent={
            refreshing ? (
              <Animated.View
                entering={reduceMotion ? undefined : FadeIn.duration(Duration.fast)}
                style={[
                  styles.refreshGhost,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                ]}
                accessibilityRole="text"
                accessibilityLabel="Refreshing questions"
              >
                <GhostMark size={34} animated />
                <Text style={[styles.refreshGhostText, { color: colors.textSecondary }]}>
                  Refreshing
                </Text>
              </Animated.View>
            ) : null
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
                accessibilityLabel={`Sort by ${option.label}`}
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

        <GlassModal
          visible={triageVerifyQuestion !== null}
          onClose={closeTriageVerifyPicker}
          title="Mark as Answer"
        >
          {triageVerifyQuestion ? (
            <View style={styles.verifySheetIntro}>
              <Text style={[styles.verifySheetQuestion, { color: colors.text }]} numberOfLines={2}>
                {triageVerifyQuestion.title}
              </Text>
              <Text style={[styles.verifySheetMeta, { color: colors.textMuted }]}>
                Choose the comment that answers this question. The question will close.
              </Text>
            </View>
          ) : null}

          {loadingTriageComments ? (
            <View style={styles.verifySheetLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : triageComments.length > 0 ? (
            triageComments.map((comment) => (
              <Pressable
                key={comment.id}
                onPress={() => {
                  if (!triageVerifyQuestion) {
                    return;
                  }
                  Alert.alert(
                    'Mark this comment as the verified answer?',
                    'The question will be closed.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Mark Answer',
                        onPress: () => {
                          haptic.success();
                          handleVerifyComment(triageVerifyQuestion.id, comment);
                          closeTriageVerifyPicker();
                        },
                      },
                    ]
                  );
                }}
                style={({ pressed }) => [
                  styles.verifyCommentOption,
                  { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight },
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Mark comment by ${comment.authorName} as answer`}
              >
                <View style={styles.verifyCommentHeader}>
                  <Text style={[styles.verifyCommentAuthor, { color: colors.text }]} numberOfLines={1}>
                    {comment.authorName}
                  </Text>
                  <Text style={[styles.verifyCommentDate, { color: colors.textMuted }]}>
                    {formatTimestamp(comment.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.verifyCommentBody, { color: colors.textSecondary }]} numberOfLines={4}>
                  {comment.body}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={[styles.verifySheetMeta, { color: colors.textMuted }]}>
              No comments are available to mark as the answer.
            </Text>
          )}
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

function IconAction({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const themeColors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconAction,
        { backgroundColor: themeColors.surfaceLight, borderColor: themeColors.surfaceBorder },
        pressed && { borderColor: themeColors.primary, transform: [{ scale: 0.97 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
    >
      <AnimatedIcon name={icon} size={16} color={themeColors.text} motion="none" />
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
  const themeColors = useThemeColors();
  const inactiveBg = themeColors.surfaceLight;
  const inactiveBorder = themeColors.surfaceBorder;
  return (
    <Pressable
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.filterChip,
        { backgroundColor: inactiveBg, borderColor: inactiveBorder },
        active && {
          backgroundColor: `${themeColors.primary}26`,
          borderColor: themeColors.primary,
        },
        pressed && { backgroundColor: `${themeColors.primary}10` },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter by ${label}`}
    >
      <Text
        style={[
          styles.filterChipText,
          { color: themeColors.textSecondary },
          active && { color: themeColors.primary },
        ]}
      >
        {label}
      </Text>
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
  const themeColors = useThemeColors();
  return (
    <View
      style={[
        styles.statPill,
        { backgroundColor: themeColors.surfaceLight, borderColor: themeColors.surfaceBorder },
      ]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={[styles.statDot, { backgroundColor: accent }]} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  topRow: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineHeader: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingVertical: 8,
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
    marginHorizontal: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginBottom: 8,
  },
  iconDisc: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroTitle: {
    flex: 1,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: 0,
  },
  heroMeta: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  statsStrip: {
    flexDirection: 'row',
    gap: 7,
    flexWrap: 'wrap',
  },
  facultyTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  facultyTab: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facultyTabText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '900',
    letterSpacing: 0,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statValue: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  controlsRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingBottom: 10,
    gap: 8,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: Fonts.sizes.md,
    paddingVertical: 0,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 156,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    maxWidth: 118,
  },

  filterRow: {
    gap: 7,
    paddingHorizontal: 18,
    paddingRight: 36,
    paddingBottom: 9,
    alignItems: 'center',
  },
  filterScroller: {
    position: 'relative',
  },
  filterFade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 9,
    width: 30,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
    height: 34,
    flexShrink: 0,
    alignSelf: 'center',
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0,
  },
  filterChipTextActive: {
    color: Colors.text,
  },
  groupModeRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 7,
  },
  groupModeChip: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupModeText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.35,
  },
  facultyToolbar: {
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  facultyToolbarCopy: {
    flex: 1,
    minWidth: 0,
  },
  facultyToolbarTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
  facultyToolbarMeta: {
    fontSize: Fonts.sizes.xs,
    marginTop: 2,
    fontWeight: '700',
  },
  triageButton: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  triageButtonText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  triageActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 2,
  },
  triageInlineAction: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  triageVerifyAction: {
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  triageActionText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '800',
  },
  triageVerifyText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '900',
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
    paddingBottom: 72,
  },
  refreshGhost: {
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshGhostText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 0,
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
  editedText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  footerRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
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
  footerStatGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 2,
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
  verifySheetIntro: {
    marginBottom: 14,
  },
  verifySheetQuestion: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '800',
    lineHeight: 24,
  },
  verifySheetMeta: {
    fontSize: Fonts.sizes.sm,
    lineHeight: 20,
    marginTop: 6,
  },
  verifySheetLoading: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyCommentOption: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  verifyCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  verifyCommentAuthor: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    fontWeight: '800',
  },
  verifyCommentDate: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
  },
  verifyCommentBody: {
    fontSize: Fonts.sizes.md,
    lineHeight: 20,
  },
});
