import api from './api';
import { Config } from '../constants/config';
import { useAuthStore } from '../stores/authStore';
import type {
  WhiteboardResponse,
  PageResponse,
  CreateWhiteboardRequest,
  TransferOwnershipRequest,
  InviteFacultyRequest,
  JoinRequestResponse,
  JoinRequestActionRequest,
  MemberResponse,
  PaginationParams,
  JoinRequestStatus,
} from '../types';

const MEMBERSHIP_CHECK_CACHE_TTL_MS = 30_000;

type MembershipCacheEntry = {
  accessToken: string | null;
  hasWhiteboards: boolean;
  expiresAt: number;
};

type MembershipFlight = {
  accessToken: string | null;
  promise: Promise<boolean>;
};

let membershipCache: MembershipCacheEntry | null = null;
let membershipFlight: MembershipFlight | null = null;
const joinByInviteFlights = new Map<string, Promise<void>>();

function resetMembershipCache(): void {
  membershipCache = null;
  membershipFlight = null;
}

async function checkMembership(accessToken: string | null): Promise<boolean> {
  const now = Date.now();

  if (
    membershipCache &&
    membershipCache.accessToken === accessToken &&
    membershipCache.expiresAt > now
  ) {
    return membershipCache.hasWhiteboards;
  }

  if (membershipFlight && membershipFlight.accessToken === accessToken) {
    return membershipFlight.promise;
  }

  const request = (async () => {
    const response = await api.get<PageResponse<WhiteboardResponse> | WhiteboardResponse[]>(
      '/whiteboards',
      {
        params: {
          page: 0,
          size: 1,
        },
      }
    );

    const responseData = toPageResponse(response.data);
    const hasWhiteboards = responseData.totalElements > 0;

    const currentToken = useAuthStore.getState().accessToken ?? null;
    if (currentToken === accessToken) {
      membershipCache = {
        accessToken,
        hasWhiteboards,
        expiresAt: Date.now() + MEMBERSHIP_CHECK_CACHE_TTL_MS,
      };
    } else {
      membershipCache = null;
    }

    return hasWhiteboards;
  })();

  membershipFlight = { accessToken, promise: request };

  void request
    .finally(() => {
      if (membershipFlight?.accessToken === accessToken) {
        membershipFlight = null;
      }
    })
    .catch(() => undefined);

  return request;
}

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

/**
 * Whiteboard service - handles CRUD operations for whiteboards,
 * membership management, join requests, and ownership transfer.
 */
export const whiteboardService = {
  /**
   * Get all whiteboards the current user is enrolled in.
   * GET /whiteboards
   */
  getWhiteboards: async (params?: PaginationParams): Promise<PageResponse<WhiteboardResponse>> => {
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
   * Check whether the user has at least one whiteboard.
   * Uses a short in-memory cache to avoid duplicate mount-triggered requests.
   */
  hasAnyWhiteboard: async (): Promise<boolean> => {
    const accessToken = useAuthStore.getState().accessToken ?? null;
    return checkMembership(accessToken);
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
  createWhiteboard: async (data: CreateWhiteboardRequest): Promise<WhiteboardResponse> => {
    const response = await api.post<WhiteboardResponse>('/whiteboards', data);
    resetMembershipCache();
    return response.data;
  },

  /**
   * Delete a whiteboard (owner only).
   * DELETE /whiteboards/{id}
   */
  deleteWhiteboard: async (id: string): Promise<void> => {
    await api.delete(`/whiteboards/${id}`);
    resetMembershipCache();
  },

  /**
   * Join a whiteboard using an invite code.
   * POST /whiteboards/join-by-invite
   */
  joinByInviteCode: async (inviteCode: string, whiteboardId?: string): Promise<void> => {
    const trimmedCode = inviteCode.trim();
    const flightKey = `${whiteboardId ?? 'global'}:${trimmedCode.toUpperCase()}`;
    const existingFlight = joinByInviteFlights.get(flightKey);
    if (existingFlight) {
      return existingFlight;
    }

    const request = (async () => {
      if (whiteboardId) {
        await api.post(`/whiteboards/${whiteboardId}/join`, { inviteCode: trimmedCode });
      } else {
        await api.post('/whiteboards/join-by-invite', { inviteCode: trimmedCode });
      }
      resetMembershipCache();
    })();

    joinByInviteFlights.set(flightKey, request);
    void request
      .finally(() => {
        joinByInviteFlights.delete(flightKey);
      })
      .catch(() => undefined);

    return request;
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
  getMembers: async (id: string, params?: PaginationParams): Promise<MemberResponse[]> => {
    const response = await api.get<PageResponse<MemberResponse> | MemberResponse[]>(
      `/whiteboards/${id}/members`,
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
  transferOwnership: async (id: string, data: TransferOwnershipRequest | string): Promise<void> => {
    const payload: TransferOwnershipRequest =
      typeof data === 'string' ? { newOwnerEmail: data } : data;
    await api.put(`/whiteboards/${id}/transfer-ownership`, payload);
  },

  /**
   * Invite an existing faculty user to a whiteboard (owner only).
   * POST /whiteboards/{id}/invite-faculty
   */
  inviteFaculty: async (id: string, data: InviteFacultyRequest | string): Promise<void> => {
    const payload: InviteFacultyRequest = typeof data === 'string' ? { email: data } : data;
    await api.post(`/whiteboards/${id}/invite-faculty`, payload);
  },

  /**
   * Leave a whiteboard. Owner cannot leave (must transfer ownership first).
   * POST /whiteboards/{id}/leave
   */
  leaveWhiteboard: async (id: string): Promise<void> => {
    await api.post(`/whiteboards/${id}/leave`);
    resetMembershipCache();
  },

  /**
   * Get invite code and QR code data for a whiteboard (faculty only).
   * GET /whiteboards/{id}/invite-info
   */
  getInviteInfo: async (
    id: string
  ): Promise<{ inviteCode: string; inviteUrl: string; qrData: string }> => {
    const response = await api.get<InviteInfoResponse>(`/whiteboards/${id}/invite-info`);
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
