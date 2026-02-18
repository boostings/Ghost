import api from './api';
import { Config } from '../constants/config';
import type {
  CommentResponse,
  PageResponse,
  CreateCommentRequest,
  EditCommentRequest,
  PaginationParams,
} from '../types';

/**
 * Comment service - handles CRUD operations for comments on questions,
 * including marking a comment as the verified answer.
 */
export const commentService = {
  /**
   * Get comments for a question.
   * GET /questions/{qId}/comments
   */
  getComments: async (
    qId: string,
    params?: PaginationParams
  ): Promise<PageResponse<CommentResponse>> => {
    const response = await api.get<PageResponse<CommentResponse>>(
      `/questions/${qId}/comments`,
      {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? Config.PAGE_SIZE,
        },
      }
    );
    return response.data;
  },

  /**
   * Create a new comment on a question.
   * Blocked if the question status is CLOSED.
   * POST /questions/{qId}/comments
   */
  createComment: async (
    qId: string,
    data: CreateCommentRequest
  ): Promise<CommentResponse> => {
    const response = await api.post<CommentResponse>(
      `/questions/${qId}/comments`,
      data
    );
    return response.data;
  },

  /**
   * Edit a comment (within 15-minute window, author only).
   * PUT /questions/{qId}/comments/{id}
   */
  editComment: async (
    qId: string,
    id: string,
    data: EditCommentRequest
  ): Promise<CommentResponse> => {
    const response = await api.put<CommentResponse>(
      `/questions/${qId}/comments/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a comment (author or faculty).
   * DELETE /questions/{qId}/comments/{id}
   */
  deleteComment: async (qId: string, id: string): Promise<void> => {
    await api.delete(`/questions/${qId}/comments/${id}`);
  },

  /**
   * Mark a comment as the verified answer (faculty only).
   * This sets the question status to CLOSED and locks the thread.
   * POST /questions/{qId}/comments/{id}/verify
   */
  markVerifiedAnswer: async (qId: string, id: string): Promise<void> => {
    await api.post(`/questions/${qId}/comments/${id}/verify`);
  },
};
