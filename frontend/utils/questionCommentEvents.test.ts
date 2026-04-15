import {
  parseCommentMessage,
  reconcileCommentEvent,
  sortCommentsByCreatedAt,
} from './questionCommentEvents';
import type { CommentResponse } from '../types';

function makeComment(overrides: Partial<CommentResponse> = {}): CommentResponse {
  return {
    id: overrides.id ?? 'c-1',
    questionId: overrides.questionId ?? 'q-1',
    authorId: overrides.authorId ?? 'u-1',
    authorName: overrides.authorName ?? 'Taylor Student',
    body: overrides.body ?? 'Comment body',
    isVerifiedAnswer: overrides.isVerifiedAnswer ?? false,
    verifiedById: overrides.verifiedById ?? null,
    verifiedByName: overrides.verifiedByName ?? null,
    karmaScore: overrides.karmaScore ?? 0,
    userVote: overrides.userVote ?? null,
    canEdit: overrides.canEdit ?? true,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('questionCommentEvents', () => {
  it('sorts comments chronologically', () => {
    const comments = [
      makeComment({ id: 'c-2', createdAt: '2026-01-02T00:00:00.000Z' }),
      makeComment({ id: 'c-1', createdAt: '2026-01-01T00:00:00.000Z' }),
    ];

    expect(sortCommentsByCreatedAt(comments).map((comment) => comment.id)).toEqual(['c-1', 'c-2']);
  });

  it('parses websocket envelopes with comment payloads', () => {
    const message = JSON.stringify({
      type: 'COMMENT_UPDATED',
      payload: makeComment({ id: 'c-9' }),
    });

    expect(parseCommentMessage(message)).toEqual({
      type: 'COMMENT_UPDATED',
      comment: expect.objectContaining({ id: 'c-9' }),
    });
  });

  it('removes comments on delete events', () => {
    const next = reconcileCommentEvent(
      [makeComment({ id: 'c-1' }), makeComment({ id: 'c-2' })],
      JSON.stringify({
        type: 'COMMENT_DELETED',
        payload: { id: 'c-1' },
      })
    );

    expect(next.map((comment) => comment.id)).toEqual(['c-2']);
  });

  it('upserts updated comments and keeps them sorted', () => {
    const next = reconcileCommentEvent(
      [
        makeComment({ id: 'c-1', createdAt: '2026-01-01T00:00:00.000Z' }),
        makeComment({ id: 'c-2', createdAt: '2026-01-03T00:00:00.000Z' }),
      ],
      JSON.stringify({
        type: 'COMMENT_UPDATED',
        payload: makeComment({
          id: 'c-3',
          createdAt: '2026-01-02T00:00:00.000Z',
        }),
      })
    );

    expect(next.map((comment) => comment.id)).toEqual(['c-1', 'c-3', 'c-2']);
  });

  it('does not duplicate a comment when the same id is reconciled twice', () => {
    const existing = [makeComment({ id: 'c-1' })];

    const next = reconcileCommentEvent(
      existing,
      JSON.stringify({
        type: 'COMMENT_CREATED',
        payload: makeComment({ id: 'c-1', body: 'Updated body from websocket' }),
      })
    );

    expect(next).toHaveLength(1);
    expect(next[0]).toEqual(expect.objectContaining({ id: 'c-1', body: 'Updated body from websocket' }));
  });
});
