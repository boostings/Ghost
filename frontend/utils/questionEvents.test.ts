import {
  isQuestionDeleteEvent,
  parseQuestionMessage,
  reconcileQuestionEvent,
  sortQuestionsForFeed,
} from './questionEvents';
import type { QuestionResponse } from '../types';

function makeQuestion(overrides: Partial<QuestionResponse> = {}): QuestionResponse {
  return {
    id: overrides.id ?? 'q-1',
    whiteboardId: overrides.whiteboardId ?? 'wb-1',
    authorId: overrides.authorId ?? 'u-1',
    authorName: overrides.authorName ?? 'Taylor Student',
    topicId: overrides.topicId ?? null,
    topicName: overrides.topicName ?? null,
    title: overrides.title ?? 'Question title',
    body: overrides.body ?? 'Question body',
    status: overrides.status ?? 'OPEN',
    isPinned: overrides.isPinned ?? false,
    isHidden: overrides.isHidden ?? false,
    karmaScore: overrides.karmaScore ?? 0,
    userVote: overrides.userVote ?? null,
    commentCount: overrides.commentCount ?? 0,
    verifiedAnswerId: overrides.verifiedAnswerId ?? null,
    isBookmarked: overrides.isBookmarked ?? false,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('questionEvents', () => {
  it('sorts pinned questions ahead of newer unpinned questions', () => {
    const sorted = sortQuestionsForFeed([
      makeQuestion({ id: 'q-2', createdAt: '2026-01-03T00:00:00.000Z' }),
      makeQuestion({ id: 'q-1', isPinned: true, createdAt: '2026-01-01T00:00:00.000Z' }),
    ]);

    expect(sorted.map((question) => question.id)).toEqual(['q-1', 'q-2']);
  });

  it('parses websocket envelopes with question payloads', () => {
    const message = JSON.stringify({
      type: 'QUESTION_UPDATED',
      payload: makeQuestion({ id: 'q-9' }),
    });

    expect(parseQuestionMessage(message)).toEqual({
      type: 'QUESTION_UPDATED',
      question: expect.objectContaining({ id: 'q-9' }),
    });
  });

  it('detects question delete events regardless of case', () => {
    expect(isQuestionDeleteEvent('question_deleted')).toBe(true);
    expect(isQuestionDeleteEvent('QUESTION_UPDATED')).toBe(false);
  });

  it('removes questions on delete events', () => {
    const next = reconcileQuestionEvent(
      [makeQuestion({ id: 'q-1' }), makeQuestion({ id: 'q-2' })],
      JSON.stringify({
        type: 'QUESTION_DELETED',
        payload: { id: 'q-1' },
      })
    );

    expect(next.map((question) => question.id)).toEqual(['q-2']);
  });
});
