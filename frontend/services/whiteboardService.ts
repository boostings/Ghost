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

export const whiteboardService = {
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

  hasAnyWhiteboard: async (): Promise<boolean> => {
    const accessToken = useAuthStore.getState().accessToken ?? null;
    return checkMembership(accessToken);
  },

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

  getWhiteboard: async (id: string): Promise<WhiteboardResponse> => {
    const response = await api.get<WhiteboardResponse>(`/whiteboards/${id}`);
    return response.data;
  },

  createWhiteboard: async (data: CreateWhiteboardRequest): Promise<WhiteboardResponse> => {
    const response = await api.post<WhiteboardResponse>('/whiteboards', data);
    resetMembershipCache();
    return response.data;
  },

  deleteWhiteboard: async (id: string): Promise<void> => {
    await api.delete(`/whiteboards/${id}`);
    resetMembershipCache();
  },

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

  requestToJoin: async (id: string): Promise<void> => {
    await api.post(`/whiteboards/${id}/request-join`);
  },

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

  handleJoinRequest: async (
    wbId: string,
    reqId: string,
    data: JoinRequestActionRequest
  ): Promise<void> => {
    await api.put(`/whiteboards/${wbId}/join-requests/${reqId}`, data);
  },

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

  removeMember: async (wbId: string, userId: string): Promise<void> => {
    await api.delete(`/whiteboards/${wbId}/members/${userId}`);
  },

  transferOwnership: async (id: string, data: TransferOwnershipRequest | string): Promise<void> => {
    const payload: TransferOwnershipRequest =
      typeof data === 'string' ? { newOwnerEmail: data } : data;
    await api.put(`/whiteboards/${id}/transfer-ownership`, payload);
  },

  inviteFaculty: async (id: string, data: InviteFacultyRequest | string): Promise<void> => {
    const payload: InviteFacultyRequest = typeof data === 'string' ? { email: data } : data;
    await api.post(`/whiteboards/${id}/invite-faculty`, payload);
  },

  leaveWhiteboard: async (id: string): Promise<void> => {
    await api.post(`/whiteboards/${id}/leave`);
    resetMembershipCache();
  },

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
};
