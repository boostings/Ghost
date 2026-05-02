import api from './api';
import { Config } from '../constants/config';
import { useAuthStore } from '../stores/authStore';
import type {
  NotificationResponse,
  NotificationPreferencesResponse,
  PageResponse,
  PaginationParams,
  PushFrequency,
  EmailDigest,
  UnreadCountResponse,
} from '../types';

const UNREAD_COUNT_CACHE_TTL_MS = 5_000;

type UnreadCountCacheEntry = {
  accessToken: string | null;
  count: number;
  expiresAt: number;
};

type UnreadCountFlight = {
  accessToken: string | null;
  promise: Promise<number>;
};

let unreadCountCache: UnreadCountCacheEntry | null = null;
let unreadCountFlight: UnreadCountFlight | null = null;

function resetUnreadCountCache(): void {
  unreadCountCache = null;
  unreadCountFlight = null;
}

async function fetchUnreadCount(accessToken: string | null): Promise<number> {
  const now = Date.now();

  if (
    unreadCountCache &&
    unreadCountCache.accessToken === accessToken &&
    unreadCountCache.expiresAt > now
  ) {
    return unreadCountCache.count;
  }

  if (unreadCountFlight && unreadCountFlight.accessToken === accessToken) {
    return unreadCountFlight.promise;
  }

  const request = (async () => {
    const response = await api.get<UnreadCountResponse>('/notifications/unread-count');
    const count = response.data.count;

    const currentToken = useAuthStore.getState().accessToken ?? null;
    if (currentToken === accessToken) {
      unreadCountCache = {
        accessToken,
        count,
        expiresAt: Date.now() + UNREAD_COUNT_CACHE_TTL_MS,
      };
    } else {
      unreadCountCache = null;
    }

    return count;
  })();

  unreadCountFlight = { accessToken, promise: request };

  void request
    .finally(() => {
      if (unreadCountFlight?.accessToken === accessToken) {
        unreadCountFlight = null;
      }
    })
    .catch(() => undefined);

  return request;
}

export const notificationService = {
  getNotifications: async (
    params?: PaginationParams
  ): Promise<PageResponse<NotificationResponse>> => {
    const response = await api.get<PageResponse<NotificationResponse>>('/notifications', {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? Config.PAGE_SIZE,
      },
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const accessToken = useAuthStore.getState().accessToken ?? null;
    return fetchUnreadCount(accessToken);
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.put(`/notifications/${id}/read`);
    resetUnreadCountCache();
  },

  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
    resetUnreadCountCache();
  },

  clearAll: async (): Promise<void> => {
    await api.delete('/notifications');
    resetUnreadCountCache();
  },

  getPreferences: async (): Promise<NotificationPreferencesResponse> => {
    const response = await api.get<NotificationPreferencesResponse>('/notifications/preferences');
    return response.data;
  },

  updatePreferences: async (
    pushFrequency: PushFrequency,
    emailDigest: EmailDigest
  ): Promise<NotificationPreferencesResponse> => {
    const response = await api.put<NotificationPreferencesResponse>('/notifications/preferences', {
      pushFrequency,
      emailDigest,
    });
    return response.data;
  },

  updateClassOverride: async (
    whiteboardId: string,
    mutedFor24h: boolean
  ): Promise<NotificationPreferencesResponse> => {
    const response = await api.put<NotificationPreferencesResponse>(
      `/notifications/preferences/classes/${whiteboardId}`,
      { mutedFor24h }
    );
    return response.data;
  },
};
