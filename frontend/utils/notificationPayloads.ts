import type { NotificationResponse } from '../types';

type NotificationRoute =
  | string
  | {
      pathname: string;
      params?: Record<string, string | undefined>;
    };

type ForegroundNotificationPayload = {
  identifier: string;
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown>;
};

export function toForegroundNotification(
  payload: ForegroundNotificationPayload
): NotificationResponse | null {
  if (!payload.data) {
    return null;
  }

  return {
    id: (payload.data.notificationId as string) || payload.identifier,
    type: (payload.data.type as NotificationResponse['type']) || 'COMMENT_ADDED',
    title: payload.title || '',
    body: payload.body || null,
    referenceType: (payload.data.referenceType as string) || null,
    referenceId: (payload.data.referenceId as string) || null,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
}

export function getNotificationReadId(data: Record<string, unknown>): string | null {
  const notificationId = data.notificationId;
  return typeof notificationId === 'string' ? notificationId : null;
}

export function resolveNotificationRoute(
  data: Record<string, unknown> | undefined
): NotificationRoute | null {
  if (!data) {
    return null;
  }

  const referenceType = data.referenceType as string | undefined;
  const referenceId = data.referenceId as string | undefined;
  const whiteboardId = data.whiteboardId as string | undefined;

  if (!referenceType || !referenceId) {
    return null;
  }

  switch (referenceType) {
    case 'QUESTION':
      return {
        pathname: '/question/[id]',
        params: {
          id: referenceId,
          whiteboardId,
        },
      };

    case 'WHITEBOARD':
      return {
        pathname: '/whiteboard/[id]',
        params: {
          id: referenceId,
        },
      };

    case 'COMMENT':
      if (typeof data.questionId === 'string') {
        return {
          pathname: '/question/[id]',
          params: {
            id: data.questionId,
            whiteboardId,
          },
        };
      }
      return '/(tabs)/notifications';

    default:
      return '/(tabs)/notifications';
  }
}

export function parseRealtimeNotificationMessage(body: string): NotificationResponse | null {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;

    return {
      id: String(parsed.id ?? ''),
      type: (parsed.type as NotificationResponse['type']) ?? 'COMMENT_ADDED',
      title: String(parsed.title ?? ''),
      body: parsed.body ? String(parsed.body) : null,
      referenceType: parsed.referenceType ? String(parsed.referenceType) : null,
      referenceId: parsed.referenceId ? String(parsed.referenceId) : null,
      isRead: Boolean(parsed.isRead),
      createdAt: parsed.createdAt ? String(parsed.createdAt) : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
