import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SectionList,
  TextInput,
  Alert,
  type LayoutChangeEvent,
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
import { useWhiteboardDetailModel } from '../../hooks/useWhiteboardDetailModel';
import { formatTimestamp } from '../../utils/formatTimestamp';
import { isQuestionEdited } from '../../utils/questionMeta';
import { getQuestionDisplayStatus } from '../../utils/questionStatus';
import type { CommentResponse, QuestionResponse } from '../../types';

type QuestionSection = { key: string; title: string; data: QuestionResponse[] };

const MIN_TITLE_FONT_SIZE = 34;
const MAX_TITLE_FONT_SIZE = 44;
const TITLE_LINE_COUNT = 1;
const TITLE_AVERAGE_CHAR_WIDTH = 0.72;

function clampTitleFontSize(size: number): number {
  return Math.max(MIN_TITLE_FONT_SIZE, Math.min(MAX_TITLE_FONT_SIZE, size));
}

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
    openReportModal,
    closeReportModal,
  } = useWhiteboardDetailModel(id);

  const [topicSheetVisible, setTopicSheetVisible] = useState(false);
  const [contactSheetVisible, setContactSheetVisible] = useState(false);
  const [overflowVisible, setOverflowVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'questions' | 'triage'>('questions');
  const [triageVerifyQuestion, setTriageVerifyQuestion] = useState<QuestionResponse | null>(null);
  const [triageComments, setTriageComments] = useState<CommentResponse[]>([]);
  const [loadingTriageComments, setLoadingTriageComments] = useState(false);
  const [titleColumnWidth, setTitleColumnWidth] = useState(0);
  const whiteboardAccent = useMemo(() => accentForWhiteboard(id ?? ''), [id]);
  const triageOnly = isFaculty && viewMode === 'triage';
  const courseTitle = whiteboard?.courseCode?.trim() || 'Whiteboard';

  const heroTitleFontSize = useMemo(() => {
    if (titleColumnWidth <= 0) {
      return 30;
    }

    const effectiveLength = Math.max(courseTitle.length, 8);
    const targetSize =
      (titleColumnWidth * TITLE_LINE_COUNT) / (effectiveLength * TITLE_AVERAGE_CHAR_WIDTH);
    return Math.round(clampTitleFontSize(targetSize));
  }, [courseTitle.length, titleColumnWidth]);

  const handleTitleColumnLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    setTitleColumnWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
  }, []);

  useEffect(() => {
    if (isFaculty) {
      setViewMode('triage');
    }
  }, [isFaculty]);

  const stopCardPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

  const topicLabel =
    topicFilter === 'ALL'
      ? 'All topics'
      : (topicFilters.find((topic) => topic.id === topicFilter)?.name ?? 'Topic');
  const topicOptions = useMemo(
    () => [{ id: 'ALL', name: 'All topics' }, ...topicFilters],
    [topicFilters]
  );

  const visual = useMemo(() => getCourseVisual(whiteboard?.courseCode), [whiteboard?.courseCode]);
  const visualTint = useMemo(() => visualColors(visual), [visual]);

  const heroEntering = reduceMotion
    ? FadeIn.duration(Duration.fast)
    : FadeInDown.duration(Duration.normal).easing(Ease.out);

  const controlsEntering = reduceMotion
    ? FadeIn.duration(Duration.fast)
    : FadeInDown.duration(Duration.normal).delay(60).easing(Ease.out);

  const triageQuestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return questions
      .filter((question) => {
        const searchMatches =
          query.length === 0 ||
          question.title.toLowerCase().includes(query) ||
          question.body.toLowerCase().includes(query);
        const topicMatches = topicFilter === 'ALL' || question.topicId === topicFilter;
        return topicMatches && searchMatches && question.status === 'OPEN';
      })
      .sort((a, b) => {
        if (b.karmaScore !== a.karmaScore) return b.karmaScore - a.karmaScore;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [questions, searchQuery, topicFilter]);

  const displaySections = triageOnly
    ? [
        {
          key: 'open' as const,
          title: `Needs triage · ${triageQuestions.length}`,
          data: triageQuestions,
        },
      ].filter((section) => section.data.length > 0)
    : sections;

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
          blurIntensity={42}
          highlight={false}
          padding={14}
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

          <Text style={styles.questionBody} numberOfLines={2}>
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
            <View style={styles.footerMeta}>
              <Text style={styles.authorText} numberOfLines={1}>
                {item.authorName}
              </Text>
              <Text style={styles.dotSep}>{' · '}</Text>
              {wasEdited ? <Text style={styles.editedInlineText}>edited </Text> : null}
              <Text style={styles.dateText}>{formatTimestamp(item.createdAt)}</Text>
            </View>
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
                <AnimatedIcon
                  name="chatbubble-outline"
                  size={14}
                  color={colors.textSecondary}
                  motion="none"
                />
                <Text style={[styles.triageActionText, { color: colors.textSecondary }]}>
                  Reply
                </Text>
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

  const renderSectionHeader = ({ section }: { section: QuestionSection }) => {
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
        <View style={styles.sectionHeaderTitle}>
          <AnimatedIcon name={sectionIcon} size={14} color={sectionColor} motion="none" />
          <Text style={styles.sectionLabel}>{section.title}</Text>
        </View>
        {section.key === 'open' ? (
          <Pressable
            style={({ pressed }) => [
              styles.sectionTopicDrawer,
              { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
              pressed && { borderColor: colors.primary, opacity: 0.78 },
            ]}
            onPress={() => {
              haptic.selection();
              setTopicSheetVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Filter by topic. Current: ${topicLabel}`}
          >
            <AnimatedIcon
              name="pricetag-outline"
              size={13}
              color={colors.textMuted}
              motion="none"
            />
            <Text
              style={[styles.sectionTopicText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {topicLabel}
            </Text>
          </Pressable>
        ) : null}
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
  const metaParts = [semester || null, instructorSummary || ownerName || null].filter(
    Boolean
  ) as string[];

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
        {/* Top row: back + primary CTA + overflow */}
        <Animated.View entering={heroEntering} style={styles.topRow}>
          <ScreenHeader onBack={() => router.back()} border={false} style={styles.inlineHeader} />
          <View style={styles.topActions}>
            <Pressable
              onPress={() => {
                haptic.medium();
                router.push({
                  pathname: '/question/create',
                  params: { whiteboardId: id },
                });
              }}
              style={({ pressed }) => [
                styles.askButton,
                { backgroundColor: whiteboardAccent.primary },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Ask a question"
              hitSlop={6}
            >
              <AnimatedIcon name="add" size={16} color="#FFFFFF" motion="none" />
              <Text style={[styles.askButtonText, { color: '#FFFFFF' }]}>Ask</Text>
            </Pressable>
            <IconAction
              icon="ellipsis-horizontal"
              onPress={() => {
                haptic.selection();
                setOverflowVisible(true);
              }}
              accessibilityLabel="More whiteboard actions"
            />
          </View>
        </Animated.View>

        <Animated.View entering={heroEntering} style={styles.heroHeading}>
          <View style={styles.heroTitleRow}>
            <View
              style={[
                styles.iconDisc,
                { backgroundColor: visualTint.background, borderColor: visualTint.border },
              ]}
            >
              <AnimatedIcon
                name={visual.icon}
                size={16}
                color={visualTint.foreground}
                motion="none"
              />
            </View>
            <View style={styles.heroTitleColumn} onLayout={handleTitleColumnLayout}>
              <Text
                style={[
                  styles.heroTitle,
                  {
                    color: colors.text,
                    fontSize: heroTitleFontSize,
                    lineHeight: heroTitleFontSize + 4,
                  },
                ]}
                numberOfLines={TITLE_LINE_COUNT}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {courseTitle}
              </Text>
            </View>
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
          {metaParts.length > 0 ? (
            <>
              {whiteboard?.courseName ? (
                <Text style={[styles.heroCourseName, { color: colors.text }]} numberOfLines={2}>
                  {whiteboard.courseName.trim()}
                </Text>
              ) : null}
              <Text style={[styles.heroMeta, { color: colors.textMuted }]} numberOfLines={2}>
                {metaParts.join(' · ')}
              </Text>
            </>
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
          <Animated.View
            entering={controlsEntering}
            style={[
              styles.facultyTabs,
              { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
            ]}
          >
            <Pressable
              onPress={() => setViewMode('questions')}
              style={({ pressed }) => [
                styles.facultyTab,
                viewMode === 'questions' && {
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
                viewMode === 'triage' && {
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
          </Animated.View>
        ) : null}

        <Animated.View entering={controlsEntering} style={styles.feedControls}>
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
        </Animated.View>

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
                title="No triage questions"
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
                ionIcon="help-circle-outline"
                title="No questions to show"
                subtitle="Try refreshing this class."
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
          visible={topicSheetVisible}
          onClose={() => setTopicSheetVisible(false)}
          title="Topic"
        >
          {topicOptions.map((option) => {
            const selected = option.id === topicFilter;
            return (
              <Pressable
                key={option.id}
                style={({ pressed }) => [
                  styles.topicOption,
                  selected && styles.topicOptionSelected,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  handleTopicFilter(option.id);
                  setTopicSheetVisible(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Filter by ${option.name}`}
              >
                <Text
                  style={[styles.topicOptionLabel, selected && styles.topicOptionLabelSelected]}
                >
                  {option.name}
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
                  <Text
                    style={[styles.verifyCommentAuthor, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {comment.authorName}
                  </Text>
                  <Text style={[styles.verifyCommentDate, { color: colors.textMuted }]}>
                    {formatTimestamp(comment.createdAt)}
                  </Text>
                </View>
                <Text
                  style={[styles.verifyCommentBody, { color: colors.textSecondary }]}
                  numberOfLines={4}
                >
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

        <GlassModal
          visible={overflowVisible}
          onClose={() => setOverflowVisible(false)}
          title="Whiteboard"
        >
          <OverflowAction
            icon="mail-outline"
            label="Contact faculty"
            onPress={() => {
              setOverflowVisible(false);
              setContactSheetVisible(true);
            }}
          />
          <OverflowAction
            icon="people-outline"
            label="View members"
            onPress={() => {
              setOverflowVisible(false);
              router.push({
                pathname: '/whiteboard/members',
                params: { whiteboardId: id },
              });
            }}
          />
          {isFaculty ? (
            <OverflowAction
              icon="settings-outline"
              label="Whiteboard settings"
              onPress={() => {
                setOverflowVisible(false);
                router.push({
                  pathname: '/whiteboard/settings',
                  params: { whiteboardId: id },
                });
              }}
            />
          ) : null}
        </GlassModal>
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

function OverflowAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const themeColors = useThemeColors();
  return (
    <Pressable
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.overflowItem,
        { borderColor: themeColors.surfaceBorder, backgroundColor: themeColors.surfaceLight },
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <AnimatedIcon name={icon} size={18} color={themeColors.text} motion="none" />
      <Text style={[styles.overflowItemText, { color: themeColors.text }]}>{label}</Text>
      <AnimatedIcon name="chevron-forward" size={14} color={themeColors.textMuted} motion="none" />
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
    gap: 8,
  },
  inlineHeader: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
  },
  askButtonText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  overflowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  overflowItemText: {
    flex: 1,
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    letterSpacing: 0,
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

  heroHeading: {
    marginHorizontal: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  hero: {
    marginHorizontal: 18,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroTitleColumn: {
    flex: 1,
    minWidth: 0,
  },
  iconDisc: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  heroTitle: {
    fontWeight: '900',
    letterSpacing: 0,
    includeFontPadding: false,
  },
  heroCourseName: {
    fontSize: Fonts.sizes.lg,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 7,
  },
  heroMeta: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  statsStrip: {
    flexDirection: 'row',
    gap: 7,
    flexWrap: 'wrap',
  },
  facultyTabs: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: 18,
    marginBottom: 10,
    padding: 4,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  facultyTab: {
    flex: 1,
    minHeight: 36,
    borderRadius: 14,
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

  feedControls: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 8,
  },
  feedToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  searchField: {
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
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  sectionHeaderTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTopicDrawer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    maxWidth: 136,
  },
  sectionTopicText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0,
    maxWidth: 100,
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
    marginBottom: 10,
    borderRadius: 18,
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
    gap: 7,
    marginBottom: 10,
  },
  topicBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  questionTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 7,
    letterSpacing: 0,
  },
  questionBody: {
    fontSize: 17,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 18,
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
    gap: 10,
  },
  footerMeta: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    flexShrink: 1,
    fontWeight: '600',
  },
  dotSep: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
  },
  dateText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  editedInlineText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerActionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.035)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.075)',
  },
  footerActionActive: {
    backgroundColor: 'rgba(187,39,68,0.12)',
    borderColor: 'rgba(187,39,68,0.24)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  footerStatGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginLeft: 0,
  },
  metaCount: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '800',
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
  topicOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
  },
  topicOptionSelected: {
    backgroundColor: 'rgba(187,39,68,0.12)',
  },
  topicOptionLabel: {
    fontSize: Fonts.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  topicOptionLabelSelected: {
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
