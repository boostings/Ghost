import { create } from 'zustand';
import type { NotificationResponse } from '../types';

interface NotificationState {
  unreadCount: number;
  notifications: NotificationResponse[];
  isLoading: boolean;
}

interface NotificationActions {
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  setNotifications: (notifications: NotificationResponse[]) => void;
  addNotification: (notification: NotificationResponse) => void;
  appendNotifications: (notifications: NotificationResponse[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setLoading: (isLoading: boolean) => void;
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const initialState: NotificationState = {
  unreadCount: 0,
  notifications: [],
  isLoading: false,
};

export const useNotificationStore = create<NotificationStore>()((set) => ({
  ...initialState,

  setUnreadCount: (count: number) => {
    set({ unreadCount: count });
  },

  incrementUnreadCount: () => {
    set((state) => ({ unreadCount: state.unreadCount + 1 }));
  },

  decrementUnreadCount: () => {
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  setNotifications: (notifications: NotificationResponse[]) => {
    set({ notifications, isLoading: false });
  },

  addNotification: (notification: NotificationResponse) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
    }));
  },

  appendNotifications: (notifications: NotificationResponse[]) => {
    set((state) => ({
      notifications: [...state.notifications, ...notifications],
      isLoading: false,
    }));
  },

  markAsRead: (id: string) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      const wasUnread = notification && !notification.isRead;

      return {
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  reset: () => {
    set(initialState);
  },
}));
