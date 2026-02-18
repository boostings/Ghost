import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Config } from '../constants/config';
import { useAuthStore } from '../stores/authStore';
import type { AuthResponse, RefreshTokenRequest } from '../types';

/**
 * Axios instance configured with the Ghost API base URL.
 * Includes request interceptor for JWT token attachment
 * and response interceptor for automatic token refresh on 401.
 */
const api = axios.create({
  baseURL: Config.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: On 401 Unauthorized, attempt to refresh the access token.
 * If the refresh succeeds, retry the original request with the new token.
 * If the refresh fails, log the user out.
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh for 401 errors that haven't already been retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh if we're already on the refresh or login endpoint
    if (
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login')
    ) {
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

    const { refreshToken, logout, setAccessToken } = useAuthStore.getState();

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

      const { accessToken: newAccessToken } = response.data;

      setAccessToken(newAccessToken);
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
