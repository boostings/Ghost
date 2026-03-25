import {
  getNotificationReadId,
  parseRealtimeNotificationMessage,
  resolveNotificationRoute,
  toForegroundNotification,
} from './notificationPayloads';

describe('notificationPayloads', () => {
  it('maps foreground push payloads into app notifications', () => {
    const notification = toForegroundNotification({
      identifier: 'expo-id',
      title: 'Question answered',
      body: 'A faculty member replied',
      data: {
        notificationId: 'n-1',
        type: 'QUESTION_ANSWERED',
        referenceType: 'QUESTION',
        referenceId: 'q-1',
      },
    });

    expect(notification).toEqual(
      expect.objectContaining({
        id: 'n-1',
        type: 'QUESTION_ANSWERED',
        title: 'Question answered',
        referenceType: 'QUESTION',
        referenceId: 'q-1',
        isRead: false,
      })
    );
  });

  it('resolves question and comment routes with whiteboard context', () => {
    expect(
      resolveNotificationRoute({
        referenceType: 'QUESTION',
        referenceId: 'q-1',
        whiteboardId: 'wb-1',
      })
    ).toEqual({
      pathname: '/question/[id]',
      params: {
        id: 'q-1',
        whiteboardId: 'wb-1',
      },
    });

    expect(
      resolveNotificationRoute({
        referenceType: 'COMMENT',
        referenceId: 'c-2',
        questionId: 'q-2',
        whiteboardId: 'wb-2',
      })
    ).toEqual({
      pathname: '/question/[id]',
      params: {
        id: 'q-2',
        whiteboardId: 'wb-2',
      },
    });
  });

  it('falls back to the notifications tab for unsupported targets', () => {
    expect(
      resolveNotificationRoute({
        referenceType: 'SYSTEM',
        referenceId: 'n-1',
      })
    ).toBe('/(tabs)/notifications');
  });

  it('extracts read ids and parses realtime notification messages', () => {
    expect(getNotificationReadId({ notificationId: 'n-9' })).toBe('n-9');
    expect(
      parseRealtimeNotificationMessage(
        JSON.stringify({
          id: 'n-9',
          type: 'COMMENT_ADDED',
          title: 'New reply',
          body: 'A student replied',
          referenceType: 'QUESTION',
          referenceId: 'q-4',
          isRead: false,
          createdAt: '2026-01-04T00:00:00.000Z',
        })
      )
    ).toEqual({
      id: 'n-9',
      type: 'COMMENT_ADDED',
      title: 'New reply',
      body: 'A student replied',
      referenceType: 'QUESTION',
      referenceId: 'q-4',
      isRead: false,
      createdAt: '2026-01-04T00:00:00.000Z',
    });
  });
});
