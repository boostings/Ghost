import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Config } from '../constants/config';
import { useAuthStore } from '../stores/authStore';
import type { AuthResponse, RefreshTokenRequest } from '../types';

/**
 * Axios instance configured with the Ghost API base URL.
 * Includes request interceptor for JWT token attachment
 * and response interceptor for automatic token refresh on auth expiry.
 */
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

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
// Queue of requests that are waiting for the token to be refreshed
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

/**
 * Process the queue of failed requests after a token refresh.
 */
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

/**
 * Request interceptor: Attach Bearer token from authStore to every request.
 */
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

/**
 * Response interceptor: On 401/403 auth errors, attempt to refresh the access token.
 * If the refresh succeeds, retry the original request with the new token.
 * If the refresh fails, log the user out.
 */
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
    const isAuthError = status === 401 || status === 403;
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
      const logMethod = isAuthError || isNetworkError ? console.warn : console.error;

      logMethod(logLabel, {
        method: originalRequest?.method?.toUpperCase(),
        url: `${originalRequest?.baseURL ?? ''}${originalRequest?.url ?? ''}`,
        status,
        code: error.code,
        message: error.message,
        data: sanitizeForLog(error.response?.data),
      });
    }

    // Only attempt refresh for auth errors that haven't already been retried
    if (!isAuthError || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh if we're already on the refresh or login endpoint
    if (isAuthEndpoint) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // If we're already refreshing, queue this request and wait for the new token
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

      // Retry the original request with the new token
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
