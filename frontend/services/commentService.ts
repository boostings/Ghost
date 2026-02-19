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

/**
 * Comment service - handles CRUD operations for comments on questions,
 * including marking a comment as the verified answer.
 */
export const commentService = {
  /**
   * Get comments for a question.
   * GET /questions/{qId}/comments
   */
  getComments: async (qId: string, params?: PaginationParams): Promise<CommentResponse[]> => {
    const response = await api.get<PageResponse<CommentResponse> | CommentResponse[]>(
      `/questions/${qId}/comments`,
      {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? Config.PAGE_SIZE,
        },
      }
    );
    return Array.isArray(response.data) ? response.data : response.data.content;
  },

  /**
   * Create a new comment on a question.
   * Blocked if the question status is CLOSED.
   * POST /questions/{qId}/comments
   */
  createComment: async (qId: string, data: CreateCommentRequest): Promise<CommentResponse> => {
    const response = await api.post<CommentResponse>(`/questions/${qId}/comments`, data);
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
    const response = await api.put<CommentResponse>(`/questions/${qId}/comments/${id}`, data);
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

  /**
   * Vote on a comment.
   * POST /karma/comments/{id}/vote
   */
  voteOnComment: async (id: string, voteType: VoteType): Promise<void> => {
    await api.post(`/karma/comments/${id}/vote`, { voteType });
  },

  /**
   * Remove user's vote from a comment.
   * DELETE /karma/comments/{id}/vote
   */
  removeCommentVote: async (id: string): Promise<void> => {
    await api.delete(`/karma/comments/${id}/vote`);
  },

  /**
   * Legacy aliases kept for backward compatibility while screens migrate.
   */
  list: async (qId: string, params?: PaginationParams): Promise<CommentResponse[]> => {
    return commentService.getComments(qId, params);
  },

  create: async (qId: string, data: CreateCommentRequest): Promise<CommentResponse> => {
    return commentService.createComment(qId, data);
  },

  update: async (qId: string, id: string, data: EditCommentRequest): Promise<CommentResponse> => {
    return commentService.editComment(qId, id, data);
  },

  delete: async (qId: string, id: string): Promise<void> => {
    await commentService.deleteComment(qId, id);
  },

  verify: async (qId: string, id: string): Promise<void> => {
    await commentService.markVerifiedAnswer(qId, id);
  },

  vote: async (id: string, voteType: VoteType): Promise<void> => {
    await commentService.voteOnComment(id, voteType);
  },

  removeVote: async (id: string): Promise<void> => {
    await commentService.removeCommentVote(id);
  },
};
