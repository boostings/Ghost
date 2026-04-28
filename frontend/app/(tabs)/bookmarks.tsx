import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatusBadge from '../../components/ui/StatusBadge';
import { Colors, useThemeColors } from '../../constants/colors';
import { haptic } from '../../utils/haptics';
import { bookmarkService } from '../../services/bookmarkService';
import { extractErrorMessage } from '../../hooks/useApi';
import { formatDate } from '../../utils/formatDate';
import type { BookmarkResponse } from '../../types';

const PAGE_SIZE = 20;
const OUT_EASE = Easing.bezier(0.16, 1, 0.3, 1);

type GroupKey = 'all' | string;

type Group = { whiteboardId: string; classCode: string; items: BookmarkResponse[] };

type ListRow =
  | { type: 'header'; key: string; group: Group }
  | { type: 'item'; key: string; item: BookmarkResponse };

function groupByClass(items: BookmarkResponse[]): Group[] {
  const map = new Map<string, Group>();
  for (const b of items) {
    const wbId = b.question.whiteboardId;
    const courseCode = b.question.whiteboardCourseCode?.trim();
    const courseName = b.question.whiteboardCourseName?.trim();
    const label = courseCode || courseName || 'Class';
    const existing = map.get(wbId);
    if (existing) {
      existing.items.push(b);
    } else {
      map.set(wbId, {
        whiteboardId: wbId,
        classCode: label,
        items: [b],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.classCode.localeCompare(b.classCode));
}

function flattenGroups(groups: Group[], filter: GroupKey): ListRow[] {
  const rows: ListRow[] = [];
  const visible = filter === 'all' ? groups : groups.filter((g) => g.whiteboardId === filter);
  for (const g of visible) {
    rows.push({ type: 'header', key: `h-${g.whiteboardId}`, group: g });
    for (const item of g.items) rows.push({ type: 'item', key: item.id, item });
  }
  return rows;
}

export default function SavedScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const reduceMotion = useReducedMotion();

  const [bookmarks, setBookmarks] = useState<BookmarkResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<GroupKey>('all');
  const lastFetchRef = useRef(0);

  const fetchBookmarks = useCallback(
    async (options?: { page?: number; replace?: boolean }) => {
      const nextPage = options?.page ?? 0;
      const replace = options?.replace ?? true;
      if (!replace && (!hasMore || loadingMore)) return;

      try {
        if (replace) setLoading(true);
        else setLoadingMore(true);

        const response = await bookmarkService.list(nextPage, PAGE_SIZE);
        setBookmarks((prev) => (replace ? response.content : [...prev, ...response.content]));
        setPage(nextPage);
        setHasMore(nextPage + 1 < response.totalPages);
        setLoadError(null);
        lastFetchRef.current = Date.now();
      } catch {
        if (replace) setBookmarks([]);
        setHasMore(false);
        setLoadError("Couldn't load saved questions. Pull down to retry.");
      } finally {
        if (replace) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [hasMore, loadingMore]
  );

  useFocusEffect(
    useCallback(() => {
      const isStale = Date.now() - lastFetchRef.current > 30000;
      if (bookmarks.length === 0 || isStale) {
        void fetchBookmarks({ page: 0, replace: true });
      }
    }, [bookmarks.length, fetchBookmarks])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookmarks({ page: 0, replace: true });
    setRefreshing(false);
  }, [fetchBookmarks]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore) return;
    await fetchBookmarks({ page: page + 1, replace: false });
  }, [fetchBookmarks, hasMore, loading, loadingMore, page]);

  const handleRemove = useCallback(
    async (questionId: string) => {
      haptic.medium();
      const previous = bookmarks;
      setBookmarks((current) => current.filter((b) => b.question.id !== questionId));
      try {
        await bookmarkService.remove(questionId);
      } catch (error: unknown) {
        setBookmarks(previous);
        Alert.alert('Could not remove', extractErrorMessage(error));
      }
    },
    [bookmarks]
  );

  const groups = useMemo(() => groupByClass(bookmarks), [bookmarks]);
  const filterOptions = useMemo(
    () => [
      { key: 'all' as GroupKey, label: 'All Classes' },
      ...groups.map((g) => ({ key: g.whiteboardId as GroupKey, label: g.classCode })),
    ],
    [groups]
  );
  const rows = useMemo(() => flattenGroups(groups, filter), [groups, filter]);

  const renderRow = useCallback(
    ({ item, index }: { item: ListRow; index: number }) => {
      if (item.type === 'header') {
        return (
          <Animated.View
            entering={reduceMotion ? FadeIn.duration(160) : FadeIn.duration(240).delay(40)}
          >
            <View style={[styles.groupHeader, { borderBottomColor: colors.surfaceBorder }]}>
              <Text style={[styles.groupHeaderText, { color: colors.text }]}>
                {item.group.classCode}
              </Text>
              <Text style={[styles.groupHeaderCount, { color: colors.primary }]}>
                {item.group.items.length}
              </Text>
            </View>
          </Animated.View>
        );
      }
      const enter = reduceMotion
        ? FadeIn.duration(160)
        : FadeInDown.duration(320)
            .delay(Math.min(index, 10) * 28)
            .easing(OUT_EASE);
      return (
        <SavedRow
          item={item.item}
          entering={enter}
          onPress={() =>
            router.push({
              pathname: '/question/[id]',
              params: {
                id: item.item.question.id,
                whiteboardId: item.item.question.whiteboardId,
              },
            })
          }
          onRemove={() => handleRemove(item.item.question.id)}
        />
      );
    },
    [colors.primary, colors.surfaceBorder, colors.text, handleRemove, reduceMotion, router]
  );

  const empty = !loading && bookmarks.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${colors.primary}24`, colors.background, colors.background] as const}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.45 }}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>BOOKMARKED</Text>
            <View style={styles.heroRow}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Saved</Text>
              {bookmarks.length > 0 ? (
                <Text style={[styles.heroCount, { color: colors.primary }]}>
                  {bookmarks.length}
                </Text>
              ) : null}
            </View>
            {empty ? (
              <Text style={[styles.headerMeta, { color: colors.textMuted }]}>
                Nothing saved yet
              </Text>
            ) : groups.length > 1 ? (
              <Text style={[styles.headerMeta, { color: colors.textMuted }]}>
                {groups.length} classes
              </Text>
            ) : null}
          </View>
        </View>

        {groups.length > 1 ? (
          <View style={styles.filterStrip}>
            <FlatList
              data={filterOptions}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterStripContent}
              keyExtractor={(option) => option.key}
              renderItem={({ item: option }) => {
                const active = filter === option.key;
                return (
                  <Pressable
                    onPress={() => {
                      haptic.selection();
                      setFilter(option.key);
                    }}
                    style={[
                      styles.filterChip,
                      { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                      active && {
                        backgroundColor: `${colors.primary}26`,
                        borderColor: colors.primary,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: active ? colors.text : colors.textSecondary },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        ) : null}

        <FlatList
          data={rows}
          renderItem={renderRow}
          keyExtractor={(row) => row.key}
          contentContainerStyle={[styles.listContent, empty && styles.emptyContent]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="bookmark-outline" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Nothing saved yet</Text>
                <Text style={styles.emptyHint}>
                  {loadError ?? 'Tap the bookmark icon on any question to keep it within reach.'}
                </Text>
              </View>
            )
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}

function SavedRow({
  item,
  entering,
  onPress,
  onRemove,
}: {
  item: BookmarkResponse;
  entering: ReturnType<typeof FadeInDown.duration>;
  onPress: () => void;
  onRemove: () => void;
}) {
  const colors = useThemeColors();
  const q = item.question;
  return (
    <Animated.View entering={entering} style={styles.rowWrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          pressed && {
            backgroundColor: colors.surfaceLight,
            borderColor: `${colors.primary}66`,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open saved question: ${q.title}`}
      >
        <View style={styles.rail} />
        <View style={styles.rowBody}>
          <View style={styles.rowTopRow}>
            <View style={styles.rowBadges}>
              {q.topicName ? (
                <View
                  style={[
                    styles.topicChip,
                    { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
                  ]}
                >
                  <Text
                    style={[styles.topicChipText, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {q.topicName}
                  </Text>
                </View>
              ) : null}
              <StatusBadge status={q.status} />
            </View>
            <Pressable
              onPress={onRemove}
              hitSlop={10}
              style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Remove from saved"
            >
              <Ionicons name="bookmark" size={14} color={colors.primary} />
            </Pressable>
          </View>

          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
            {q.title}
          </Text>
          <Text style={[styles.rowBodyText, { color: colors.textSecondary }]} numberOfLines={2}>
            {q.isHidden ? '[hidden]' : q.body}
          </Text>

          <View style={styles.rowFooter}>
            <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
              {q.authorName} · saved {formatDate(item.createdAt)}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="caret-up" size={11} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {q.karmaScore}
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="chatbubble-outline" size={11} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {q.commentCount}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerCopy: {},
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 2,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  headerTitle: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -0.8,
  },
  heroCount: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  headerMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 6,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  filterStrip: { paddingBottom: 8 },
  filterStripContent: { paddingHorizontal: 24, gap: 8 },
  filterChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(187,39,68,0.18)',
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },
  filterChipTextActive: { color: Colors.text },

  listContent: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 110 },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },

  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  groupHeaderText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  groupHeaderCount: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },

  rowWrap: { marginBottom: 10 },
  row: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(187,39,68,0.45)',
  },
  rail: { width: 3, backgroundColor: Colors.primary },
  rowBody: { flex: 1, padding: 14 },
  rowTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  rowBadges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  topicChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  topicChipText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(187,39,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.32)',
  },
  removeButtonPressed: { backgroundColor: 'rgba(187,39,68,0.26)' },

  rowTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  rowBodyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 60 },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(187,39,68,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.28)',
    marginBottom: 18,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  emptyHint: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },

  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
