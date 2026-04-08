jest.mock('./api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from './api';
import { topicService } from './topicService';

const apiMock = api as jest.Mocked<typeof api>;

describe('topicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists topic content using the fixed faculty page size', async () => {
    apiMock.get.mockResolvedValue({
      data: {
        content: [
          {
            id: 'topic-1',
            name: 'Homework',
          },
        ],
      },
    });

    const topics = await topicService.list('wb-1');

    expect(topics).toEqual([
      {
        id: 'topic-1',
        name: 'Homework',
      },
    ]);
    expect(apiMock.get).toHaveBeenCalledWith('/whiteboards/wb-1/topics', {
      params: {
        page: 0,
        size: 100,
      },
    });
  });

  it('creates and removes topics for a whiteboard', async () => {
    apiMock.post.mockResolvedValue({
      data: {
        id: 'topic-1',
        name: 'Exam',
      },
    });
    apiMock.delete.mockResolvedValue({ data: undefined });

    const created = await topicService.create('wb-1', 'Exam');
    await topicService.remove('wb-1', 'topic-1');

    expect(created).toEqual({
      id: 'topic-1',
      name: 'Exam',
    });
    expect(apiMock.post).toHaveBeenCalledWith('/whiteboards/wb-1/topics', {
      name: 'Exam',
    });
    expect(apiMock.delete).toHaveBeenCalledWith('/whiteboards/wb-1/topics/topic-1');
  });
});
