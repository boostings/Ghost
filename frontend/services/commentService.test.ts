import { Config } from '../constants/config';

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
import { commentService } from './commentService';

const apiMock = api as jest.Mocked<typeof api>;

describe('commentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes paginated comment responses', async () => {
    const response = {
      data: {
        content: [
          {
            id: 'c-1',
            questionId: 'q-1',
            authorId: 'u-1',
            authorName: 'Taylor Student',
            body: 'Answer body',
            isVerifiedAnswer: false,
            verifiedById: null,
            verifiedByName: null,
            karmaScore: 2,
            userVote: null,
            canEdit: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        page: 0,
        size: Config.PAGE_SIZE,
        totalElements: 1,
        totalPages: 1,
      },
    };
    apiMock.get.mockResolvedValue(response);

    const comments = await commentService.getComments('wb-1', 'q-1');

    expect(comments).toEqual(response.data.content);
    expect(apiMock.get).toHaveBeenCalledWith('/whiteboards/wb-1/questions/q-1/comments', {
      params: {
        page: 0,
        size: Config.PAGE_SIZE,
      },
    });
  });

  it('supports array responses from legacy comment endpoints', async () => {
    const response = {
      data: [
        {
          id: 'c-2',
          questionId: 'q-1',
          authorId: 'u-2',
          authorName: 'Faculty Verifier',
          body: 'Legacy response',
          isVerifiedAnswer: true,
          verifiedById: 'u-2',
          verifiedByName: 'Faculty Verifier',
          karmaScore: 5,
          userVote: 'UPVOTE',
          canEdit: false,
          createdAt: '2026-01-02T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    };
    apiMock.get.mockResolvedValue(response);

    const comments = await commentService.getComments('wb-1', 'q-1', { page: 2, size: 5 });

    expect(comments).toEqual(response.data);
    expect(apiMock.get).toHaveBeenCalledWith('/whiteboards/wb-1/questions/q-1/comments', {
      params: {
        page: 2,
        size: 5,
      },
    });
  });

  it('returns the updated comment when verifying an answer', async () => {
    const response = {
      data: {
        id: 'c-3',
        questionId: 'q-1',
        authorId: 'u-2',
        authorName: 'Faculty Verifier',
        body: 'Verified answer',
        isVerifiedAnswer: true,
        verifiedById: 'u-9',
        verifiedByName: 'Professor Ghost',
        karmaScore: 10,
        userVote: null,
        canEdit: false,
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
    };
    apiMock.post.mockResolvedValue(response);

    const comment = await commentService.markVerifiedAnswer('wb-1', 'q-1', 'c-3');

    expect(comment).toEqual(response.data);
    expect(apiMock.post).toHaveBeenCalledWith(
      '/whiteboards/wb-1/questions/q-1/comments/c-3/verify'
    );
  });

  it('posts votes and removes them with the karma endpoints', async () => {
    apiMock.post.mockResolvedValue({ data: undefined });
    apiMock.delete.mockResolvedValue({ data: undefined });

    await commentService.voteOnComment('c-9', 'DOWNVOTE');
    await commentService.removeCommentVote('c-9');

    expect(apiMock.post).toHaveBeenCalledWith('/karma/comments/c-9/vote', {
      voteType: 'DOWNVOTE',
    });
    expect(apiMock.delete).toHaveBeenCalledWith('/karma/comments/c-9/vote');
  });
});
