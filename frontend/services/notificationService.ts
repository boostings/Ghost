import api from './api';
import { Config } from '../constants/config';
import type {
  NotificationResponse,
  PageResponse,
  PaginationParams,
  UnreadCountResponse,
} from '../types';

/**
 * Notification service - handles fetching notifications,
 * marking them as read, and getting unread counts.
 */
export const notificationService = {
  /**
   * Get paginated list of notifications for the current user.
   * GET /notifications
   */
  getNotifications: async (
    params?: PaginationParams
  ): Promise<PageResponse<NotificationResponse>> => {
    const response = await api.get<PageResponse<NotificationResponse>>(
      '/notifications',
      {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? Config.PAGE_SIZE,
        },
      }
    );
    return response.data;
  },

  /**
   * Get the count of unread notifications.
   * GET /notifications/unread-count
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<UnreadCountResponse>(
      '/notifications/unread-count'
    );
    return response.data.count;
  },

  /**
   * Mark a single notification as read.
   * PUT /notifications/{id}/read
   */
  markAsRead: async (id: string): Promise<void> => {
    await api.put(`/notifications/${id}/read`);
  },

  /**
   * Mark all notifications as read.
   * PUT /notifications/read-all
   */
  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
  },
};
