import api from './api';
import type { AuditAction, AuditLogResponse, PageResponse } from '../types';

export const auditLogService = {
  list: async (
    whiteboardId: string,
    params?: {
      action?: AuditAction;
      actorId?: string;
      from?: string;
      to?: string;
      page?: number;
      size?: number;
    }
  ): Promise<PageResponse<AuditLogResponse>> => {
    const response = await api.get<PageResponse<AuditLogResponse>>(
      `/whiteboards/${whiteboardId}/audit-logs`,
      {
        params: {
          action: params?.action,
          actorId: params?.actorId,
          from: params?.from,
          to: params?.to,
          page: params?.page ?? 0,
          size: params?.size ?? 20,
        },
      }
    );
    return response.data;
  },

  exportCsv: async (whiteboardId: string): Promise<string> => {
    const response = await api.get<string>(`/whiteboards/${whiteboardId}/audit-logs/export`, {
      responseType: 'text',
    });
    return response.data;
  },
};
