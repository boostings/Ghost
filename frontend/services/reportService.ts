import api from './api';
import type { ReportRequest, ReportResponse, ReviewReportRequest, PageResponse } from '../types';

export const reportService = {
  create: async (data: ReportRequest): Promise<ReportResponse> => {
    const response = await api.post<ReportResponse>('/reports', data);
    return response.data;
  },

  list: async (
    whiteboardId: string,
    page = 0,
    size = 20
  ): Promise<PageResponse<ReportResponse>> => {
    const response = await api.get<PageResponse<ReportResponse>>(
      `/reports/whiteboard/${whiteboardId}`,
      { params: { page, size } }
    );
    return response.data;
  },

  review: async (reportId: string, data: ReviewReportRequest): Promise<ReportResponse> => {
    const response = await api.put<ReportResponse>(`/reports/${reportId}`, data);
    return response.data;
  },
};
