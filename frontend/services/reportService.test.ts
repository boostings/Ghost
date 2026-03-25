jest.mock('./api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
  },
}));

import api from './api';
import { reportService } from './reportService';

const apiMock = api as jest.Mocked<typeof api>;

describe('reportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('AC5 requests paginated moderation reports for a whiteboard', async () => {
    const response = {
      data: {
        content: [],
        page: 1,
        size: 10,
        totalElements: 0,
        totalPages: 0,
      },
    };
    apiMock.get.mockResolvedValue(response);

    const result = await reportService.list('wb-1', 1, 10);

    expect(result).toEqual(response.data);
    expect(apiMock.get).toHaveBeenCalledWith('/reports/whiteboard/wb-1', {
      params: { page: 1, size: 10 },
    });
  });

  it('AC5 submits and reviews reports through the reports endpoints', async () => {
    apiMock.post.mockResolvedValue({
      data: {
        id: 'r-1',
        reporterId: 'u-1',
        reporterName: 'Taylor Student',
        questionId: 'q-1',
        commentId: null,
        threadQuestionId: 'q-1',
        contentTitle: 'Question title',
        contentPreview: 'Question preview',
        contentHidden: false,
        reason: 'SPAM',
        notes: null,
        status: 'PENDING',
        createdAt: '2026-03-25T12:00:00.000Z',
      },
    });
    apiMock.put.mockResolvedValue({
      data: {
        id: 'r-1',
        reporterId: 'u-1',
        reporterName: 'Taylor Student',
        questionId: 'q-1',
        commentId: null,
        threadQuestionId: 'q-1',
        contentTitle: 'Question title',
        contentPreview: 'Question preview',
        contentHidden: true,
        reason: 'SPAM',
        notes: null,
        status: 'REVIEWED',
        createdAt: '2026-03-25T12:00:00.000Z',
      },
    });

    const created = await reportService.create({ questionId: 'q-1', reason: 'SPAM' });
    const reviewed = await reportService.review('r-1', { status: 'REVIEWED' });

    expect(created.status).toBe('PENDING');
    expect(reviewed.status).toBe('REVIEWED');
    expect(apiMock.post).toHaveBeenCalledWith('/reports', {
      questionId: 'q-1',
      reason: 'SPAM',
    });
    expect(apiMock.put).toHaveBeenCalledWith('/reports/r-1', { status: 'REVIEWED' });
  });
});
