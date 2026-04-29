import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  type StyleProp,
  Text,
  type TextStyle,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatusBadge from '../../components/ui/StatusBadge';
import TopicBadge from '../../components/ui/TopicBadge';
import { Colors } from '../../constants/colors';
import { Duration, PRESSED_SCALE, Spring } from '../../constants/motion';
import { haptic } from '../../utils/haptics';
import { questionService } from '../../services/questionService';
import { whiteboardService } from '../../services/whiteboardService';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { sanitizeSingleLine } from '../../utils/sanitize';
import { formatDate } from '../../utils/formatDate';
import { isQuestionEdited } from '../../utils/questionMeta';
import type { QuestionResponse, QuestionStatus, WhiteboardResponse } from '../../types';

const PAGE_SIZE = 30;
const DEBOUNCE_MS = 280;

const IOS_EASE = Easing.bezier(0.32, 0.72, 0, 1);
const OUT_EASE = Easing.bezier(0.16, 1, 0.3, 1);

type StatusFilter = 'ALL' | QuestionStatus;
type TopicFilter = 'ALL' | string;
type SortKey = 'recent' | 'top' | 'discussed' | 'unanswered' | 'verified';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
];

const SORT_OPTIONS: { key: SortKey; label: string; hint: string }[] = [
  { key: 'recent', label: 'Recent', hint: 'Newest first' },
  { key: 'top', label: 'Top', hint: 'Highest karma' },
  { key: 'discussed', label: 'Most discussed', hint: 'By comment count' },
  { key: 'unanswered', label: 'Unanswered', hint: 'No verified answer' },
  { key: 'verified', label: 'Verified', hint: 'Verified answers first' },
];

const SORT_LABELS: Record<SortKey, string> = Object.fromEntries(
  SORT_OPTIONS.map((opt) => [opt.key, opt.label])
) as Record<SortKey, string>;

function applySort(items: QuestionResponse[], sort: SortKey): QuestionResponse[] {
  if (sort === 'recent') return items;
  const copy = [...items];
  switch (sort) {
    case 'top':
      copy.sort((a, b) => b.karmaScore - a.karmaScore);
      return copy;
    case 'discussed':
      copy.sort((a, b) => b.commentCount - a.commentCount);
      return copy;
    case 'unanswered':
      copy.sort((a, b) => {
        const aHas = a.verifiedAnswerId ? 1 : 0;
        const bHas = b.verifiedAnswerId ? 1 : 0;
        if (aHas !== bHas) return aHas - bHas;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      return copy;
    case 'verified':
      copy.sort((a, b) => {
        const aHas = a.verifiedAnswerId ? 1 : 0;
        const bHas = b.verifiedAnswerId ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return copy;
    default:
      return items;
  }
}

export default function WhiteboardSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; whiteboardId?: string }>();
  const whiteboardId = params.id ?? params.whiteboardId;
  const reduceMotion = useReducedMotion();

  const storeWhiteboards = useWhiteboardStore((state) => state.whiteboards);
  const currentWhiteboard = useWhiteboardStore((state) => state.currentWhiteboard);

  const [whiteboard, setWhiteboard] = useState<WhiteboardResponse | null>(() => {
    if (currentWhiteboard?.id === whiteboardId) return currentWhiteboard;
    return storeWhiteboards.find((w) => w.id === whiteboardId) ?? null;
  });

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [topic, setTopic] = useState<TopicFilter>('ALL');
  const [sort, setSort] = useState<SortKey>('recent');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const [results, setResults] = useState<QuestionResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestSequenceRef = useRef(0);
  const stateRef = useRef({ hasMore, loadingMore, loading, page });
  stateRef.current = { hasMore, loadingMore, loading, page };

  const trimmedQuery = useMemo(() => sanitizeSingleLine(query).trim(), [query]);
  const hasQuery = trimmedQuery.length > 0;

  useEffect(() => {
    if (whiteboard || !whiteboardId) return;
    let active = true;
    whiteboardService
      .getById(whiteboardId)
      .then((wb) => {
        if (active) setWhiteboard(wb);
      })
      .catch(() => {
        if (active) setError('Could not load this class.');
      });
    return () => {
      active = false;
    };
  }, [whiteboard, whiteboardId]);

  const fetchResults = useCallback(
    async (mode: 'replace' | 'append', requestedPage: number) => {
      if (!whiteboardId) return;
      const sequence = ++requestSequenceRef.current;

      if (mode === 'replace') setLoading(true);
      else setLoadingMore(true);

      try {
        const response = await questionService.searchQuestions({
          q: trimmedQuery || undefined,
          whiteboard: whiteboardId,
          status: status === 'ALL' ? undefined : status,
          topic: topic === 'ALL' ? undefined : topic,
          page: requestedPage,
          size: PAGE_SIZE,
        });
        if (sequence !== requestSequenceRef.current) return;
        setResults((current) =>
          mode === 'replace' ? response.content : [...current, ...response.content]
        );
        setPage(requestedPage);
        setHasMore(requestedPage + 1 < response.totalPages);
        setTotalElements(response.totalElements);
        setError(null);
      } catch {
        if (sequence !== requestSequenceRef.current) return;
        if (mode === 'replace') setResults([]);
        setHasMore(false);
        setTotalElements(0);
        setError('Search failed. Pull to retry.');
      } finally {
        if (sequence !== requestSequenceRef.current) return;
        if (mode === 'replace') setLoading(false);
        else setLoadingMore(false);
      }
    },
    [trimmedQuery, status, topic, whiteboardId]
  );

  // Debounced replace-fetch on filter / query change.
  useEffect(() => {
    if (!whiteboardId) return;
    if (!hasQuery && status === 'ALL' && topic === 'ALL') {
      // Idle empty-state: reset.
      setResults([]);
      setPage(0);
      setHasMore(false);
      setTotalElements(0);
      setLoading(false);
      return;
    }
    const id = setTimeout(() => {
      void fetchResults('replace', 0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [fetchResults, hasQuery, status, topic, whiteboardId]);

  const handleLoadMore = useCallback(() => {
    const { hasMore: hm, loadingMore: lm, loading: ld, page: p } = stateRef.current;
    if (!hm || lm || ld) return;
    void fetchResults('append', p + 1);
  }, [fetchResults]);

  // Topic options derived from loaded results.
  const topicOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of results) {
      if (item.topicId && item.topicName) map.set(item.topicId, item.topicName);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [results]);

  const sortedResults = useMemo(() => applySort(results, sort), [results, sort]);

  const handleSortChoice = useCallback((key: SortKey) => {
    haptic.selection();
    setSort(key);
    setSortSheetOpen(false);
  }, []);

  const renderResult = useCallback(
    ({ item, index }: { item: QuestionResponse; index: number }) => (
      <ResultCard
        item={item}
        index={index}
        reduceMotion={reduceMotion}
        searchTerm={trimmedQuery}
        onPress={() =>
          router.push({
            pathname: '/question/[id]',
            params: { id: item.id, whiteboardId },
          })
        }
      />
    ),
    [reduceMotion, router, trimmedQuery, whiteboardId]
  );

  const showIdleEmpty = !hasQuery && status === 'ALL' && topic === 'ALL' && !loading;
  const courseCode = whiteboard?.courseCode ?? '';
  const courseName = whiteboard?.courseName ?? '';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1a0710', Colors.background, Colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back to whiteboard"
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>SEARCH {courseCode || 'CLASS'}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {courseName || 'Find a question'}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <SearchField value={query} onChangeText={setQuery} />

          <View style={styles.controlsRow}>
            <SortPill
              label={SORT_LABELS[sort]}
              onPress={() => {
                haptic.light();
                setSortSheetOpen(true);
              }}
            />
          </View>

          <View style={styles.statusGroup}>
            <Text style={styles.groupLabel}>STATUS</Text>
            <StatusSegmented value={status} onChange={setStatus} reduceMotion={reduceMotion} />
          </View>

          {topicOptions.length > 0 ? (
            <View style={styles.topicGroup}>
              <Text style={styles.groupLabel}>TOPIC</Text>
              <View style={styles.topicWrap}>
                <TopicChip
                  label="All"
                  active={topic === 'ALL'}
                  onPress={() => {
                    haptic.selection();
                    setTopic('ALL');
                  }}
                />
                {topicOptions.map((t) => (
                  <TopicChip
                    key={t.id}
                    label={t.name}
                    active={topic === t.id}
                    onPress={() => {
                      haptic.selection();
                      setTopic(t.id);
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <ResultLine
            count={totalElements}
            loading={loading}
            error={error}
            hasQuery={hasQuery || status !== 'ALL' || topic !== 'ALL'}
          />
        </View>

        <FlatList
          data={sortedResults}
          renderItem={renderResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : showIdleEmpty ? (
              <View style={styles.idleState}>
                <Text style={styles.idleTitle}>Search this class</Text>
                <Text style={styles.idleHint}>
                  Type a question, instructor, or topic. Use Sort and Status to refine.
                </Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{error ?? 'No matches in this class.'}</Text>
                <Text style={styles.emptyHint}>Try broader keywords or clear a filter.</Text>
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
        />
      </SafeAreaView>

      <SortSheet
        visible={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        sort={sort}
        onChoose={handleSortChoice}
      />
    </View>
  );
}

// ---------- Search field ----------

function SearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (v: string) => void;
}) {
  const focus = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: focus.value > 0.5 ? Colors.primary : 'rgba(255,255,255,0.14)',
    transform: [{ scale: 0.998 + focus.value * 0.002 }],
  }));
  return (
    <Animated.View style={[styles.searchField, animatedStyle]}>
      <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search title, body, or author"
        placeholderTextColor={Colors.textMuted}
        style={styles.searchInput}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onFocus={() => {
          focus.value = withTiming(1, { duration: Duration.normal, easing: OUT_EASE });
        }}
        onBlur={() => {
          focus.value = withTiming(0, { duration: Duration.normal, easing: OUT_EASE });
        }}
        selectionColor={Colors.primary}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

// ---------- Sort pill ----------

function SortPill({ label, onPress }: { label: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.sortPillWrapper, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(PRESSED_SCALE, Spring.press);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, Spring.press);
        }}
        style={styles.sortPill}
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${label}`}
      >
        <Ionicons name="swap-vertical" size={14} color={Colors.text} />
        <Text style={styles.sortPillLabel} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

// ---------- Status segmented ----------

function StatusSegmented({
  value,
  onChange,
  reduceMotion,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  reduceMotion: boolean;
}) {
  const [width, setWidth] = useState(0);
  const indicatorIndex = useSharedValue(STATUS_FILTERS.findIndex((f) => f.value === value));
  useEffect(() => {
    const idx = STATUS_FILTERS.findIndex((f) => f.value === value);
    if (reduceMotion) indicatorIndex.value = idx;
    else indicatorIndex.value = withTiming(idx, { duration: Duration.normal, easing: IOS_EASE });
  }, [value, reduceMotion, indicatorIndex]);

  const segmentWidth = width > 0 ? (width - 8) / STATUS_FILTERS.length : 0;
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorIndex.value * segmentWidth }],
    width: segmentWidth,
  }));

  return (
    <View style={styles.segmented} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? <Animated.View style={[styles.segmentedIndicator, indicatorStyle]} /> : null}
      {STATUS_FILTERS.map((f) => {
        const active = value === f.value;
        return (
          <Pressable
            key={f.value}
            onPress={() => {
              haptic.selection();
              onChange(f.value);
            }}
            style={styles.segmentedItem}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentedText, active && styles.segmentedTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Topic chip ----------

function TopicChip({
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
      onPress={onPress}
      style={[styles.topicChip, active && styles.topicChipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.topicChipText, active && styles.topicChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

// ---------- Result line ----------

function ResultLine({
  count,
  loading,
  error,
  hasQuery,
}: {
  count: number;
  loading: boolean;
  error: string | null;
  hasQuery: boolean;
}) {
  let text: string;
  if (error) text = 'Search unavailable';
  else if (!hasQuery) text = 'Type to search this class';
  else if (loading && count === 0) text = 'Searching…';
  else text = `${count.toLocaleString()} match${count === 1 ? '' : 'es'}`;
  return (
    <View style={styles.resultLine}>
      <View style={[styles.resultDot, error ? { backgroundColor: Colors.error } : null]} />
      <Text style={styles.resultText}>{text}</Text>
    </View>
  );
}

// ---------- Result card ----------

function ResultCard({
  item,
  index,
  reduceMotion,
  searchTerm,
  onPress,
}: {
  item: QuestionResponse;
  index: number;
  reduceMotion: boolean;
  searchTerm: string;
  onPress: () => void;
}) {
  const wasEdited = isQuestionEdited(item);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const enter = reduceMotion
    ? FadeIn.duration(180)
    : FadeInDown.duration(360)
        .delay(Math.min(index, 8) * 40)
        .easing(OUT_EASE);

  return (
    <Animated.View entering={enter} style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(PRESSED_SCALE, Spring.press);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, Spring.press);
        }}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open question: ${item.title}`}
      >
        <View style={styles.cardEdge} />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardBadges}>
              {item.topicName ? <TopicBadge name={item.topicName} /> : null}
              <StatusBadge status={item.status} />
            </View>
            {item.verifiedAnswerId ? (
              <View style={styles.verifiedPill}>
                <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                <Text style={styles.verifiedPillText}>VERIFIED</Text>
              </View>
            ) : null}
          </View>

          <HighlightedText
            text={item.title}
            term={searchTerm}
            style={styles.cardTitle}
            highlightStyle={styles.highlight}
            numberOfLines={2}
          />
          {wasEdited ? <Text style={styles.editedText}>Edited</Text> : null}
          <HighlightedText
            text={item.isHidden ? '[hidden]' : item.body}
            term={searchTerm}
            style={styles.cardBodyText}
            highlightStyle={styles.highlight}
            numberOfLines={2}
          />

          <View style={styles.cardFooter}>
            <Text style={styles.metaText} numberOfLines={1}>
              {item.authorName} · {formatDate(item.createdAt)}
            </Text>
            <View style={styles.cardStats}>
              <View style={styles.stat}>
                <Ionicons name="caret-up" size={11} color={Colors.textSecondary} />
                <Text style={styles.statText}>{item.karmaScore}</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="chatbubble-outline" size={11} color={Colors.textSecondary} />
                <Text style={styles.statText}>{item.commentCount}</Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function HighlightedText({
  text,
  term,
  style,
  highlightStyle,
  numberOfLines,
}: {
  text: string;
  term: string;
  style: StyleProp<TextStyle>;
  highlightStyle: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  if (!term) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'ig');
  const parts = text.split(re);
  const lc = term.toLowerCase();
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) => (
        <Text
          key={`${part}-${i}`}
          style={part.toLowerCase() === lc ? [style, highlightStyle] : style}
        >
          {part}
        </Text>
      ))}
    </Text>
  );
}

// ---------- Sort sheet ----------

function SortSheet({
  visible,
  onClose,
  sort,
  onChoose,
}: {
  visible: boolean;
  onClose: () => void;
  sort: SortKey;
  onChoose: (key: SortKey) => void;
}) {
  const colorScheme = useColorScheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(180)}
        style={styles.sheetBackdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close sort sheet"
        />
        <Animated.View
          entering={SlideInDown.duration(Duration.drawer).easing(IOS_EASE)}
          exiting={SlideOutDown.duration(280).easing(IOS_EASE)}
          style={styles.sheetWrapper}
        >
          <BlurView
            intensity={80}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={styles.sheet}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetEyebrow}>SORT</Text>
              <Text style={styles.sheetTitle}>Order results</Text>
            </View>

            {SORT_OPTIONS.map((opt) => {
              const active = sort === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => onChoose(opt.key)}
                  style={[styles.sortRow, active && styles.sortRowActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={styles.sortRowText}>
                    <Text style={[styles.sortRowLabel, active && styles.sortRowLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.sortRowHint}>{opt.hint}</Text>
                  </View>
                  {active ? <Ionicons name="checkmark" size={20} color={Colors.primary} /> : null}
                </Pressable>
              );
            })}

            <Pressable style={styles.sheetDone} onPress={onClose} accessibilityRole="button">
              <Text style={styles.sheetDoneText}>Done</Text>
            </Pressable>
          </BlurView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  iconButtonPressed: { backgroundColor: 'rgba(255,255,255,0.12)' },
  headerCopy: { marginLeft: 14, flex: 1 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -0.6,
  },

  controls: { paddingHorizontal: 20, paddingBottom: 8 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
  },
  clearButton: { marginLeft: 8, padding: 2 },

  controlsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  sortPillWrapper: { flex: 1 },
  sortPill: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(187,39,68,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.40)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sortPillLabel: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  groupLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  statusGroup: { marginBottom: 12 },
  segmented: {
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 4,
    position: 'relative',
  },
  segmentedIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 11,
    backgroundColor: Colors.primary,
  },
  segmentedItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segmentedText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  segmentedTextActive: { color: '#FFFFFF' },

  topicGroup: { marginBottom: 6 },
  topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  topicChipActive: {
    backgroundColor: 'rgba(187,39,68,0.18)',
    borderColor: Colors.primary,
  },
  topicChipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  topicChipTextActive: { color: Colors.text },

  resultLine: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  resultDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  resultText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  listContent: { padding: 20, paddingTop: 8, paddingBottom: 80 },
  loadingState: { minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  idleState: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  idleTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  idleHint: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },
  emptyState: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyHint: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },

  card: {
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardPressed: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(187,39,68,0.45)',
  },
  cardEdge: { width: 3, backgroundColor: Colors.primary },
  cardBody: { flex: 1, padding: 14 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardBadges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.32)',
  },
  verifiedPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.success,
    letterSpacing: 1,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  editedText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cardBodyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    marginBottom: 12,
  },
  highlight: {
    color: Colors.primary,
    backgroundColor: 'rgba(187,39,68,0.16)',
    fontWeight: '900',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', flex: 1 },
  cardStats: { flexDirection: 'row', gap: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetWrapper: { width: '100%' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: 'rgba(20,12,16,0.94)',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginBottom: 16,
  },
  sheetHeader: { marginBottom: 16 },
  sheetEyebrow: { fontSize: 11, fontWeight: '900', color: Colors.primary, letterSpacing: 2.2 },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sortRowActive: {
    backgroundColor: 'rgba(187,39,68,0.16)',
    borderColor: Colors.primary,
  },
  sortRowText: { flex: 1 },
  sortRowLabel: { color: Colors.textSecondary, fontSize: 15, fontWeight: '800' },
  sortRowLabelActive: { color: Colors.text },
  sortRowHint: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  sheetDone: {
    marginTop: 12,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDoneText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.6 },
});
