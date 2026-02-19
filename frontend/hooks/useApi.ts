import { useState, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';

/**
 * Error shape returned by the Ghost backend's GlobalExceptionHandler.
 */
interface ApiErrorResponse {
  message?: string;
  error?: string;
  status?: number;
}

/**
 * Generic hook for making API calls with loading, error, and data state management.
 *
 * Usage:
 * ```ts
 * const { data, loading, error, execute } = useApi(
 *   (wbId: string) => questionService.getQuestions(wbId)
 * );
 *
 * // Later:
 * await execute('some-whiteboard-id');
 * ```
 *
 * @param apiCall - A function that performs the API call and returns a Promise.
 * @returns An object with data, loading, error, execute, and reset.
 */
export function useApi<TData, TArgs extends unknown[] = []>(
  apiCall: (...args: TArgs) => Promise<TData>
) {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Track the latest request to avoid race conditions
  const requestIdRef = useRef(0);

  /**
   * Execute the API call. Manages loading/error/data state automatically.
   * Returns the data on success, or null on failure.
   */
  const execute = useCallback(
    async (...args: TArgs): Promise<TData | null> => {
      const currentRequestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      try {
        const result = await apiCall(...args);

        // Only update state if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setData(result);
          setLoading(false);
        }

        return result;
      } catch (err) {
        // Only update state if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          const errorMessage = extractErrorMessage(err);
          setError(errorMessage);
          setLoading(false);
        }

        return null;
      }
    },
    [apiCall]
  );

  /**
   * Reset all state to initial values.
   */
  const reset = useCallback(() => {
    requestIdRef.current++;
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData,
  };
}

/**
 * Extract a human-readable error message from an error object.
 * Handles AxiosError with backend error response format,
 * standard Error objects, and unknown errors.
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const responseData = err.response?.data as ApiErrorResponse | undefined;

    // Try the backend's error message first
    if (responseData?.message) {
      return responseData.message;
    }

    // Fall back to the error field
    if (responseData?.error) {
      return responseData.error;
    }

    // Network errors
    if (err.code === 'ERR_NETWORK') {
      return 'Unable to connect to server. Please check your connection.';
    }

    // Timeout
    if (err.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }

    // HTTP status based messages
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
