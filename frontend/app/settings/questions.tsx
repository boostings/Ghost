import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatusBadge from '../../components/ui/StatusBadge';
import { STATUS_COLORS, type AppColors, useThemeColors } from '../../constants/colors';
import { Duration, Ease, PRESSED_SCALE, Spring } from '../../constants/motion';
import { haptic } from '../../utils/haptics';
import { formatTimestamp } from '../../utils/formatTimestamp';
import { getQuestionDisplayStatus } from '../../utils/questionStatus';
import { isQuestionEdited } from '../../utils/questionMeta';
import { useAuthStore } from '../../stores/authStore';
import { questionService } from '../../services/questionService';
import type { QuestionResponse } from '../../types';

const PAGE_SIZE = 20;

function activityCopy(isFaculty: boolean) {
  return isFaculty
    ? {
        eyebrow: 'FACULTY ANSWERS',
        title: 'Answered in your classes',
        metric: 'Resolved',
        emptyTitle: 'No answered questions yet',
        emptyHint: 'Verified answers from classes you teach will collect here.',
        error: 'Could not load answered questions.',
      }
    : {
        eyebrow: 'YOUR ARCHIVE',
        title: 'Your questions',
        metric: 'Asked',
        emptyTitle: 'No questions yet',
        emptyHint: 'Questions you ask on class whiteboards will collect here.',
        error: 'Could not load your questions.',
      };
}

export default function SettingsQuestionsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const reduceMotion = useReducedMotion();
  const user = useAuthStore((state) => state.user);
  const isFaculty = user?.role === 'FACULTY';
  const copy = useMemo(() => activityCopy(isFaculty), [isFaculty]);

  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef({ hasMore, loadingMore, loading, page });
  stateRef.current = { hasMore, loadingMore, loading, page };

  const loadQuestions = useCallback(
    async (mode: 'replace' | 'append', requestedPage: number) => {
      if (mode === 'replace') setLoading(true);
      else setLoadingMore(true);

      try {
        const response = await questionService.getMyQuestions({
          role: isFaculty ? 'TEACHING' : 'AUTHOR',
          status: isFaculty ? 'ANSWERED' : undefined,
          page: requestedPage,
          size: PAGE_SIZE,
        });
        setQuestions((current) =>
          mode === 'replace' ? response.content : [...current, ...response.content]
        );
        setPage(requestedPage);
        setTotal(response.totalElements);
        setHasMore(requestedPage + 1 < response.totalPages);
        setError(null);
      } catch {
        if (mode === 'replace') setQuestions([]);
        if (mode === 'replace') {
          setHasMore(false);
          setTotal(0);
        }
        setError(copy.error);
      } finally {
        if (mode === 'replace') setLoading(false);
        else setLoadingMore(false);
      }
    },
    [copy.error, isFaculty]
  );

  useEffect(() => {
    void loadQuestions('replace', 0);
  }, [loadQuestions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadQuestions('replace', 0);
    setRefreshing(false);
  }, [loadQuestions]);

  const handleLoadMore = useCallback(() => {
    const {
      hasMore: more,
      loadingMore: moreLoading,
      loading: firstLoading,
      page: currentPage,
    } = stateRef.current;
    if (!more || moreLoading || firstLoading) return;
    void loadQuestions('append', currentPage + 1);
  }, [loadQuestions]);

  const renderQuestion = useCallback(
    ({ item, index }: { item: QuestionResponse; index: number }) => (
      <ActivityQuestionRow
        question={item}
        index={index}
        colors={colors}
        reduceMotion={reduceMotion}
        onPress={() =>
          router.push({
            pathname: '/question/[id]',
            params: { id: item.id, whiteboardId: item.whiteboardId, fromCard: '1' },
          })
        }
      />
    ),
    [colors, reduceMotion, router]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${colors.primaryDark}66`, colors.background, colors.background] as const}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.62 }}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: colors.surfaceLight,
                borderColor: colors.surfaceBorder,
              },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={21} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primaryLight }]}>{copy.eyebrow}</Text>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {copy.title}
            </Text>
          </View>
        </View>

        <FlatList
          data={questions}
          renderItem={renderQuestion}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <Animated.View
              entering={
                reduceMotion ? FadeIn.duration(180) : FadeInDown.duration(240).easing(Ease.out)
              }
            >
              <View
                style={[
                  styles.hero,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
              >
                <View style={styles.heroTop}>
                  <View>
                    <Text style={[styles.heroNumber, { color: colors.text }]}>
                      {loading ? '—' : new Intl.NumberFormat('en-US').format(total)}
                    </Text>
                    <Text style={[styles.heroLabel, { color: colors.textMuted }]}>
                      {copy.metric} total
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.heroIcon,
                      { backgroundColor: colors.primarySoft, borderColor: colors.primaryFaint },
                    ]}
                  >
                    <Ionicons
                      name={isFaculty ? 'checkmark-done' : 'chatbubble-ellipses'}
                      size={26}
                      color={colors.primary}
                    />
                  </View>
                </View>
                <View style={[styles.heroRule, { backgroundColor: colors.surfaceBorder }]} />
                <Text style={[styles.heroHint, { color: colors.textSecondary }]}>
                  {isFaculty
                    ? 'Every verified answer across the classes you teach, newest first.'
                    : 'Every question you have asked across your classes, newest first.'}
                </Text>
              </View>
            </Animated.View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View
                  style={[
                    styles.emptyIcon,
                    { backgroundColor: colors.primarySoft, borderColor: colors.primaryFaint },
                  ]}
                >
                  <Ionicons name="albums-outline" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {error ?? copy.emptyTitle}
                </Text>
                <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                  {error ? 'Pull down to retry.' : copy.emptyHint}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.45}
        />
      </SafeAreaView>
    </View>
  );
}

function ActivityQuestionRow({
  question,
  index,
  colors,
  reduceMotion,
  onPress,
}: {
  question: QuestionResponse;
  index: number;
  colors: AppColors;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const displayStatus = getQuestionDisplayStatus(question);
  const statusColor = STATUS_COLORS[displayStatus].fg;
  const wasEdited = isQuestionEdited(question);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const entering = reduceMotion
    ? FadeIn.duration(180)
    : FadeInDown.duration(Duration.normal)
        .delay(Math.min(index, 8) * 42)
        .easing(Ease.out);

  return (
    <Animated.View entering={entering} style={[styles.rowWrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          haptic.light();
          scale.value = withSpring(PRESSED_SCALE, Spring.press);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, Spring.press);
        }}
        style={({ pressed }) => [
          styles.questionRow,
          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          pressed && { backgroundColor: colors.surfaceLight, borderColor: colors.primaryFaint },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open question ${question.title}`}
      >
        <View style={styles.questionMain}>
          <View style={styles.questionMeta}>
            <StatusBadge status={displayStatus} />
            <Text style={[styles.courseText, { color: colors.textMuted }]} numberOfLines={1}>
              {question.whiteboardCourseCode ?? question.topicName ?? 'Class question'}
            </Text>
          </View>

          <Text style={[styles.questionTitle, { color: colors.text }]} numberOfLines={2}>
            {question.title}
          </Text>
          <Text style={[styles.previewText, { color: colors.textSecondary }]} numberOfLines={2}>
            {question.isHidden ? '[hidden]' : question.body}
          </Text>

          <View style={styles.questionFooter}>
            <Text style={[styles.dateText, { color: colors.textMuted }]} numberOfLines={1}>
              {formatTimestamp(question.createdAt)}
              {wasEdited ? ' · Edited' : ''}
            </Text>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Ionicons name="arrow-up" size={12} color={colors.textMuted} />
                <Text style={[styles.statText, { color: colors.textMuted }]}>
                  {question.karmaScore}
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="chatbubble-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.statText, { color: colors.textMuted }]}>
                  {question.commentCount}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={[styles.rowAccent, { backgroundColor: statusColor }]} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
    marginBottom: 2,
  },
  title: {
    fontSize: 34,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  hero: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 18,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroNumber: {
    fontSize: 56,
    lineHeight: 58,
    fontWeight: '900',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  heroRule: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
  heroHint: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  rowWrap: { marginBottom: 12 },
  questionRow: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  questionMain: { flex: 1, padding: 15 },
  rowAccent: { width: 4 },
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  courseText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
  },
  questionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  questionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
  },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  loadingState: { paddingVertical: 80, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    paddingVertical: 52,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerLoader: { paddingVertical: 18, alignItems: 'center' },
});
