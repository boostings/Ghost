import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import EmptyState from '../../components/ui/EmptyState';
import ScreenWrapper from '../../components/ui/ScreenWrapper';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { useNotificationStore } from '../../stores/notificationStore';
import { notificationService } from '../../services/notificationService';
import { formatDate } from '../../utils/formatDate';
import type { NotificationResponse } from '../../types';

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'QUESTION_ANSWERED':
      return '\u2705';
    case 'COMMENT_ADDED':
      return '\u{1F4AC}';
    case 'QUESTION_FORWARDED':
      return '\u27A1\uFE0F';
    case 'JOIN_REQUEST_APPROVED':
      return '\u{1F389}';
    case 'JOIN_REQUEST_REJECTED':
      return '\u274C';
    case 'CONTENT_HIDDEN':
      return '\u26A0\uFE0F';
    case 'POST_TRENDING':
      return '\u{1F525}';
    default:
      return '\u{1F514}';
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
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
  const PAGE_SIZE = 20;

  const fetchNotifications = useCallback(async (options?: { page?: number; replace?: boolean }) => {
    const nextPage = options?.page ?? 0;
    const replace = options?.replace ?? true;

    if (!replace && (!hasMore || loadingMore)) {
      return;
    }

    try {
      if (replace) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await notificationService.list(nextPage, PAGE_SIZE);
      const current = replace ? [] : useNotificationStore.getState().notifications;
      const merged = [...current, ...response.content];
      setNotifications(merged);
      setPage(nextPage);
      setHasMore(nextPage + 1 < response.totalPages);
      lastFetchRef.current = Date.now();
      setLoadError(null);
    } catch {
      setLoadError('Failed to load notifications. Pull down to retry.');
      if (replace) {
        setNotifications([]);
      }
      setHasMore(false);
    } finally {
      if (replace) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [hasMore, loadingMore, setLoading, setNotifications]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchRef.current > 30000;
      if (notifications.length === 0 || isStale) {
        fetchNotifications({ page: 0, replace: true });
      }
    }, [fetchNotifications, notifications.length])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications({ page: 0, replace: true });
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || isLoading) {
      return;
    }
    await fetchNotifications({ page: page + 1, replace: false });
  };

  const handleNotificationPress = useCallback(async (notification: NotificationResponse) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
      try {
        await notificationService.markAsRead(notification.id);
      } catch {
        // Keep optimistic UI and avoid interrupting navigation.
        console.warn('[Notifications] Failed to mark notification as read');
      }
    }

    if (notification.referenceType === 'QUESTION' && notification.referenceId) {
      router.push({
        pathname: '/question/[id]',
        params: { id: notification.referenceId },
      });
    } else if (notification.referenceType === 'WHITEBOARD' && notification.referenceId) {
      router.push({
        pathname: '/whiteboard/[id]',
        params: { id: notification.referenceId },
      });
    }
  }, [markAsRead, router]);

  const handleMarkAllAsRead = async () => {
    storeMarkAllAsRead();
    try {
      await notificationService.markAllAsRead();
    } catch {
      console.warn('[Notifications] Failed to mark all as read');
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderNotification = useCallback(({ item }: { item: NotificationResponse }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleNotificationPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Open notification: ${item.title}`}
    >
      <GlassCard
        style={[
          styles.notificationCard,
          !item.isRead && styles.notificationUnread,
        ]}
      >
        <View style={styles.notificationRow}>
          <View style={styles.iconContainer}>
            <Text style={styles.notifIcon}>{getNotificationIcon(item.type)}</Text>
          </View>

          <View style={styles.notifContent}>
            <Text
              style={[
                styles.notifTitle,
                !item.isRead && styles.notifTitleUnread,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {item.body && (
              <Text style={styles.notifBody} numberOfLines={2}>
                {item.body}
              </Text>
            )}
            <Text style={styles.notifTime}>{formatDate(item.createdAt)}</Text>
          </View>

          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
      </GlassCard>
    </TouchableOpacity>
  ), [handleNotificationPress]);

  return (
    <ScreenWrapper edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
            >
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification List */}
        {isLoading && notifications.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              notifications.length === 0 && styles.emptyList,
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
              <EmptyState
                icon={"\u{1F514}"}
                title="No Notifications"
                subtitle={loadError || "You're all caught up! Notifications will appear here when there's activity on your questions."}
              />
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
        )}
    </ScreenWrapper>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  markAllText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  emptyList: {
    flexGrow: 1,
  },
  notificationCard: {
    marginBottom: 10,
  },
  notificationUnread: {
    borderColor: 'rgba(108,99,255,0.3)',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifIcon: {
    fontSize: 18,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  notifTitleUnread: {
    color: Colors.text,
    fontWeight: '600',
  },
  notifBody: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    marginLeft: 8,
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
