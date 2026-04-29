import { useEffect, useRef, useCallback } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { notificationService } from '../services/notificationService';
import { authService } from '../services/authService';
import {
  getNativeNotificationsModule,
  registerForPushNotifications,
} from '../services/pushNotificationService';
import { useWebSocket } from './useWebSocket';
import {
  getNotificationReadId,
  parseRealtimeNotificationMessage,
  resolveNotificationRoute,
  toForegroundNotification,
} from '../utils/notificationPayloads';
import { useNotificationPreferences } from './useNotificationPreferences';
import type {
  EventSubscription,
  Notification as ExpoNotification,
  NotificationResponse as ExpoNotificationResponse,
} from 'expo-notifications';

const HANDLED_RESPONSE_HISTORY_LIMIT = 50;

/**
 * Hook for managing Expo push notifications.
 *
 * Features:
 * - Registers for push notifications and saves the token to the backend
 * - Handles notification received while app is in the foreground
 * - Handles notification tap (navigates to the relevant screen)
 * - Fetches initial unread count on mount
 *
 * Usage:
 * ```ts
 * function App() {
 *   useNotifications();
 *   // ...
 * }
 * ```
 */
export function useNotifications() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const pushEnabled = useNotificationPreferences().pushEnabled;
  const { subscribe } = useWebSocket();

  const notificationListenerRef = useRef<EventSubscription | null>(null);
  const responseListenerRef = useRef<EventSubscription | null>(null);
  const handledResponseIdsRef = useRef<Set<string>>(new Set());

  /**
   * Handle a notification received while the app is in the foreground.
   * Adds it to the notification store for display.
   */
  const handleNotificationReceived = useCallback(
    (notification: ExpoNotification) => {
      const notificationResponse = toForegroundNotification({
        identifier: notification.request.identifier,
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data as Record<string, unknown> | undefined,
      });

      if (notificationResponse) {
        addNotification(notificationResponse);
      }
    },
    [addNotification]
  );

  /**
   * Handle a notification tap - navigate to the relevant screen based on
   * the notification's reference type and ID.
   */
  const handleNotificationResponse = useCallback((response: ExpoNotificationResponse) => {
    const responseId = response.notification.request.identifier;
    if (handledResponseIdsRef.current.has(responseId)) {
      return;
    }
    if (handledResponseIdsRef.current.size >= HANDLED_RESPONSE_HISTORY_LIMIT) {
      const oldestId = handledResponseIdsRef.current.values().next().value;
      if (oldestId !== undefined) {
        handledResponseIdsRef.current.delete(oldestId);
      }
    }
    handledResponseIdsRef.current.add(responseId);

    const data = response.notification.request.content.data as Record<string, unknown> | undefined;

    const route = resolveNotificationRoute(data);
    if (route) {
      router.push(route);
    }

    const notificationId = data ? getNotificationReadId(data) : null;
    if (notificationId) {
      notificationService.markAsRead(notificationId).catch(() => {
        console.warn('[Notifications] Failed to mark notification as read');
      });
    }
  }, []);

  /**
   * Fetch the initial unread notification count from the server.
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      console.warn('[Notifications] Failed to fetch unread count');
    }
  }, [setUnreadCount]);

  // Main effect: register for push notifications and set up listeners
  useEffect(() => {
    if (!isAuthenticated || !user || !accessToken) {
      return;
    }

    const Notifications = getNativeNotificationsModule();

    // Fetch initial unread count even when remote push delivery is disabled.
    fetchUnreadCount();

    if (!pushEnabled) {
      authService.clearPushToken().catch(() => {
        console.warn('[Notifications] Failed to clear push token from backend');
      });
      return;
    }

    // Register for push notifications and save token to backend
    registerForPushNotifications().then((token) => {
      if (token) {
        authService.updatePushToken(token).catch(() => {
          console.warn('[Notifications] Failed to save push token to backend');
        });
      }
    });

    if (!Notifications) {
      return;
    }

    // Listen for notifications received while app is in foreground
    notificationListenerRef.current = Notifications.addNotificationReceivedListener(
      handleNotificationReceived
    );

    // Listen for notification taps
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          handleNotificationResponse(response);
        }
      })
      .catch(() => {
        console.warn('[Notifications] Failed to read launch notification response');
      });

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
      }
    };
  }, [
    accessToken,
    pushEnabled,
    isAuthenticated,
    user,
    fetchUnreadCount,
    handleNotificationReceived,
    handleNotificationResponse,
  ]);

  // Subscribe to personal WebSocket notifications for real-time updates.
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user?.id) {
      return;
    }

    const subscription = subscribe(`/topic/user/${user.id}/notifications`, (frame) => {
      const notification = parseRealtimeNotificationMessage(frame.body);
      if (!notification) {
        console.warn('[Notifications] Failed to parse WebSocket notification');
        return;
      }

      try {
        if (notification.id) {
          const exists = useNotificationStore
            .getState()
            .notifications.some((item) => item.id === notification.id);
          if (!exists) {
            addNotification(notification);
          }
        }
      } catch (error) {
        console.warn('[Notifications] Failed to store WebSocket notification', error);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [accessToken, addNotification, isAuthenticated, subscribe, user?.id]);

  return {
    registerForPushNotifications,
    fetchUnreadCount,
  };
}
