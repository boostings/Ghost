import { renderHook, waitFor } from '@testing-library/react-native';
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
});
