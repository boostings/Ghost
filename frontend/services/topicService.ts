import api from './api';
import type { TopicResponse } from '../types';

export const topicService = {
  list: async (whiteboardId: string): Promise<TopicResponse[]> => {
    const response = await api.get<TopicResponse[]>(`/whiteboards/${whiteboardId}/topics`);
    return response.data;
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
