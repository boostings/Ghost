import { AxiosError } from 'axios';

interface ApiErrorResponse {
  message?: string;
  error?: string;
  status?: number;
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const responseData = err.response?.data as ApiErrorResponse | undefined;

    if (responseData?.message) {
      return responseData.message;
    }

    if (responseData?.error) {
      return responseData.error;
    }

    if (err.code === 'ERR_NETWORK') {
      return 'Unable to connect to server. Please check your connection.';
    }

    if (err.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }

    if (err.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    }

    if (err.response?.status === 404) {
      return 'The requested resource was not found.';
    }

    if (err.response?.status === 409) {
      return 'A conflict occurred. The resource may have been modified.';
    }

    if (err.response?.status && err.response.status >= 500) {
      return 'A server error occurred. Please try again later.';
    }

    return err.message || 'An unexpected error occurred.';
  }

  if (err instanceof Error) {
    return err.message;
  }

  return 'An unexpected error occurred.';
}
