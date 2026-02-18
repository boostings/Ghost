import api from './api';
import { Config } from '../constants/config';
import type {
  WhiteboardResponse,
  PageResponse,
  CreateWhiteboardRequest,
  TransferOwnershipRequest,
  JoinRequestResponse,
  JoinRequestActionRequest,
  MemberResponse,
  PaginationParams,
} from '../types';

/**
 * Whiteboard service - handles CRUD operations for whiteboards,
 * membership management, join requests, and ownership transfer.
 */
export const whiteboardService = {
  /**
   * Get all whiteboards the current user is enrolled in.
   * GET /whiteboards
   */
  getWhiteboards: async (
    params?: PaginationParams
  ): Promise<PageResponse<WhiteboardResponse>> => {
    const response = await api.get<PageResponse<WhiteboardResponse>>(
      '/whiteboards',
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
   * Get a specific whiteboard by ID.
   * GET /whiteboards/{id}
   */
  getWhiteboard: async (id: string): Promise<WhiteboardResponse> => {
    const response = await api.get<WhiteboardResponse>(`/whiteboards/${id}`);
    return response.data;
  },

  /**
   * Create a new whiteboard (faculty only).
   * POST /whiteboards
   */
  createWhiteboard: async (
    data: CreateWhiteboardRequest
  ): Promise<WhiteboardResponse> => {
    const response = await api.post<WhiteboardResponse>('/whiteboards', data);
    return response.data;
  },

  /**
   * Delete a whiteboard (owner only).
   * DELETE /whiteboards/{id}
   */
  deleteWhiteboard: async (id: string): Promise<void> => {
    await api.delete(`/whiteboards/${id}`);
  },

  /**
   * Join a whiteboard using an invite code.
   * POST /whiteboards/{id}/join
   */
  joinByInviteCode: async (
    id: string,
    code: string
  ): Promise<void> => {
    await api.post(`/whiteboards/${id}/join`, { inviteCode: code });
  },

  /**
   * Request to join a whiteboard (student sends request, faculty approves).
   * POST /whiteboards/{id}/request-join
   */
  requestToJoin: async (id: string): Promise<void> => {
    await api.post(`/whiteboards/${id}/request-join`);
  },

  /**
   * Get pending join requests for a whiteboard (faculty only).
   * GET /whiteboards/{id}/join-requests
   */
  getJoinRequests: async (
    id: string,
    params?: PaginationParams
  ): Promise<PageResponse<JoinRequestResponse>> => {
    const response = await api.get<PageResponse<JoinRequestResponse>>(
      `/whiteboards/${id}/join-requests`,
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
   * Approve or reject a join request (faculty only).
   * PUT /whiteboards/{wbId}/join-requests/{reqId}
   */
  handleJoinRequest: async (
    wbId: string,
    reqId: string,
    data: JoinRequestActionRequest
  ): Promise<void> => {
    await api.put(`/whiteboards/${wbId}/join-requests/${reqId}`, data);
  },

  /**
   * Get members of a whiteboard.
   * GET /whiteboards/{id}/members
   */
  getMembers: async (
    id: string,
    params?: PaginationParams
  ): Promise<PageResponse<MemberResponse>> => {
    const response = await api.get<PageResponse<MemberResponse>>(
      `/whiteboards/${id}/members`,
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
   * Remove a member from a whiteboard (faculty only).
   * DELETE /whiteboards/{wbId}/members/{userId}
   */
  removeMember: async (wbId: string, userId: string): Promise<void> => {
    await api.delete(`/whiteboards/${wbId}/members/${userId}`);
  },

  /**
   * Transfer whiteboard ownership to another faculty (owner only).
   * The original owner is removed from the whiteboard.
   * PUT /whiteboards/{id}/transfer-ownership
   */
  transferOwnership: async (
    id: string,
    data: TransferOwnershipRequest
  ): Promise<void> => {
    await api.put(`/whiteboards/${id}/transfer-ownership`, data);
  },

  /**
   * Leave a whiteboard. Owner cannot leave (must transfer ownership first).
   * POST /whiteboards/{id}/leave
   */
  leaveWhiteboard: async (id: string): Promise<void> => {
    await api.post(`/whiteboards/${id}/leave`);
  },

  /**
   * Get invite code and QR code data for a whiteboard (faculty only).
   * GET /whiteboards/{id}/invite-info
   */
  getInviteInfo: async (
    id: string
  ): Promise<{ inviteCode: string; inviteUrl: string }> => {
    const response = await api.get<{ inviteCode: string; inviteUrl: string }>(
      `/whiteboards/${id}/invite-info`
    );
    return response.data;
  },
};
