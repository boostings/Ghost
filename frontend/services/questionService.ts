import api from './api';
import { Config } from '../constants/config';
import type {
  QuestionResponse,
  PageResponse,
  CreateQuestionRequest,
  EditQuestionRequest,
  ForwardQuestionRequest,
  QuestionQueryParams,
  SearchParams,
  VoteType,
} from '../types';

/**
 * Question service - handles CRUD operations for questions within whiteboards,
 * including pinning, closing, and forwarding.
 */
export const questionService = {
  /**
   * Get questions for a whiteboard with optional filtering and pagination.
   * GET /whiteboards/{wbId}/questions
   */
  getQuestions: async (
    wbId: string,
    params?: QuestionQueryParams
  ): Promise<PageResponse<QuestionResponse>> => {
    const queryParams: Record<string, string | number> = {
      page: params?.page ?? 0,
      size: params?.size ?? Config.PAGE_SIZE,
    };

    if (params?.topicId) {
      queryParams.topic = params.topicId;
    }
    if (params?.status) {
      queryParams.status = params.status;
    }
    const response = await api.get<PageResponse<QuestionResponse>>(
      `/whiteboards/${wbId}/questions`,
      {
        params: queryParams,
      }
    );
    return response.data;
  },

  /**
   * Get a single question by ID.
   * GET /whiteboards/{wbId}/questions/{id}
   */
  getQuestion: async (wbId: string, id: string): Promise<QuestionResponse> => {
    const response = await api.get<QuestionResponse>(`/whiteboards/${wbId}/questions/${id}`);
    return response.data;
  },

  /**
   * Get a single question by ID without whiteboard context.
   * GET /questions/{id}
   */
  getQuestionById: async (id: string): Promise<QuestionResponse> => {
    const response = await api.get<QuestionResponse>(`/questions/${id}`);
    return response.data;
  },

  /**
   * Create a new question in a whiteboard.
   * POST /whiteboards/{wbId}/questions
   */
  createQuestion: async (wbId: string, data: CreateQuestionRequest): Promise<QuestionResponse> => {
    const response = await api.post<QuestionResponse>(`/whiteboards/${wbId}/questions`, data);
    return response.data;
  },

  /**
   * Edit an existing question (only if OPEN and author, before verified answer).
   * PUT /whiteboards/{wbId}/questions/{id}
   */
  editQuestion: async (
    wbId: string,
    id: string,
    data: EditQuestionRequest
  ): Promise<QuestionResponse> => {
    const response = await api.put<QuestionResponse>(`/whiteboards/${wbId}/questions/${id}`, data);
    return response.data;
  },

  /**
   * Delete a question (author or faculty).
   * DELETE /whiteboards/{wbId}/questions/{id}
   */
  deleteQuestion: async (wbId: string, id: string): Promise<void> => {
    await api.delete(`/whiteboards/${wbId}/questions/${id}`);
  },

  /**
   * Close a question (faculty only, marks as resolved).
   * POST /whiteboards/{wbId}/questions/{id}/close
   */
  closeQuestion: async (wbId: string, id: string): Promise<void> => {
    await api.post(`/whiteboards/${wbId}/questions/${id}/close`);
  },

  /**
   * Pin a question to the top of the whiteboard (faculty only, max 3 pinned).
   * POST /whiteboards/{wbId}/questions/{id}/pin
   */
  pinQuestion: async (wbId: string, id: string): Promise<void> => {
    await api.post(`/whiteboards/${wbId}/questions/${id}/pin`);
  },

  /**
   * Unpin a question (faculty only).
   * DELETE /whiteboards/{wbId}/questions/{id}/pin
   */
  unpinQuestion: async (wbId: string, id: string): Promise<void> => {
    await api.delete(`/whiteboards/${wbId}/questions/${id}/pin`);
  },

  /**
   * Forward a question to another faculty member (cross-class).
   * POST /whiteboards/{wbId}/questions/{id}/forward
   */
  forwardQuestion: async (
    wbId: string,
    id: string,
    data: ForwardQuestionRequest
  ): Promise<void> => {
    await api.post(`/whiteboards/${wbId}/questions/${id}/forward`, data);
  },

  /**
   * Search questions globally across enrolled whiteboards.
   * GET /search/questions
   */
  searchQuestions: async (params?: SearchParams): Promise<PageResponse<QuestionResponse>> => {
    const response = await api.get<PageResponse<QuestionResponse>>('/search/questions', {
      params: {
        q: params?.q,
        whiteboard: params?.whiteboard,
        topic: params?.topic,
        status: params?.status,
        from: params?.from,
        to: params?.to,
        page: params?.page ?? 0,
        size: params?.size ?? Config.PAGE_SIZE,
      },
    });
    return response.data;
  },

  /**
   * Vote on a question.
   * POST /karma/questions/{id}/vote
   */
  voteOnQuestion: async (id: string, voteType: VoteType): Promise<void> => {
    await api.post(`/karma/questions/${id}/vote`, { voteType });
  },

  /**
   * Remove user's vote from a question.
   * DELETE /karma/questions/{id}/vote
   */
  removeQuestionVote: async (id: string): Promise<void> => {
    await api.delete(`/karma/questions/${id}/vote`);
  },

  /**
   * Legacy aliases kept for backward compatibility while screens migrate.
   */
  list: async (
    wbId: string,
    params?: QuestionQueryParams
  ): Promise<PageResponse<QuestionResponse>> => {
    return questionService.getQuestions(wbId, params);
  },

  getById: async (wbId: string, id: string): Promise<QuestionResponse> => {
    return questionService.getQuestion(wbId, id);
  },

  getByIdGlobal: async (id: string): Promise<QuestionResponse> => {
    return questionService.getQuestionById(id);
  },

  create: async (wbId: string, data: CreateQuestionRequest): Promise<QuestionResponse> => {
    return questionService.createQuestion(wbId, data);
  },

  update: async (
    wbId: string,
    id: string,
    data: EditQuestionRequest
  ): Promise<QuestionResponse> => {
    return questionService.editQuestion(wbId, id, data);
  },

  delete: async (wbId: string, id: string): Promise<void> => {
    await questionService.deleteQuestion(wbId, id);
  },

  close: async (wbId: string, id: string): Promise<void> => {
    await questionService.closeQuestion(wbId, id);
  },

  pin: async (wbId: string, id: string): Promise<void> => {
    await questionService.pinQuestion(wbId, id);
  },

  unpin: async (wbId: string, id: string): Promise<void> => {
    await questionService.unpinQuestion(wbId, id);
  },

  search: async (params?: SearchParams): Promise<PageResponse<QuestionResponse>> => {
    return questionService.searchQuestions(params);
  },

  vote: async (id: string, voteType: VoteType): Promise<void> => {
    await questionService.voteOnQuestion(id, voteType);
  },

  removeVote: async (id: string): Promise<void> => {
    await questionService.removeQuestionVote(id);
  },
};
