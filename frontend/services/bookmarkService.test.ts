jest.mock('./api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from './api';
import { bookmarkService } from './bookmarkService';

const apiMock = api as jest.Mocked<typeof api>;

describe('bookmarkService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated bookmark payloads unchanged when the api already includes metadata', async () => {
    const pagePayload = {
      content: [
        {
          id: 'bookmark-2',
          questionId: 'q-2',
          whiteboardId: 'wb-2',
          title: 'Another question',
          body: 'Another body',
          authorName: 'Jordan Student',
          createdAt: '2026-03-26T12:00:00.000Z',
        },
      ],
      page: 1,
      size: 10,
      totalElements: 14,
      totalPages: 2,
    };
    apiMock.get.mockResolvedValue({ data: pagePayload });

    const result = await bookmarkService.list(1, 10);

    expect(result).toEqual(pagePayload);
  });

  it('normalizes array bookmark payloads into page metadata', async () => {
    apiMock.get.mockResolvedValue({
      data: [
        {
          id: 'bookmark-1',
          questionId: 'q-1',
          whiteboardId: 'wb-1',
          title: 'Question title',
          body: 'Question body',
          authorName: 'Taylor Student',
          createdAt: '2026-03-25T12:00:00.000Z',
        },
      ],
    });

    const result = await bookmarkService.list(2, 5);

    expect(result).toEqual({
      content: [
        {
          id: 'bookmark-1',
          questionId: 'q-1',
          whiteboardId: 'wb-1',
          title: 'Question title',
          body: 'Question body',
          authorName: 'Taylor Student',
          createdAt: '2026-03-25T12:00:00.000Z',
        },
      ],
      page: 2,
      size: 5,
      totalElements: 1,
      totalPages: 1,
    });
    expect(apiMock.get).toHaveBeenCalledWith('/bookmarks', {
      params: { page: 2, size: 5 },
    });
  });

  it('adds and removes bookmarks through the question bookmark endpoints', async () => {
    apiMock.post.mockResolvedValue({ data: undefined });
    apiMock.delete.mockResolvedValue({ data: undefined });

    await bookmarkService.add('q-1');
    await bookmarkService.remove('q-1');

    expect(apiMock.post).toHaveBeenCalledWith('/bookmarks/questions/q-1');
    expect(apiMock.delete).toHaveBeenCalledWith('/bookmarks/questions/q-1');
  });
});
