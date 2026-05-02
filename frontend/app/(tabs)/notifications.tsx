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
import { Colors, useThemeColors } from '../../constants/colors';
import { haptic } from '../../utils/haptics';
import { useNotificationStore } from '../../stores/notificationStore';
import { notificationService } from '../../services/notificationService';
import { resolveStoredNotificationRoute } from '../../utils/notificationPayloads';
import { formatTimestamp } from '../../utils/formatTimestamp';
import type { NotificationResponse, NotificationType } from '../../types';

const PAGE_SIZE = 20;
const OUT_EASE = Easing.bezier(0.16, 1, 0.3, 1);

type IconSpec = { name: keyof typeof Ionicons.glyphMap; tint: string };

const ICONS: Record<NotificationType, IconSpec> = {
  QUESTION_CREATED: { name: 'help-circle', tint: Colors.info },
  QUESTION_ANSWERED: { name: 'checkmark-circle', tint: Colors.success },
  COMMENT_ADDED: { name: 'chatbubble-ellipses', tint: Colors.primary },
  QUESTION_FORWARDED: { name: 'arrow-redo', tint: Colors.info },
  JOIN_REQUEST_SUBMITTED: { name: 'person-add-outline', tint: Colors.info },
  JOIN_REQUEST_APPROVED: { name: 'person-add', tint: Colors.success },
  JOIN_REQUEST_REJECTED: { name: 'close-circle', tint: Colors.error },
  REPORT_SUBMITTED: { name: 'flag', tint: Colors.warning },
  CONTENT_HIDDEN: { name: 'eye-off', tint: Colors.warning },
  POST_TRENDING: { name: 'flame', tint: Colors.primary },
};

type Section = {
  key: 'today' | 'week' | 'earlier';
  title: string;
  items: NotificationResponse[];
};

function bucketize(items: NotificationResponse[]): Section[] {
  const now = Date.now();
  const today: NotificationResponse[] = [];
  const week: NotificationResponse[] = [];
  const earlier: NotificationResponse[] = [];
  for (const n of items) {
    const age = now - new Date(n.createdAt).getTime();
    if (age < 1000 * 60 * 60 * 24) today.push(n);
    else if (age < 1000 * 60 * 60 * 24 * 7) week.push(n);
    else earlier.push(n);
  }
  const out: Section[] = [];
  if (today.length) out.push({ key: 'today', title: 'TODAY', items: today });
  if (week.length) out.push({ key: 'week', title: 'EARLIER THIS WEEK', items: week });
  if (earlier.length) out.push({ key: 'earlier', title: 'EARLIER', items: earlier });
  return out;
}

type ListRow =
  | { type: 'section'; key: string; title: string }
  | { type: 'item'; key: string; item: NotificationResponse };

function flatten(sections: Section[]): ListRow[] {
  const rows: ListRow[] = [];
  for (const s of sections) {
    rows.push({ type: 'section', key: `s-${s.key}`, title: s.title });
    for (const item of s.items) rows.push({ type: 'item', key: item.id, item });
  }
  return rows;
}

export default function AlertsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const reduceMotion = useReducedMotion();
  const notifications = useNotificationStore((state) => state.notifications);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const storeMarkAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearAll = useNotificationStore((state) => state.clearAll);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const setLoading = useNotificationStore((state) => state.setLoading);
  const isLoading = useNotificationStore((state) => state.isLoading);

  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastFetchRef = useRef(0);
  const requestInFlightRef = useRef(false);

  const fetchNotifications = useCallback(
    async (options?: { page?: number; replace?: boolean }) => {
      const nextPage = options?.page ?? 0;
      const replace = options?.replace ?? true;
      if (requestInFlightRef.current) return;
      if (!replace && (!hasMore || loadingMore)) return;

      requestInFlightRef.current = true;
      try {
        if (replace) setLoading(true);
        else setLoadingMore(true);

        const response = await notificationService.getNotifications({
          page: nextPage,
          size: PAGE_SIZE,
        });
        const current = replace ? [] : useNotificationStore.getState().notifications;
        setNotifications([...current, ...response.content]);
        setPage(nextPage);
        setHasMore(nextPage + 1 < response.totalPages);
        lastFetchRef.current = Date.now();
        setLoadError(null);
      } catch {
        setLoadError("Couldn't load notifications. Pull down to retry.");
        if (replace) setNotifications([]);
        setHasMore(false);
      } finally {
        if (replace) setLoading(false);
        else setLoadingMore(false);
        requestInFlightRef.current = false;
      }
    },
    [hasMore, loadingMore, setLoading, setNotifications]
  );

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchRef.current > 30000;
      if (lastFetchRef.current === 0 || isStale) {
        void fetchNotifications({ page: 0, replace: true });
      }
    }, [fetchNotifications])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications({ page: 0, replace: true });
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || isLoading) return;
    await fetchNotifications({ page: page + 1, replace: false });
  }, [fetchNotifications, hasMore, isLoading, loadingMore, page]);

  const handlePress = useCallback(
    (n: NotificationResponse) => {
      haptic.selection();
      if (!n.isRead) {
        markAsRead(n.id);
        notificationService.markAsRead(n.id).catch(() => undefined);
      }
      const route = resolveStoredNotificationRoute(n);
      if (route) {
        router.push(route);
      }
    },
    [markAsRead, router]
  );

  const handleMarkAll = useCallback(() => {
    if (notifications.every((n) => n.isRead)) return;
    haptic.success();
    storeMarkAllAsRead();
    notificationService.markAllAsRead().catch(() => undefined);
  }, [notifications, storeMarkAllAsRead]);

  const handleClearAll = useCallback(() => {
    if (notifications.length === 0) return;

    Alert.alert('Clear all alerts?', 'This removes every alert from this list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: () => {
          const previousState = useNotificationStore.getState();
          const previousNotifications = previousState.notifications;
          const previousUnreadCount = previousState.unreadCount;
          const previousPage = page;
          const previousHasMore = hasMore;
          const previousLastFetch = lastFetchRef.current;
          haptic.warning();
          clearAll();
          setPage(0);
          setHasMore(false);
          lastFetchRef.current = Date.now();
          notificationService.clearAll().catch(() => {
            setNotifications(previousNotifications);
            setUnreadCount(previousUnreadCount);
            setPage(previousPage);
            setHasMore(previousHasMore);
            lastFetchRef.current = previousLastFetch;
            setLoadError("Couldn't clear alerts. Please try again.");
          });
        },
      },
    ]);
  }, [clearAll, hasMore, notifications.length, page, setNotifications, setUnreadCount]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const sections = useMemo(() => bucketize(notifications), [notifications]);
  const rows = useMemo(() => flatten(sections), [sections]);

  const renderRow = useCallback(
    ({ item, index }: { item: ListRow; index: number }) => {
      if (item.type === 'section') {
        return (
          <Animated.View
            entering={reduceMotion ? FadeIn.duration(160) : FadeIn.duration(240).delay(40)}
          >
            <Text style={styles.sectionLabel}>{item.title}</Text>
          </Animated.View>
        );
      }
      const enter = reduceMotion
        ? FadeIn.duration(160)
        : FadeInDown.duration(320)
            .delay(Math.min(index, 10) * 28)
            .easing(OUT_EASE);
      return <AlertRow item={item.item} entering={enter} onPress={() => handlePress(item.item)} />;
    },
    [handlePress, reduceMotion]
  );

  const empty = !isLoading && notifications.length === 0;

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
            <Text style={[styles.eyebrow, { color: colors.primary }]}>ACTIVITY</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Alerts</Text>
            <Text style={[styles.headerMeta, { color: colors.textMuted }]}>
              {empty
                ? 'Nothing new yet'
                : unreadCount === 0
                  ? `All caught up · ${notifications.length} total`
                  : `${unreadCount} unread · ${notifications.length} total`}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {notifications.length > 0 ? (
              <Pressable
                onPress={handleClearAll}
                style={({ pressed }) => [
                  styles.headerActionButton,
                  {
                    backgroundColor: `${colors.error}1F`,
                    borderColor: `${colors.error}40`,
                  },
                  pressed && { backgroundColor: `${colors.error}33` },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Clear all alerts"
              >
                <Ionicons name="trash-outline" size={14} color={colors.error} />
                <Text style={[styles.headerActionText, { color: colors.error }]}>Clear all</Text>
              </Pressable>
            ) : null}
            {unreadCount > 0 ? (
              <Pressable
                onPress={handleMarkAll}
                style={({ pressed }) => [
                  styles.headerActionButton,
                  {
                    backgroundColor: `${colors.primary}1F`,
                    borderColor: `${colors.primary}40`,
                  },
                  pressed && { backgroundColor: `${colors.primary}33` },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Mark all as read"
              >
                <Ionicons name="checkmark-done" size={14} color={colors.primary} />
                <Text style={[styles.headerActionText, { color: colors.primary }]}>
                  Mark all read
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <FlatList
          style={styles.list}
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
            isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="notifications-outline" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No alerts yet</Text>
                <Text style={styles.emptyHint}>
                  {loadError ?? 'You will see answers, comments, and class invites here.'}
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

function AlertRow({
  item,
  entering,
  onPress,
}: {
  item: NotificationResponse;
  entering: ReturnType<typeof FadeInDown.duration>;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const icon = ICONS[item.type] ?? { name: 'notifications', tint: colors.primary };
  return (
    <Animated.View entering={entering} style={styles.rowWrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          !item.isRead && {
            backgroundColor: colors.surfaceLight,
            borderColor: `${colors.primary}4D`,
          },
          pressed && { backgroundColor: colors.surfaceLight },
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        {/* Removed left rail; the dot on the right + the unread row tint already convey unread state. */}
        <View style={[styles.iconCell, { backgroundColor: `${icon.tint}1F` }]}>
          <Ionicons name={icon.name} size={16} color={icon.tint} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTopRow}>
            <Text
              style={[
                styles.rowTitle,
                { color: item.isRead ? colors.textSecondary : colors.text },
                !item.isRead && styles.rowTitleUnread,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={[styles.rowTime, { color: colors.textMuted }]}>
              {formatTimestamp(item.createdAt)}
            </Text>
          </View>
          {item.body ? (
            <Text style={[styles.rowBodyText, { color: colors.textMuted }]} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
        </View>
        {!item.isRead ? (
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  list: { flex: 1, marginBottom: 96 },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 12,
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -0.8,
  },
  headerMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 6,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    flexShrink: 1,
    gap: 8,
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(187,39,68,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.40)',
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 0.4,
  },

  listContent: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 150 },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },

  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginTop: 18,
    marginBottom: 10,
  },

  rowWrap: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    paddingVertical: 12,
    paddingRight: 14,
  },
  rowRead: {},
  rowUnread: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(187,39,68,0.30)',
  },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.10)' },
  iconCell: {
    marginLeft: 12,
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 12,
  },
  rowBody: { flex: 1 },
  rowTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  rowTitle: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  rowTitleUnread: { color: Colors.text, fontWeight: '900' },
  rowTime: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.4,
  },
  rowBodyText: { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 10,
    marginTop: 8,
  },

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
