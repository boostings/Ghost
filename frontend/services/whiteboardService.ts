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
  UserResponse,
  JoinRequestStatus,
} from '../types';

type InviteInfoResponse = {
  inviteCode: string;
  inviteUrl?: string;
  qrData?: string;
};

function toPageResponse<T>(
  data: PageResponse<T> | T[],
  params?: PaginationParams
): PageResponse<T> {
  if (Array.isArray(data)) {
    return {
      content: data,
      page: params?.page ?? 0,
      size: params?.size ?? data.length,
      totalElements: data.length,
      totalPages: 1,
    };
  }
  return data;
}

function toMemberResponse(user: UserResponse): MemberResponse {
  return {
    id: user.id,
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    joinedAt: user.createdAt,
  };
}

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
    const response = await api.get<PageResponse<WhiteboardResponse> | WhiteboardResponse[]>(
      '/whiteboards',
      {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? Config.PAGE_SIZE,
        },
      }
    );
    return toPageResponse(response.data, params);
  },

  /**
   * Get discoverable classes that the current user has not joined yet.
   * GET /whiteboards/discover
   */
  getDiscoverableWhiteboards: async (
    params?: PaginationParams
  ): Promise<PageResponse<WhiteboardResponse>> => {
    const response = await api.get<PageResponse<WhiteboardResponse> | WhiteboardResponse[]>(
      '/whiteboards/discover',
      {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? Config.PAGE_SIZE,
        },
      }
    );
    return toPageResponse(response.data, params);
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
   * POST /whiteboards/join-by-invite
   */
  joinByInviteCode: async (
    inviteCode: string,
    whiteboardId?: string
  ): Promise<void> => {
    const trimmedCode = inviteCode.trim();
    if (whiteboardId) {
      await api.post(`/whiteboards/${whiteboardId}/join`, { inviteCode: trimmedCode });
      return;
    }
    await api.post('/whiteboards/join-by-invite', { inviteCode: trimmedCode });
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
  ): Promise<JoinRequestResponse[]> => {
    const response = await api.get<PageResponse<JoinRequestResponse> | JoinRequestResponse[]>(
      `/whiteboards/${id}/join-requests`,
      {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? Config.PAGE_SIZE,
        },
      }
    );
    return toPageResponse(response.data, params).content;
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
  ): Promise<MemberResponse[]> => {
    const response = await api.get<PageResponse<UserResponse> | UserResponse[]>(
      `/whiteboards/${id}/members`,
      {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? Config.PAGE_SIZE,
        },
      }
    );
    const pageData = toPageResponse(response.data, params);
    return pageData.content.map(toMemberResponse);
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
    data: TransferOwnershipRequest | string
  ): Promise<void> => {
    const payload: TransferOwnershipRequest = typeof data === 'string'
      ? { newOwnerEmail: data }
      : data;
    await api.put(`/whiteboards/${id}/transfer-ownership`, payload);
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
  ): Promise<{ inviteCode: string; inviteUrl: string; qrData: string }> => {
    const response = await api.get<InviteInfoResponse>(
      `/whiteboards/${id}/invite-info`
    );
    return {
      inviteCode: response.data.inviteCode,
      inviteUrl: response.data.inviteUrl ?? response.data.qrData ?? '',
      qrData: response.data.qrData ?? response.data.inviteUrl ?? '',
    };
  },

  /**
   * Legacy aliases kept for backward compatibility while screens migrate.
   */
  list: async (
    page = 0,
    size: number = Config.PAGE_SIZE
  ): Promise<PageResponse<WhiteboardResponse>> => {
    return whiteboardService.getWhiteboards({ page, size });
  },

  listDiscoverable: async (
    page = 0,
    size: number = Config.PAGE_SIZE
  ): Promise<PageResponse<WhiteboardResponse>> => {
    return whiteboardService.getDiscoverableWhiteboards({ page, size });
  },

  getById: async (id: string): Promise<WhiteboardResponse> => {
    return whiteboardService.getWhiteboard(id);
  },

  create: async (data: CreateWhiteboardRequest): Promise<WhiteboardResponse> => {
    return whiteboardService.createWhiteboard(data);
  },

  delete: async (id: string): Promise<void> => {
    await whiteboardService.deleteWhiteboard(id);
  },

  reviewJoinRequest: async (
    wbId: string,
    reqId: string,
    status: JoinRequestStatus
  ): Promise<void> => {
    await whiteboardService.handleJoinRequest(wbId, reqId, { status });
  },
};
