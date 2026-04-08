jest.mock('./api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from './api';
import { questionService } from './questionService';

const apiMock = api as jest.Mocked<typeof api>;

describe('questionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests whiteboard questions with only supported filter params', async () => {
    const response = {
      data: {
        content: [],
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
      },
    };
    apiMock.get.mockResolvedValue(response);

    const result = await questionService.getQuestions('wb-1', {
      page: 0,
      size: 20,
      topicId: 'topic-1',
      status: 'OPEN',
    });

    expect(result).toEqual(response.data);
    expect(apiMock.get).toHaveBeenCalledWith('/whiteboards/wb-1/questions', {
      params: {
        page: 0,
        size: 20,
        topic: 'topic-1',
        status: 'OPEN',
      },
    });
  });

  it('loads a question by global id when whiteboard context is unavailable', async () => {
    const response = {
      data: {
        id: 'q-1',
        whiteboardId: 'wb-1',
      },
    };
    apiMock.get.mockResolvedValue(response);

    const result = await questionService.getQuestionById('q-1');

    expect(result).toEqual(response.data);
    expect(apiMock.get).toHaveBeenCalledWith('/questions/q-1');
  });

  it('searches questions through the global search endpoint', async () => {
    const response = {
      data: {
        content: [],
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
      },
    };
    apiMock.get.mockResolvedValue(response);

    const result = await questionService.searchQuestions({
      q: 'polymorphism',
      whiteboard: 'wb-1',
      status: 'OPEN',
    });

    expect(result).toEqual(response.data);
    expect(apiMock.get).toHaveBeenCalledWith('/search/questions', {
      params: {
        q: 'polymorphism',
        whiteboard: 'wb-1',
        topic: undefined,
        status: 'OPEN',
        from: undefined,
        to: undefined,
        page: 0,
        size: 20,
      },
    });
  });

  it('creates and closes questions using whiteboard-scoped endpoints', async () => {
    apiMock.post
      .mockResolvedValueOnce({
        data: {
          id: 'q-2',
          whiteboardId: 'wb-1',
        },
      })
      .mockResolvedValueOnce({ data: undefined });

    const created = await questionService.createQuestion('wb-1', {
      title: 'Question title',
      body: 'Question body',
    });
    await questionService.closeQuestion('wb-1', 'q-2');

    expect(created).toEqual({
      id: 'q-2',
      whiteboardId: 'wb-1',
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/whiteboards/wb-1/questions', {
      title: 'Question title',
      body: 'Question body',
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(2, '/whiteboards/wb-1/questions/q-2/close');
  });

  it('edits, forwards, and deletes questions through their scoped endpoints', async () => {
    apiMock.put.mockResolvedValue({
      data: {
        id: 'q-1',
        title: 'Updated title',
        body: 'Updated body',
      },
    });
    apiMock.post.mockResolvedValue({ data: undefined });
    apiMock.delete.mockResolvedValue({ data: undefined });

    const updated = await questionService.editQuestion('wb-1', 'q-1', {
      title: 'Updated title',
      body: 'Updated body',
    });
    await questionService.forwardQuestion('wb-1', 'q-1', {
      facultyEmail: 'faculty@ilstu.edu',
      reason: 'Please take this one',
    });
    await questionService.deleteQuestion('wb-1', 'q-1');

    expect(updated).toEqual({
      id: 'q-1',
      title: 'Updated title',
      body: 'Updated body',
    });
    expect(apiMock.put).toHaveBeenCalledWith('/whiteboards/wb-1/questions/q-1', {
      title: 'Updated title',
      body: 'Updated body',
    });
    expect(apiMock.post).toHaveBeenCalledWith('/whiteboards/wb-1/questions/q-1/forward', {
      facultyEmail: 'faculty@ilstu.edu',
      reason: 'Please take this one',
    });
    expect(apiMock.delete).toHaveBeenCalledWith('/whiteboards/wb-1/questions/q-1');
  });

  it('supports pinning and vote aliases used by screen models', async () => {
    apiMock.post.mockResolvedValue({ data: undefined });
    apiMock.delete.mockResolvedValue({ data: undefined });

    await questionService.pin('wb-1', 'q-1');
    await questionService.unpin('wb-1', 'q-1');
    await questionService.vote('q-1', 'UPVOTE');
    await questionService.removeVote('q-1');

    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/whiteboards/wb-1/questions/q-1/pin');
    expect(apiMock.delete).toHaveBeenNthCalledWith(1, '/whiteboards/wb-1/questions/q-1/pin');
    expect(apiMock.post).toHaveBeenNthCalledWith(2, '/karma/questions/q-1/vote', {
      voteType: 'UPVOTE',
    });
    expect(apiMock.delete).toHaveBeenNthCalledWith(2, '/karma/questions/q-1/vote');
  });
});
