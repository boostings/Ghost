type WhiteboardServiceModule = typeof import('./whiteboardService');

async function loadWhiteboardService(accessToken = 'token-1'): Promise<{
  module: WhiteboardServiceModule;
  apiMock: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
  };
  authState: {
    accessToken: string | null;
  };
}> {
  jest.resetModules();

  const apiMock = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
  const authState = { accessToken };

  jest.doMock('./api', () => ({
    __esModule: true,
    default: apiMock,
  }));

  jest.doMock('../stores/authStore', () => ({
    useAuthStore: {
      getState: () => authState,
    },
  }));

  const module = require('./whiteboardService') as WhiteboardServiceModule;
  return { module, apiMock, authState };
}

describe('whiteboardService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('normalizes array whiteboard responses into page metadata', async () => {
    const { module, apiMock } = await loadWhiteboardService();
    const whiteboards = [
      {
        id: 'wb-1',
        courseCode: 'IT326',
        courseName: 'Software Engineering',
        section: null,
        semester: 'Fall 2026',
        ownerId: 'u-1',
        ownerName: 'Professor Ghost',
        inviteCode: 'JOINME',
        isDemo: false,
        memberCount: 33,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    apiMock.get.mockResolvedValue({ data: whiteboards });

    const result = await module.whiteboardService.getWhiteboards({ page: 2, size: 5 });

    expect(result).toEqual({
      content: whiteboards,
      page: 2,
      size: 5,
      totalElements: 1,
      totalPages: 1,
    });
    expect(apiMock.get).toHaveBeenCalledWith('/whiteboards', {
      params: {
        page: 2,
        size: 5,
      },
    });
  });

  it('returns whiteboard member responses from the roster endpoint', async () => {
    const { module, apiMock } = await loadWhiteboardService();
    apiMock.get.mockResolvedValue({
      data: {
        content: [
          {
            id: 'membership-1',
            userId: 'u-1',
            email: 'faculty@ilstu.edu',
            firstName: 'Professor',
            lastName: 'Ghost',
            role: 'FACULTY',
            joinedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      },
    });

    const members = await module.whiteboardService.getMembers('wb-1');

    expect(members).toEqual([
      {
        id: 'membership-1',
        userId: 'u-1',
        firstName: 'Professor',
        lastName: 'Ghost',
        email: 'faculty@ilstu.edu',
        role: 'FACULTY',
        joinedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('falls back invite url and qr data when only one value is returned', async () => {
    const { module, apiMock } = await loadWhiteboardService();
    apiMock.get.mockResolvedValue({
      data: {
        inviteCode: 'JOINME',
        qrData: 'ghost://join/JOINME',
      },
    });

    const inviteInfo = await module.whiteboardService.getInviteInfo('wb-1');

    expect(inviteInfo).toEqual({
      inviteCode: 'JOINME',
      inviteUrl: 'ghost://join/JOINME',
      qrData: 'ghost://join/JOINME',
    });
    expect(apiMock.get).toHaveBeenCalledWith('/whiteboards/wb-1/invite-info');
  });

  it('caches membership checks until a membership-changing action occurs', async () => {
    const { module, apiMock } = await loadWhiteboardService();
    apiMock.get
      .mockResolvedValueOnce({
        data: {
          content: [],
          page: 0,
          size: 1,
          totalElements: 0,
          totalPages: 0,
        },
      })
      .mockResolvedValueOnce({
        data: {
          content: [
            {
              id: 'wb-1',
              courseCode: 'IT326',
              courseName: 'Software Engineering',
              section: null,
              semester: 'Fall 2026',
              ownerId: 'u-1',
              ownerName: 'Professor Ghost',
              inviteCode: 'JOINME',
              isDemo: false,
              memberCount: 33,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          page: 0,
          size: 1,
          totalElements: 1,
          totalPages: 1,
        },
      });
    apiMock.post.mockResolvedValue({ data: undefined });

    await expect(module.whiteboardService.hasAnyWhiteboard()).resolves.toBe(false);
    await expect(module.whiteboardService.hasAnyWhiteboard()).resolves.toBe(false);
    expect(apiMock.get).toHaveBeenCalledTimes(1);

    await module.whiteboardService.joinByInviteCode('  JOINME  ');
    await expect(module.whiteboardService.hasAnyWhiteboard()).resolves.toBe(true);

    expect(apiMock.post).toHaveBeenCalledWith('/whiteboards/join-by-invite', {
      inviteCode: 'JOINME',
    });
    expect(apiMock.get).toHaveBeenCalledTimes(2);
  });

  it('deduplicates in-flight invite joins for the same code', async () => {
    const { module, apiMock } = await loadWhiteboardService();
    let resolveJoin!: () => void;
    apiMock.post.mockReturnValue(
      new Promise((resolve) => {
        resolveJoin = () => resolve({ data: undefined });
      })
    );

    const firstJoin = module.whiteboardService.joinByInviteCode(' joinme ');
    const secondJoin = module.whiteboardService.joinByInviteCode('JOINME');

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(apiMock.post).toHaveBeenCalledWith('/whiteboards/join-by-invite', {
      inviteCode: 'joinme',
    });

    resolveJoin();
    await expect(Promise.all([firstJoin, secondJoin])).resolves.toEqual([undefined, undefined]);
  });

  it('deduplicates in-flight membership checks for the same token', async () => {
    const { module, apiMock } = await loadWhiteboardService();
    let resolveRequest!: (value: {
      data: {
        content: unknown[];
        page: number;
        size: number;
        totalElements: number;
        totalPages: number;
      };
    }) => void;
    apiMock.get.mockReturnValue(
      new Promise<{
        data: {
          content: unknown[];
          page: number;
          size: number;
          totalElements: number;
          totalPages: number;
        };
      }>((resolve) => {
        resolveRequest = resolve;
      })
    );

    const first = module.whiteboardService.hasAnyWhiteboard();
    const second = module.whiteboardService.hasAnyWhiteboard();
    resolveRequest({
      data: {
        content: [{}],
        page: 0,
        size: 1,
        totalElements: 1,
        totalPages: 1,
      },
    });

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(apiMock.get).toHaveBeenCalledTimes(1);
  });

  it('resets membership cache after create, delete, join, and leave flows', async () => {
    const { module, apiMock } = await loadWhiteboardService();
    apiMock.get
      .mockResolvedValueOnce({
        data: {
          content: [],
          page: 0,
          size: 1,
          totalElements: 0,
          totalPages: 0,
        },
      })
      .mockResolvedValueOnce({
        data: {
          content: [
            {
              id: 'wb-1',
              courseCode: 'IT326',
              courseName: 'Software Engineering',
              section: null,
              semester: 'Fall 2026',
              ownerId: 'u-1',
              ownerName: 'Professor Ghost',
              inviteCode: 'JOINME',
              isDemo: false,
              memberCount: 33,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          page: 0,
          size: 1,
          totalElements: 1,
          totalPages: 1,
        },
      })
      .mockResolvedValueOnce({
        data: {
          content: [],
          page: 0,
          size: 1,
          totalElements: 0,
          totalPages: 0,
        },
      });
    apiMock.post.mockResolvedValue({ data: undefined });
    apiMock.delete.mockResolvedValue({ data: undefined });

    await expect(module.whiteboardService.hasAnyWhiteboard()).resolves.toBe(false);
    await module.whiteboardService.createWhiteboard({
      courseCode: 'IT326',
      courseName: 'Systems Analysis',
      semester: 'Spring 2026',
    });
    await expect(module.whiteboardService.hasAnyWhiteboard()).resolves.toBe(true);
    await module.whiteboardService.leaveWhiteboard('wb-1');
    await expect(module.whiteboardService.hasAnyWhiteboard()).resolves.toBe(false);
    await module.whiteboardService.deleteWhiteboard('wb-1');

    expect(apiMock.post).toHaveBeenCalledWith('/whiteboards', {
      courseCode: 'IT326',
      courseName: 'Systems Analysis',
      semester: 'Spring 2026',
    });
    expect(apiMock.post).toHaveBeenCalledWith('/whiteboards/wb-1/leave');
    expect(apiMock.delete).toHaveBeenCalledWith('/whiteboards/wb-1');
    expect(apiMock.get).toHaveBeenCalledTimes(3);
  });

  it('routes join requests, member review, ownership transfer, and discovery through the expected endpoints', async () => {
    const { module, apiMock } = await loadWhiteboardService();
    apiMock.get.mockResolvedValue({
      data: {
        content: [
          {
            id: 'wb-1',
            courseCode: 'IT326',
            courseName: 'Software Engineering',
            section: null,
            semester: 'Fall 2026',
            ownerId: 'u-1',
            ownerName: 'Professor Ghost',
            inviteCode: 'JOINME',
            isDemo: false,
            memberCount: 33,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        page: 1,
        size: 2,
        totalElements: 1,
        totalPages: 1,
      },
    });
    apiMock.post.mockResolvedValue({ data: undefined });
    apiMock.put.mockResolvedValue({ data: undefined });

    const discoverable = await module.whiteboardService.getDiscoverableWhiteboards({
      page: 1,
      size: 2,
    });
    await module.whiteboardService.joinByInviteCode(' JOINME ', 'wb-1');
    await module.whiteboardService.requestToJoin('wb-2');
    await module.whiteboardService.handleJoinRequest('wb-1', 'req-1', { status: 'APPROVED' });
    await module.whiteboardService.transferOwnership('wb-1', 'faculty@ilstu.edu');
    await module.whiteboardService.inviteFaculty('wb-1', 'primary@ilstu.edu');

    expect(discoverable.totalElements).toBe(1);
    expect(apiMock.get).toHaveBeenCalledWith('/whiteboards/discover', {
      params: {
        page: 1,
        size: 2,
      },
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/whiteboards/wb-1/join', {
      inviteCode: 'JOINME',
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(2, '/whiteboards/wb-2/request-join');
    expect(apiMock.put).toHaveBeenNthCalledWith(1, '/whiteboards/wb-1/join-requests/req-1', {
      status: 'APPROVED',
    });
    expect(apiMock.put).toHaveBeenNthCalledWith(2, '/whiteboards/wb-1/transfer-ownership', {
      newOwnerEmail: 'faculty@ilstu.edu',
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(3, '/whiteboards/wb-1/invite-faculty', {
      email: 'primary@ilstu.edu',
    });
  });
});
