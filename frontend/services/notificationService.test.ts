type NotificationServiceModule = typeof import('./notificationService');

async function loadNotificationService(accessToken = 'token-1'): Promise<{
  module: NotificationServiceModule;
  apiMock: {
    get: jest.Mock;
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

  const module = require('./notificationService') as NotificationServiceModule;
  return { module, apiMock, authState };
}

describe('notificationService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('requests notifications with default pagination', async () => {
    const { module, apiMock } = await loadNotificationService();
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

    const result = await module.notificationService.getNotifications();

    expect(result).toEqual(response.data);
    expect(apiMock.get).toHaveBeenCalledWith('/notifications', {
      params: {
        page: 0,
        size: 20,
      },
    });
  });

  it('caches unread-count requests per access token', async () => {
    const { module, apiMock } = await loadNotificationService();
    apiMock.get.mockResolvedValue({ data: { count: 4 } });

    await expect(module.notificationService.getUnreadCount()).resolves.toBe(4);
    await expect(module.notificationService.getUnreadCount()).resolves.toBe(4);

    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(apiMock.get).toHaveBeenCalledWith('/notifications/unread-count');
  });

  it('deduplicates in-flight unread-count requests', async () => {
    const { module, apiMock } = await loadNotificationService();
    let resolveRequest!: (value: { data: { count: number } }) => void;
    apiMock.get.mockReturnValue(
      new Promise<{ data: { count: number } }>((resolve) => {
        resolveRequest = resolve;
      })
    );

    const first = module.notificationService.getUnreadCount();
    const second = module.notificationService.getUnreadCount();
    resolveRequest({ data: { count: 7 } });

    await expect(Promise.all([first, second])).resolves.toEqual([7, 7]);
    expect(apiMock.get).toHaveBeenCalledTimes(1);
  });

  it('invalidates cached unread-count values after mark-as-read actions', async () => {
    const { module, apiMock } = await loadNotificationService();
    apiMock.get.mockResolvedValueOnce({ data: { count: 3 } });
    apiMock.put.mockResolvedValue({ data: undefined });
    apiMock.get.mockResolvedValueOnce({ data: { count: 2 } });

    await expect(module.notificationService.getUnreadCount()).resolves.toBe(3);
    await module.notificationService.markAsRead('n-1');
    await expect(module.notificationService.getUnreadCount()).resolves.toBe(2);
    await module.notificationService.markAllAsRead();
    await module.notificationService.clearAll();

    expect(apiMock.put).toHaveBeenNthCalledWith(1, '/notifications/n-1/read');
    expect(apiMock.put).toHaveBeenNthCalledWith(2, '/notifications/read-all');
    expect(apiMock.delete).toHaveBeenCalledWith('/notifications');
    expect(apiMock.get).toHaveBeenCalledTimes(2);
  });
});
