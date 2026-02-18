import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import EmptyState from '../../components/ui/EmptyState';
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
  const {
    notifications,
    setNotifications,
    markAsRead,
    markAllAsRead: storeMarkAllAsRead,
    setLoading,
    isLoading,
  } = useNotificationStore();

  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationService.list(0, 50);
      setNotifications(response.content);
    } catch {
      setNotifications([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: NotificationResponse) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
      try {
        await notificationService.markAsRead(notification.id);
      } catch {
        // Ignore
      }
    }

    if (notification.referenceType === 'QUESTION' && notification.referenceId) {
      router.push(`/question/${notification.referenceId}`);
    } else if (notification.referenceType === 'WHITEBOARD' && notification.referenceId) {
      router.push(`/whiteboard/${notification.referenceId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    storeMarkAllAsRead();
    try {
      await notificationService.markAllAsRead();
    } catch {
      // Ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderNotification = ({ item }: { item: NotificationResponse }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleNotificationPress(item)}
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
  );

  return (
    <LinearGradient
      colors={['#1A1A2E', '#16213E', '#0F3460']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead}>
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
                subtitle="You're all caught up! Notifications will appear here when there's activity on your questions."
              />
            }
          />
        )}
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
});
