import api from './api';
import { Config } from '../constants/config';
import type {
  CommentResponse,
  PageResponse,
  CreateCommentRequest,
  EditCommentRequest,
  PaginationParams,
  VoteType,
} from '../types';

export const commentService = {
  getComments: async (
    wbId: string,
    qId: string,
    params?: PaginationParams
  ): Promise<CommentResponse[]> => {
    const response = await api.get<PageResponse<CommentResponse> | CommentResponse[]>(
      `/whiteboards/${wbId}/questions/${qId}/comments`,
      {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? Config.PAGE_SIZE,
        },
      }
    );
    return Array.isArray(response.data) ? response.data : response.data.content;
  },

  createComment: async (
    wbId: string,
    qId: string,
    data: CreateCommentRequest
  ): Promise<CommentResponse> => {
    const response = await api.post<CommentResponse>(
      `/whiteboards/${wbId}/questions/${qId}/comments`,
      data
    );
    return response.data;
  },

  editComment: async (
    wbId: string,
    qId: string,
    id: string,
    data: EditCommentRequest
  ): Promise<CommentResponse> => {
    const response = await api.put<CommentResponse>(
      `/whiteboards/${wbId}/questions/${qId}/comments/${id}`,
      data
    );
    return response.data;
  },

  deleteComment: async (wbId: string, qId: string, id: string): Promise<void> => {
    await api.delete(`/whiteboards/${wbId}/questions/${qId}/comments/${id}`);
  },

  markVerifiedAnswer: async (wbId: string, qId: string, id: string): Promise<CommentResponse> => {
    const response = await api.post<CommentResponse>(
      `/whiteboards/${wbId}/questions/${qId}/comments/${id}/verify`
    );
    return response.data;
  },

  voteOnComment: async (id: string, voteType: VoteType): Promise<void> => {
    await api.post(`/karma/comments/${id}/vote`, { voteType });
  },

  removeCommentVote: async (id: string): Promise<void> => {
    await api.delete(`/karma/comments/${id}/vote`);
  },
};
