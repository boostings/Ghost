import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { CommentResponse, QuestionResponse } from '../types';

const mockSubscribe = jest.fn();

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
  __esModule: true,
  questionService: {
    getById: jest.fn(),
    getByIdGlobal: jest.fn(),
    delete: jest.fn(),
    close: jest.fn(),
    pin: jest.fn(),
    unpin: jest.fn(),
    vote: jest.fn(),
    removeVote: jest.fn(),
  },
}));

jest.mock('../services/commentService', () => ({
  __esModule: true,
  commentService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    vote: jest.fn(),
    removeVote: jest.fn(),
    verify: jest.fn(),
  },
}));

jest.mock('../services/bookmarkService', () => ({
  __esModule: true,
  bookmarkService: {
    add: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../utils/sanitize', () => ({
  sanitizeText: (value: string) => value.trim(),
}));

jest.mock('./useApi', () => ({
  extractErrorMessage: () => 'Something went wrong',
}));

import { bookmarkService } from '../services/bookmarkService';
import { commentService } from '../services/commentService';
import { questionService } from '../services/questionService';
import { useQuestionDetailModel } from './useQuestionDetailModel';

const mockQuestionService = questionService as jest.Mocked<typeof questionService>;
const mockCommentService = commentService as jest.Mocked<typeof commentService>;
const mockBookmarkService = bookmarkService as jest.Mocked<typeof bookmarkService>;

function makeQuestion(overrides: Partial<QuestionResponse> = {}): QuestionResponse {
  return {
    id: overrides.id ?? 'q-1',
    whiteboardId: overrides.whiteboardId ?? 'wb-1',
    whiteboardCourseCode: overrides.whiteboardCourseCode ?? 'IT326',
    whiteboardCourseName: overrides.whiteboardCourseName ?? 'Web Development',
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
    verifiedAnswerPreview: overrides.verifiedAnswerPreview ?? null,
    verifiedAnswerAuthorName: overrides.verifiedAnswerAuthorName ?? null,
    isBookmarked: overrides.isBookmarked ?? false,
    createdAt: overrides.createdAt ?? '2026-03-25T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-25T10:00:00.000Z',
  };
}

function makeComment(overrides: Partial<CommentResponse> = {}): CommentResponse {
  return {
    id: overrides.id ?? 'c-1',
    questionId: overrides.questionId ?? 'q-1',
    authorId: overrides.authorId ?? 'u-2',
    authorName: overrides.authorName ?? 'Taylor Student',
    body: overrides.body ?? 'Answer body',
    karmaScore: overrides.karmaScore ?? 0,
    userVote: overrides.userVote ?? null,
    isVerifiedAnswer: overrides.isVerifiedAnswer ?? false,
    verifiedById: overrides.verifiedById ?? null,
    verifiedByName: overrides.verifiedByName ?? null,
    canEdit: overrides.canEdit ?? false,
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

  it('surfaces a missing question id without touching network services', async () => {
    const { result } = renderHook(() => useQuestionDetailModel({}));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.question).toBeNull();
    expect(result.current.comments).toEqual([]);
    expect(result.current.loadError).toBe('Missing question id.');
    expect(mockQuestionService.getById).not.toHaveBeenCalled();
    expect(mockCommentService.list).not.toHaveBeenCalled();
  });

  it('loads question data, sorts comments, and infers author permissions', async () => {
    mockQuestionService.getById.mockResolvedValue(
      makeQuestion({
        authorId: 'u-1',
        isBookmarked: true,
      })
    );
    mockCommentService.list.mockResolvedValue([
      makeComment({
        id: 'c-2',
        createdAt: '2026-03-25T10:05:00.000Z',
      }),
      makeComment({
        id: 'c-1',
        createdAt: '2026-03-25T10:00:00.000Z',
      }),
    ]);

    const { result } = renderHook(() =>
      useQuestionDetailModel({
        questionId: 'q-1',
        whiteboardId: 'wb-1',
      })
    );

    await waitFor(() => {
      expect(result.current.question?.id).toBe('q-1');
    });

    expect(result.current.question?.id).toBe('q-1');
    expect(result.current.comments.map((comment) => comment.id)).toEqual(['c-1', 'c-2']);
    expect(result.current.isBookmarked).toBe(true);
    expect(result.current.isAuthor).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });

  it('creates and updates comments using sanitized text', async () => {
    mockCommentService.create.mockResolvedValue(
      makeComment({
        id: 'c-2',
        body: 'new answer',
      })
    );
    mockCommentService.update.mockResolvedValue(
      makeComment({
        id: 'c-1',
        body: 'updated answer',
      })
    );
    mockCommentService.list.mockResolvedValue([makeComment()]);

    const { result } = renderHook(() =>
      useQuestionDetailModel({
        questionId: 'q-1',
        whiteboardId: 'wb-1',
      })
    );

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });

    act(() => {
      result.current.setCommentText('  new answer  ');
    });

    await act(async () => {
      await result.current.submitComment();
    });

    expect(mockCommentService.create).toHaveBeenCalledWith('wb-1', 'q-1', { body: 'new answer' });
    expect(result.current.comments.map((comment) => comment.id)).toEqual(['c-1', 'c-2']);
    expect(result.current.commentText).toBe('');

    act(() => {
      result.current.startEditingComment(result.current.comments[0]);
    });
    act(() => {
      result.current.setCommentText(' updated answer ');
    });

    await act(async () => {
      await result.current.submitComment();
    });

    expect(mockCommentService.update).toHaveBeenCalledWith('wb-1', 'q-1', 'c-1', {
      body: 'updated answer',
    });
    expect(result.current.comments[0].body).toBe('updated answer');
    expect(result.current.editingCommentId).toBeNull();
  });

  it('ignores empty comment submissions and blocks editing once the question closes', async () => {
    mockCommentService.list.mockResolvedValue([makeComment()]);
    const subscriptions = new Map<string, (frame: { body: string }) => void>();
    mockSubscribe.mockImplementation((destination, callback) => {
      subscriptions.set(destination, callback);
      return { unsubscribe: jest.fn() };
    });

    const { result } = renderHook(() =>
      useQuestionDetailModel({
        questionId: 'q-1',
        whiteboardId: 'wb-1',
      })
    );

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });

    act(() => {
      result.current.setCommentText('   ');
    });

    await act(async () => {
      await result.current.submitComment();
    });

    expect(mockCommentService.create).not.toHaveBeenCalled();

    act(() => {
      result.current.startEditingComment(result.current.comments[0]);
    });

    expect(result.current.editingCommentId).toBe('c-1');

    act(() => {
      subscriptions.get('/topic/whiteboard/wb-1/questions')?.({
        body: JSON.stringify({
          type: 'QUESTION_UPDATED',
          payload: makeQuestion({
            status: 'CLOSED',
          }),
        }),
      });
    });

    expect(result.current.isClosed).toBe(true);
    expect(result.current.editingCommentId).toBeNull();
    act(() => {
      result.current.startEditingComment(result.current.comments[0]);
    });
    expect(result.current.editingCommentId).toBeNull();
  });

  it('removes deleted comments and resets edit state when deleting the active comment', async () => {
    mockCommentService.list.mockResolvedValue([
      makeComment({ id: 'c-1' }),
      makeComment({ id: 'c-2', createdAt: '2026-03-25T10:05:00.000Z' }),
    ]);

    const { result } = renderHook(() =>
      useQuestionDetailModel({
        questionId: 'q-1',
        whiteboardId: 'wb-1',
      })
    );

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(2);
    });

    act(() => {
      result.current.startEditingComment(result.current.comments[0]);
    });

    await act(async () => {
      await result.current.deleteComment('c-1');
    });

    expect(mockCommentService.delete).toHaveBeenCalledWith('wb-1', 'q-1', 'c-1');
    expect(result.current.comments.map((comment) => comment.id)).toEqual(['c-2']);
    expect(result.current.commentText).toBe('');
    expect(result.current.editingCommentId).toBeNull();
  });

  it('toggles question and comment votes while keeping karma scores in sync', async () => {
    mockQuestionService.getById.mockResolvedValue(
      makeQuestion({
        userVote: 'DOWNVOTE',
        karmaScore: 3,
      })
    );
    mockCommentService.list.mockResolvedValue([
      makeComment({
        id: 'c-1',
        userVote: 'UPVOTE',
        karmaScore: 2,
      }),
    ]);

    const { result } = renderHook(() =>
      useQuestionDetailModel({
        questionId: 'q-1',
        whiteboardId: 'wb-1',
      })
    );

    await waitFor(() => {
      expect(result.current.question?.id).toBe('q-1');
    });

    await act(async () => {
      await result.current.voteOnQuestion('UPVOTE');
    });

    expect(mockQuestionService.vote).toHaveBeenCalledWith('q-1', 'UPVOTE');
    expect(result.current.question?.userVote).toBe('UPVOTE');
    expect(result.current.question?.karmaScore).toBe(5);

    await act(async () => {
      await result.current.voteOnComment('c-1', 'UPVOTE');
    });

    expect(mockCommentService.removeVote).toHaveBeenCalledWith('c-1');
    expect(result.current.comments[0].userVote).toBeNull();
    expect(result.current.comments[0].karmaScore).toBe(1);
  });

  it('verifies answers, toggles bookmarks, and manages the report modal state', async () => {
    mockCommentService.list.mockResolvedValue([makeComment()]);
    mockCommentService.verify.mockResolvedValue(
      makeComment({
        id: 'c-1',
        isVerifiedAnswer: true,
        verifiedById: 'u-1',
        verifiedByName: 'Faculty Ghost',
      })
    );

    const { result } = renderHook(() =>
      useQuestionDetailModel({
        questionId: 'q-1',
        whiteboardId: 'wb-1',
      })
    );

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });

    await act(async () => {
      await result.current.verifyAnswer('c-1');
    });

    expect(result.current.question?.status).toBe('CLOSED');
    expect(result.current.question?.verifiedAnswerId).toBe('c-1');
    expect(result.current.comments[0].isVerifiedAnswer).toBe(true);

    await act(async () => {
      await result.current.toggleBookmark();
    });
    await act(async () => {
      await result.current.toggleBookmark();
    });

    expect(mockBookmarkService.add).toHaveBeenCalledWith('q-1');
    expect(mockBookmarkService.remove).toHaveBeenCalledWith('q-1');

    act(() => {
      result.current.openReportModal({ commentId: 'c-1' });
    });
    expect(result.current.reportModalVisible).toBe(true);
    expect(result.current.reportTarget).toEqual({ commentId: 'c-1' });

    act(() => {
      result.current.closeReportModal();
    });
    expect(result.current.reportModalVisible).toBe(false);
    expect(result.current.reportTarget).toBeNull();
  });

  it('deletes the current question, refreshes closed questions, and toggles pin state', async () => {
    mockQuestionService.getById.mockResolvedValue(
      makeQuestion({
        isPinned: true,
      })
    );
    const onQuestionDeleted = jest.fn();

    const { result } = renderHook(() =>
      useQuestionDetailModel({
        questionId: 'q-1',
        whiteboardId: 'wb-1',
        onQuestionDeleted,
      })
    );

    await waitFor(() => {
      expect(result.current.question?.id).toBe('q-1');
    });

    await act(async () => {
      await result.current.deleteQuestion();
      await result.current.closeQuestion();
      await result.current.togglePinnedState();
      await result.current.refresh();
    });

    expect(mockQuestionService.delete).toHaveBeenCalledWith('wb-1', 'q-1');
    expect(mockQuestionService.close).toHaveBeenCalledWith('wb-1', 'q-1');
    expect(mockQuestionService.unpin).toHaveBeenCalledWith('wb-1', 'q-1');
    expect(mockQuestionService.getById).toHaveBeenCalledTimes(4);
    expect(onQuestionDeleted).toHaveBeenCalledTimes(1);
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
