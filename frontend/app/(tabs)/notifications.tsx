import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import type { NotificationResponse, NotificationType } from '../../types';

const PAGE_SIZE = 20;
const OUT_EASE = Easing.bezier(0.16, 1, 0.3, 1);

type IconSpec = { name: keyof typeof Ionicons.glyphMap; tint: string };

const ICONS: Record<NotificationType, IconSpec> = {
  QUESTION_ANSWERED: { name: 'checkmark-circle', tint: Colors.success },
  COMMENT_ADDED: { name: 'chatbubble-ellipses', tint: Colors.primary },
  QUESTION_FORWARDED: { name: 'arrow-redo', tint: Colors.info },
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

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
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

        const response = await notificationService.list(nextPage, PAGE_SIZE);
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
      if (notifications.length === 0 || isStale) {
        void fetchNotifications({ page: 0, replace: true });
      }
    }, [fetchNotifications, notifications.length])
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
      if (n.type === 'REPORT_SUBMITTED' && n.referenceId) {
        router.push({ pathname: '/moderation/reports', params: { whiteboardId: n.referenceId } });
      } else if (n.referenceType === 'QUESTION' && n.referenceId) {
        router.push({ pathname: '/question/[id]', params: { id: n.referenceId } });
      } else if (n.referenceType === 'WHITEBOARD' && n.referenceId) {
        router.push({ pathname: '/whiteboard/[id]', params: { id: n.referenceId } });
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
            <Text style={styles.eyebrow}>ACTIVITY</Text>
            <Text style={styles.headerTitle}>Alerts</Text>
            <Text style={styles.headerMeta}>
              {empty
                ? 'Nothing new yet'
                : unreadCount === 0
                  ? `All caught up · ${notifications.length} total`
                  : `${unreadCount} unread · ${notifications.length} total`}
            </Text>
          </View>
          {unreadCount > 0 ? (
            <Pressable
              onPress={handleMarkAll}
              style={({ pressed }) => [
                styles.markAllButton,
                pressed && styles.markAllButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <Ionicons name="checkmark-done" size={14} color={Colors.primary} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : null}
        </View>

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
  const icon = ICONS[item.type] ?? { name: 'notifications', tint: Colors.primary };
  return (
    <Animated.View entering={entering} style={styles.rowWrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          item.isRead ? styles.rowRead : styles.rowUnread,
          pressed && styles.rowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <View style={[styles.rail, !item.isRead && styles.railUnread]} />
        <View style={[styles.iconCell, { backgroundColor: `${icon.tint}1F` }]}>
          <Ionicons name={icon.name} size={16} color={icon.tint} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTopRow}>
            <Text
              style={[styles.rowTitle, !item.isRead && styles.rowTitleUnread]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={styles.rowTime}>{formatRelative(item.createdAt)}</Text>
          </View>
          {item.body ? (
            <Text style={styles.rowBodyText} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
        </View>
        {!item.isRead ? <View style={styles.unreadDot} /> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

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
  markAllButton: {
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
  markAllButtonPressed: { backgroundColor: 'rgba(187,39,68,0.26)' },
  markAllText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 0.4,
  },

  listContent: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 110 },
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
  rail: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginRight: 12,
  },
  railUnread: { backgroundColor: Colors.primary },
  iconCell: {
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
