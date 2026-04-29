import api from './api';
import type {
  ReportRequest,
  ReportResponse,
  ReviewReportRequest,
  PageResponse,
  ReportStatus,
} from '../types';

export const reportService = {
  create: async (data: ReportRequest): Promise<ReportResponse> => {
    const response = await api.post<ReportResponse>('/reports', data);
    return response.data;
  },

  list: async (
    whiteboardId: string,
    page = 0,
    size = 20,
    status?: ReportStatus
  ): Promise<PageResponse<ReportResponse>> => {
    const params: { page: number; size: number; status?: ReportStatus } = { page, size };
    if (status) {
      params.status = status;
    }

    const response = await api.get<PageResponse<ReportResponse>>(
      `/reports/whiteboard/${whiteboardId}`,
      { params }
    );
    return response.data;
  },

  review: async (reportId: string, data: ReviewReportRequest): Promise<ReportResponse> => {
    const response = await api.put<ReportResponse>(`/reports/${reportId}`, data);
    return response.data;
  },
};
