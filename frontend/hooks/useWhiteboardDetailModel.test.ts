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
  useAuthStore: (selector: (state: { user: { id: string; role: 'FACULTY' } }) => unknown) =>
    selector({
      user: {
        id: 'u-1',
        role: 'FACULTY',
      },
    }),
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
    getById: jest.fn(),
  },
}));

jest.mock('../services/questionService', () => ({
  __esModule: true,
  questionService: {
    list: jest.fn(),
    search: jest.fn(),
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
    ...overrides,
  };
}

describe('useWhiteboardDetailModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhiteboardService.getById.mockResolvedValue(makeWhiteboard());
    mockQuestionService.list.mockResolvedValue(makeEmptyQuestionPage());
  });

  it('treats an empty new whiteboard as loaded instead of refetching forever', async () => {
    const { result } = renderHook(() => useWhiteboardDetailModel('wb-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(mockWhiteboardService.getById).toHaveBeenCalledTimes(1));

    expect(mockQuestionService.list).toHaveBeenCalledTimes(1);
    expect(result.current.questions).toEqual([]);
    expect(result.current.sections).toEqual([]);
    expect(result.current.loadError).toBeNull();
  });

  it('keeps answered search results out of the open counter', async () => {
    mockQuestionService.search.mockResolvedValue({
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

    await waitFor(() => expect(mockQuestionService.search).toHaveBeenCalled());

    expect(result.current.stats).toEqual({
      pinned: 0,
      open: 0,
      answered: 1,
      total: 1,
    });
  });
});
