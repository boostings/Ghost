import api from './api';
import type { TopicResponse, PageResponse } from '../types';

export const topicService = {
  list: async (whiteboardId: string): Promise<TopicResponse[]> => {
    const response = await api.get<PageResponse<TopicResponse>>(
      `/whiteboards/${whiteboardId}/topics`,
      {
        params: {
          page: 0,
          size: 100,
        },
      }
    );
    return response.data.content;
  },

  create: async (whiteboardId: string, name: string): Promise<TopicResponse> => {
    const response = await api.post<TopicResponse>(`/whiteboards/${whiteboardId}/topics`, {
      name,
    });
    return response.data;
  },

  remove: async (whiteboardId: string, topicId: string): Promise<void> => {
    await api.delete(`/whiteboards/${whiteboardId}/topics/${topicId}`);
  },
};
