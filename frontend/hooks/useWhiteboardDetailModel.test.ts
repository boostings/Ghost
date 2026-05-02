import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PageResponse, QuestionResponse, WhiteboardResponse } from '../types';

const mockSetCurrentWhiteboard = jest.fn();
const mockSubscribe = jest.fn(() => ({ unsubscribe: jest.fn() }));

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
  useAuthStore: Object.assign(
    (selector: (state: { user: { id: string; role: 'FACULTY' } }) => unknown) =>
      selector({
        user: {
          id: 'u-1',
          role: 'FACULTY',
        },
      }),
    {
      getState: () => ({
        user: {
          id: 'u-1',
          role: 'FACULTY',
        },
      }),
    }
  ),
}));

jest.mock('../stores/whiteboardStore', () => ({
  useWhiteboardStore: (selector: (state: { setCurrentWhiteboard: typeof mockSetCurrentWhiteboard }) => unknown) =>
    selector({
      setCurrentWhiteboard: mockSetCurrentWhiteboard,
    }),
}));

jest.mock('../services/whiteboardService', () => ({
  __esModule: true,
  whiteboardService: {
    getWhiteboard: jest.fn(),
  },
}));

jest.mock('../services/questionService', () => ({
  __esModule: true,
  questionService: {
    getQuestions: jest.fn(),
    searchQuestions: jest.fn(),
  },
}));

jest.mock('../services/bookmarkService', () => ({
  __esModule: true,
  bookmarkService: {
    add: jest.fn(),
    remove: jest.fn(),
  },
}));

import { questionService } from '../services/questionService';
import { whiteboardService } from '../services/whiteboardService';
import { notifyQuestionDeleted } from '../utils/questionDeletionEvents';
import { notifyQuestionChanged } from '../utils/questionEvents';
import { useWhiteboardDetailModel } from './useWhiteboardDetailModel';

const mockQuestionService = questionService as jest.Mocked<typeof questionService>;
const mockWhiteboardService = whiteboardService as jest.Mocked<typeof whiteboardService>;

function makeWhiteboard(): WhiteboardResponse {
  return {
    id: 'wb-1',
    courseCode: 'ACC131',
    courseName: 'Financial Accounting',
    section: '1',
    semester: 'Fall 2026',
    ownerId: 'u-1',
    ownerName: 'Jimmy Schade',
    inviteCode: 'GAXHBFJ9',
    isDemo: false,
    memberCount: 1,
    createdAt: '2026-04-27T16:42:23.246701',
  };
}

function makeEmptyQuestionPage(): PageResponse<QuestionResponse> {
  return {
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  };
}

function makeQuestion(overrides: Partial<QuestionResponse> = {}): QuestionResponse {
  return {
    id: 'q-1',
    whiteboardId: 'wb-1',
    whiteboardCourseCode: 'IT326',
    whiteboardCourseName: 'Principles Of Software Engineering',
    title: 'When is Project 2 due?',
    body: 'Looking at the syllabus and I see Project 2 listed.',
    status: 'CLOSED',
    topicId: 'topic-homework',
    topicName: 'Homework',
    authorId: 'student-1',
    authorName: 'Test User',
    karmaScore: 0,
    userVote: null,
    commentCount: 1,
    verifiedAnswerId: 'comment-1',
    verifiedAnswerPreview: 'Project 2 is due Friday.',
    verifiedAnswerAuthorName: 'Jimmy Schade',
    isPinned: false,
    isHidden: false,
    isBookmarked: false,
    createdAt: '2026-04-27T16:42:23.246701',
    updatedAt: '2026-04-27T16:42:23.246701',
    editedAt: null,
    ...overrides,
  };
}

describe('useWhiteboardDetailModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhiteboardService.getWhiteboard.mockResolvedValue(makeWhiteboard());
    mockQuestionService.getQuestions.mockResolvedValue(makeEmptyQuestionPage());
  });

  it('treats an empty new whiteboard as loaded instead of refetching forever', async () => {
    const { result } = renderHook(() => useWhiteboardDetailModel('wb-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(mockWhiteboardService.getWhiteboard).toHaveBeenCalledTimes(1));

    expect(mockQuestionService.getQuestions).toHaveBeenCalledTimes(1);
    expect(result.current.questions).toEqual([]);
    expect(result.current.sections).toEqual([]);
    expect(result.current.loadError).toBeNull();
  });

  it('keeps answered search results out of the open counter', async () => {
    mockQuestionService.searchQuestions.mockResolvedValue({
      content: [makeQuestion()],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });

    const { result } = renderHook(() => useWhiteboardDetailModel('wb-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSearchQuery('project');
    });

    await waitFor(() => expect(mockQuestionService.searchQuestions).toHaveBeenCalled());

    await waitFor(() =>
      expect(result.current.stats).toEqual({
        pinned: 0,
        open: 0,
        answered: 1,
        total: 1,
      })
    );
  });

  it('keeps closed questions without verified answers out of the open section', async () => {
    mockQuestionService.getQuestions.mockResolvedValue({
      content: [
        makeQuestion({
          id: 'q-open',
          title: 'Open question',
          status: 'OPEN',
          verifiedAnswerId: null,
          verifiedAnswerPreview: null,
          verifiedAnswerAuthorName: null,
        }),
        makeQuestion({
          id: 'q-closed',
          title: 'Closed question',
          status: 'CLOSED',
          verifiedAnswerId: null,
          verifiedAnswerPreview: null,
          verifiedAnswerAuthorName: null,
        }),
      ],
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
    });

    const { result } = renderHook(() => useWhiteboardDetailModel('wb-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const openSection = result.current.sections.find((section) => section.key === 'open');
    const closedSection = result.current.sections.find((section) => section.key === 'closed');

    expect(result.current.stats).toEqual({
      pinned: 0,
      open: 1,
      answered: 0,
      total: 2,
    });
    expect(openSection?.data.map((question) => question.id)).toEqual(['q-open']);
    expect(closedSection?.data.map((question) => question.id)).toEqual(['q-closed']);
  });

  it('removes locally deleted questions from the mounted whiteboard feed', async () => {
    mockQuestionService.getQuestions.mockResolvedValue({
      content: [makeQuestion({ id: 'q-1' }), makeQuestion({ id: 'q-2' })],
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
    });

    const { result } = renderHook(() => useWhiteboardDetailModel('wb-1'));

    await waitFor(() =>
      expect(result.current.questions.map((question) => question.id)).toEqual(['q-1', 'q-2'])
    );

    act(() => {
      notifyQuestionDeleted({ whiteboardId: 'wb-1', questionId: 'q-1' });
    });

    expect(result.current.questions.map((question) => question.id)).toEqual(['q-2']);

    act(() => {
      notifyQuestionDeleted({ whiteboardId: 'other-whiteboard', questionId: 'q-2' });
    });

    expect(result.current.questions.map((question) => question.id)).toEqual(['q-2']);
  });

  it('keeps locally deleted questions out of later stale feed responses', async () => {
    mockQuestionService.getQuestions
      .mockResolvedValueOnce({
        content: [makeQuestion({ id: 'q-1' }), makeQuestion({ id: 'q-2' })],
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        content: [makeQuestion({ id: 'q-1' }), makeQuestion({ id: 'q-2' })],
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
      });

    const { result } = renderHook(() => useWhiteboardDetailModel('wb-1'));

    await waitFor(() =>
      expect(result.current.questions.map((question) => question.id)).toEqual(['q-1', 'q-2'])
    );

    act(() => {
      notifyQuestionDeleted({ whiteboardId: 'wb-1', questionId: 'q-1' });
    });

    await act(async () => {
      await result.current.handleRefresh();
    });

    expect(result.current.questions.map((question) => question.id)).toEqual(['q-2']);
  });

  it('adds locally created questions to the mounted whiteboard feed immediately', async () => {
    mockQuestionService.getQuestions.mockResolvedValue({
      content: [makeQuestion({ id: 'q-1', createdAt: '2026-01-01T00:00:00.000Z' })],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });

    const { result } = renderHook(() => useWhiteboardDetailModel('wb-1'));

    await waitFor(() =>
      expect(result.current.questions.map((question) => question.id)).toEqual(['q-1'])
    );

    act(() => {
      notifyQuestionChanged({
        whiteboardId: 'wb-1',
        question: makeQuestion({ id: 'q-new', createdAt: '2026-01-02T00:00:00.000Z' }),
      });
    });

    expect(result.current.questions.map((question) => question.id)).toEqual(['q-new', 'q-1']);

    act(() => {
      notifyQuestionChanged({
        whiteboardId: 'other-whiteboard',
        question: makeQuestion({ id: 'q-other', whiteboardId: 'other-whiteboard' }),
      });
    });

    expect(result.current.questions.map((question) => question.id)).toEqual(['q-new', 'q-1']);
  });
});
