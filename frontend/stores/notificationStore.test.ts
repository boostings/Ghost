import { useNotificationStore } from './notificationStore';
import type { NotificationResponse } from '../types';

function makeNotification(id: string, isRead = false): NotificationResponse {
  return {
    id,
    type: 'COMMENT_ADDED',
    title: 'New comment',
    body: 'A comment was posted',
    referenceType: 'QUESTION',
    referenceId: 'question-1',
    isRead,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.getState().reset();
  });

  it('adds notifications and increments unread for unread items', () => {
    const store = useNotificationStore.getState();
    store.addNotification(makeNotification('n-1', false));
    store.addNotification(makeNotification('n-2', true));

    const next = useNotificationStore.getState();
    expect(next.notifications).toHaveLength(2);
    expect(next.unreadCount).toBe(1);
  });

  it('marks notifications as read and supports mark-all', () => {
    const store = useNotificationStore.getState();
    store.setNotifications([makeNotification('n-1', false), makeNotification('n-2', false)]);
    store.setUnreadCount(2);

    store.markAsRead('n-1');
    expect(useNotificationStore.getState().unreadCount).toBe(1);

    store.markAllAsRead();
    const next = useNotificationStore.getState();
    expect(next.unreadCount).toBe(0);
    expect(next.notifications.every((notification) => notification.isRead)).toBe(true);
  });
});
