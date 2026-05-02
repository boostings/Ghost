import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Config } from '../constants/config';
import { useAuthStore } from '../stores/authStore';
import type { AuthResponse, RefreshTokenRequest } from '../types';

const api = axios.create({
  baseURL: Config.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'verificationCode',
  'verification_code',
]);

function sanitizeForLog(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    Object.entries(record).forEach(([key, nestedValue]) => {
      if (SENSITIVE_KEYS.has(key)) {
        sanitized[key] = REDACTED;
      } else {
        sanitized[key] = sanitizeForLog(nestedValue);
      }
    });

    return sanitized;
  }

  return value;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (__DEV__) {
      console.debug('[API REQUEST]', {
        method: config.method?.toUpperCase(),
        url: `${config.baseURL ?? ''}${config.url ?? ''}`,
        params: sanitizeForLog(config.params),
        data: sanitizeForLog(config.data),
      });
    }

    return config;
  },
  (error) => {
    if (__DEV__) {
      console.error('[API REQUEST ERROR]', error);
    }
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.debug('[API RESPONSE]', {
        method: response.config.method?.toUpperCase(),
        url: `${response.config.baseURL ?? ''}${response.config.url ?? ''}`,
        status: response.status,
        data: sanitizeForLog(response.data),
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const status = error.response?.status;
    const isAuthError = status === 401;
    const isNetworkError = error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !status;
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/forgot-password') ||
      originalRequest?.url?.includes('/auth/verify-password-reset') ||
      originalRequest?.url?.includes('/auth/reset-password');

    if (__DEV__) {
      const logLabel = isAuthError
        ? '[API RESPONSE AUTH]'
        : isNetworkError
          ? '[API RESPONSE NETWORK]'
          : '[API RESPONSE ERROR]';
      console.warn(logLabel, {
        method: originalRequest?.method?.toUpperCase(),
        url: `${originalRequest?.baseURL ?? ''}${originalRequest?.url ?? ''}`,
        status,
        code: error.code,
        message: error.message,
        data: sanitizeForLog(error.response?.data),
      });
    }

    if (!isAuthError || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isAuthEndpoint) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const { refreshToken, logout, setTokens } = useAuthStore.getState();

    if (!refreshToken) {
      isRefreshing = false;
      logout();
      return Promise.reject(error);
    }

    try {
      const requestData: RefreshTokenRequest = { refreshToken };
      const response = await axios.post<AuthResponse>(
        `${Config.API_URL}/auth/refresh`,
        requestData
      );

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      setTokens(newAccessToken, newRefreshToken);
      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
