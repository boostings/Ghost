jest.mock('./api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

import api from './api';
import { auditLogService } from './auditLogService';

const apiMock = api as jest.Mocked<typeof api>;

describe('auditLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests paginated audit logs with defaults', async () => {
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

    const result = await auditLogService.list('wb-1');

    expect(result).toEqual(response.data);
    expect(apiMock.get).toHaveBeenCalledWith('/whiteboards/wb-1/audit-logs', {
      params: {
        action: undefined,
        actorId: undefined,
        from: undefined,
        to: undefined,
        page: 0,
        size: 20,
      },
    });
  });

  it('exports audit logs as csv text', async () => {
    apiMock.get.mockResolvedValue({ data: 'id,action\n1,QUESTION_CREATED' });

    const csv = await auditLogService.exportCsv('wb-9');

    expect(csv).toBe('id,action\n1,QUESTION_CREATED');
    expect(apiMock.get).toHaveBeenCalledWith('/whiteboards/wb-9/audit-logs/export', {
      responseType: 'text',
    });
  });
});
