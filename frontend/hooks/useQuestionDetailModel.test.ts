import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { QuestionResponse } from '../types';

const mockSubscribe = jest.fn();
const mockQuestionService = {
  getById: jest.fn(),
  getByIdGlobal: jest.fn(),
  delete: jest.fn(),
  close: jest.fn(),
  pin: jest.fn(),
  unpin: jest.fn(),
  vote: jest.fn(),
  removeVote: jest.fn(),
};
const mockCommentService = {
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  vote: jest.fn(),
  removeVote: jest.fn(),
  verify: jest.fn(),
};
const mockBookmarkService = {
  add: jest.fn(),
  remove: jest.fn(),
};

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(() => callback(), [callback]);
  },
}));

jest.mock('./useWebSocket', () => ({
  useWebSocket: () => ({
    subscribe: mockSubscribe,
  }),
}));

jest.mock('../stores/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string; role: 'FACULTY' } }) => unknown) =>
    selector({
      user: {
        id: 'u-1',
        role: 'FACULTY',
      },
    }),
}));

jest.mock('../services/questionService', () => ({
  questionService: mockQuestionService,
}));

jest.mock('../services/commentService', () => ({
  commentService: mockCommentService,
}));

jest.mock('../services/bookmarkService', () => ({
  bookmarkService: mockBookmarkService,
}));

jest.mock('../utils/sanitize', () => ({
  sanitizeText: (value: string) => value.trim(),
}));

jest.mock('./useApi', () => ({
  extractErrorMessage: () => 'Something went wrong',
}));

import { useQuestionDetailModel } from './useQuestionDetailModel';

function makeQuestion(overrides: Partial<QuestionResponse> = {}): QuestionResponse {
  return {
    id: overrides.id ?? 'q-1',
    whiteboardId: overrides.whiteboardId ?? 'wb-1',
    authorId: overrides.authorId ?? 'u-2',
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
    createdAt: overrides.createdAt ?? '2026-03-25T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-25T10:00:00.000Z',
  };
}

describe('useQuestionDetailModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockImplementation((_destination, callback) => ({
      unsubscribe: jest.fn(),
      callback,
    }));
    mockQuestionService.getById.mockResolvedValue(makeQuestion());
    mockCommentService.list.mockResolvedValue([]);
  });

  it('notifies callers when the current question is deleted remotely', async () => {
    const subscriptions = new Map<string, (frame: { body: string }) => void>();
    const onQuestionDeleted = jest.fn();
    mockSubscribe.mockImplementation((destination, callback) => {
      subscriptions.set(destination, callback);
      return { unsubscribe: jest.fn() };
    });

    renderHook(() =>
      useQuestionDetailModel({
        questionId: 'q-1',
        whiteboardId: 'wb-1',
        onQuestionDeleted,
      })
    );

    await waitFor(() => {
      expect(subscriptions.has('/topic/whiteboard/wb-1/questions')).toBe(true);
    });

    act(() => {
      subscriptions.get('/topic/whiteboard/wb-1/questions')?.({
        body: JSON.stringify({
          type: 'QUESTION_DELETED',
          payload: { id: 'q-1' },
        }),
      });
    });

    expect(onQuestionDeleted).toHaveBeenCalledTimes(1);
  });
});
