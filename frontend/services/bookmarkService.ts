import api from './api';
import type { BookmarkResponse, PageResponse } from '../types';

export const bookmarkService = {
  list: async (page = 0, size = 20): Promise<PageResponse<BookmarkResponse>> => {
    const response = await api.get<PageResponse<BookmarkResponse> | BookmarkResponse[]>(
      '/bookmarks',
      { params: { page, size } }
    );
    if (Array.isArray(response.data)) {
      return {
        content: response.data,
        page,
        size,
        totalElements: response.data.length,
        totalPages: 1,
      };
    }
    return response.data;
  },

  add: async (questionId: string): Promise<void> => {
    await api.post(`/bookmarks/questions/${questionId}`);
  },

  remove: async (questionId: string): Promise<void> => {
    await api.delete(`/bookmarks/questions/${questionId}`);
  },
};
