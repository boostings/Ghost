import type { CommentResponse } from '../types';

type ParsedCommentMessage = {
  type?: string;
  comment?: CommentResponse;
  commentId?: string;
};

export function sortCommentsByCreatedAt(comments: CommentResponse[]): CommentResponse[] {
  return [...comments].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

export function parseCommentMessage(body: string): ParsedCommentMessage {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    const envelope = parsed as { type?: unknown; payload?: unknown; id?: unknown };
    const type = typeof envelope.type === 'string' ? envelope.type : undefined;
    const payload = envelope.payload ?? parsed;

    if (payload && typeof payload === 'object') {
      const payloadObject = payload as Record<string, unknown>;
      const payloadId = typeof payloadObject.id === 'string' ? payloadObject.id : undefined;
      const hasCommentShape =
        typeof payloadObject.authorName === 'string' &&
        typeof payloadObject.body === 'string' &&
        typeof payloadObject.createdAt === 'string';

      if (hasCommentShape && payloadId) {
        return { type, comment: payloadObject as unknown as CommentResponse };
      }

      if (payloadId) {
        return { type, commentId: payloadId };
      }
    }

    const rootId = typeof envelope.id === 'string' ? envelope.id : undefined;
    return { type, commentId: rootId };
  } catch {
    return {};
  }
}

export function reconcileCommentEvent(
  comments: CommentResponse[],
  messageBody: string
): CommentResponse[] {
  const { type, comment, commentId } = parseCommentMessage(messageBody);
  const normalizedType = type?.toUpperCase() ?? '';
  const isDeleteEvent = normalizedType.includes('DELETE') || normalizedType.includes('REMOVE');

  if (isDeleteEvent && commentId) {
    return comments.filter((existing) => existing.id !== commentId);
  }

  if (!comment) {
    return comments;
  }

  const existingIndex = comments.findIndex((existing) => existing.id === comment.id);
  if (existingIndex >= 0) {
    const next = [...comments];
    next[existingIndex] = comment;
    return sortCommentsByCreatedAt(next);
  }

  return sortCommentsByCreatedAt([...comments, comment]);
}
