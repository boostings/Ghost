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

export const questionService = {
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

  getQuestion: async (wbId: string, id: string): Promise<QuestionResponse> => {
    const response = await api.get<QuestionResponse>(`/whiteboards/${wbId}/questions/${id}`);
    return response.data;
  },

  getQuestionById: async (id: string): Promise<QuestionResponse> => {
    const response = await api.get<QuestionResponse>(`/questions/${id}`);
    return response.data;
  },

  createQuestion: async (wbId: string, data: CreateQuestionRequest): Promise<QuestionResponse> => {
    const response = await api.post<QuestionResponse>(`/whiteboards/${wbId}/questions`, data);
    return response.data;
  },

  editQuestion: async (
    wbId: string,
    id: string,
    data: EditQuestionRequest
  ): Promise<QuestionResponse> => {
    const response = await api.put<QuestionResponse>(`/whiteboards/${wbId}/questions/${id}`, data);
    return response.data;
  },

  deleteQuestion: async (wbId: string, id: string): Promise<void> => {
    await api.delete(`/whiteboards/${wbId}/questions/${id}`);
  },

  closeQuestion: async (wbId: string, id: string): Promise<void> => {
    await api.post(`/whiteboards/${wbId}/questions/${id}/close`);
  },

  pinQuestion: async (wbId: string, id: string): Promise<void> => {
    await api.post(`/whiteboards/${wbId}/questions/${id}/pin`);
  },

  unpinQuestion: async (wbId: string, id: string): Promise<void> => {
    await api.delete(`/whiteboards/${wbId}/questions/${id}/pin`);
  },

  forwardQuestion: async (
    wbId: string,
    id: string,
    data: ForwardQuestionRequest
  ): Promise<void> => {
    await api.post(`/whiteboards/${wbId}/questions/${id}/forward`, data);
  },

  getMyQuestions: async (params?: {
    role?: 'AUTHOR' | 'TEACHING';
    status?: 'AWAITING' | 'ANSWERED';
    page?: number;
    size?: number;
  }): Promise<PageResponse<QuestionResponse>> => {
    const response = await api.get<PageResponse<QuestionResponse>>('/users/me/questions', {
      params: {
        role: params?.role ?? 'AUTHOR',
        ...(params?.status ? { status: params.status } : {}),
        page: params?.page ?? 0,
        size: params?.size ?? Config.PAGE_SIZE,
      },
    });
    return response.data;
  },

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

  voteOnQuestion: async (id: string, voteType: VoteType): Promise<void> => {
    await api.post(`/karma/questions/${id}/vote`, { voteType });
  },

  removeQuestionVote: async (id: string): Promise<void> => {
    await api.delete(`/karma/questions/${id}/vote`);
  },
};
