import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Constants from 'expo-constants';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { notificationService } from '../services/notificationService';
import { authService } from '../services/authService';
import type { NotificationResponse } from '../types';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  const user = useAuthStore((state) => state.user);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const notificationListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  /**
   * Register for push notifications and return the Expo push token.
   */
  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    // Push notifications are not supported on web
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      // Check current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permission not granted');
        return null;
      }

      // Get the project ID from Constants
      const projectId = Constants.default.expoConfig?.extra?.eas?.projectId ??
        Constants.default.easConfig?.projectId;

      if (!projectId) {
        console.warn('[Notifications] No project ID found for push token registration');
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Ghost Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6C63FF',
        });
      }

      return tokenData.data;
    } catch (error) {
      console.warn('[Notifications] Failed to register:', error);
      return null;
    }
  }, []);

  /**
   * Handle a notification received while the app is in the foreground.
   * Adds it to the notification store for display.
   */
  const handleNotificationReceived = useCallback(
    (notification: Notifications.Notification) => {
      const data = notification.request.content.data as Record<string, unknown> | undefined;

      if (data) {
        const notificationResponse: NotificationResponse = {
          id: (data.notificationId as string) || notification.request.identifier,
          type: (data.type as NotificationResponse['type']) || 'COMMENT_ADDED',
          title: notification.request.content.title || '',
          body: notification.request.content.body || null,
          referenceType: (data.referenceType as string) || null,
          referenceId: (data.referenceId as string) || null,
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        addNotification(notificationResponse);
      }
    },
    [addNotification]
  );

  /**
   * Handle a notification tap - navigate to the relevant screen based on
   * the notification's reference type and ID.
   */
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;

      if (!data) return;

      const referenceType = data.referenceType as string | undefined;
      const referenceId = data.referenceId as string | undefined;
      const whiteboardId = data.whiteboardId as string | undefined;

      if (!referenceType || !referenceId) return;

      switch (referenceType) {
        case 'QUESTION':
          if (whiteboardId) {
            router.push({
              pathname: '/question/[id]',
              params: { id: referenceId, whiteboardId },
            });
          } else {
            router.push({
              pathname: '/question/[id]',
              params: { id: referenceId },
            });
          }
          break;

        case 'WHITEBOARD':
          router.push({
            pathname: '/whiteboard/[id]',
            params: { id: referenceId },
          });
          break;

        case 'COMMENT':
          // Navigate to the parent question
          if (data.questionId) {
            router.push({
              pathname: '/question/[id]',
              params: {
                id: data.questionId as string,
                whiteboardId: whiteboardId ?? undefined,
              },
            });
          }
          break;

        default:
          // Navigate to the notifications tab
          router.push('/(tabs)/notifications');
          break;
      }

      // Mark the notification as read
      const notificationId = data.notificationId as string | undefined;
      if (notificationId) {
        notificationService.markAsRead(notificationId).catch(() => {
          console.warn('[Notifications] Failed to mark notification as read');
        });
      }
    },
    []
  );

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
    if (!isAuthenticated || !user) {
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

    // Fetch initial unread count
    fetchUnreadCount();

    // Listen for notifications received while app is in foreground
    notificationListenerRef.current =
      Notifications.addNotificationReceivedListener(handleNotificationReceived);

    // Listen for notification taps
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse
      );

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
      }
    };
  }, [
    isAuthenticated,
    user,
    registerForPushNotifications,
    fetchUnreadCount,
    handleNotificationReceived,
    handleNotificationResponse,
  ]);

  return {
    registerForPushNotifications,
    fetchUnreadCount,
  };
}
