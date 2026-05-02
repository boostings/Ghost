import { useEffect, useRef, useCallback, useState } from 'react';
import { Config } from '../constants/config';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';

interface StompSubscription {
  id: string;
  unsubscribe: () => void;
}

interface StompFrame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    if (typeof globalThis.atob !== 'function') {
      return null;
    }
    return globalThis.atob(normalized + padding);
  } catch {
    return null;
  }
}

function getTokenExpiryEpochSeconds(token: string): number | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) {
    return null;
  }
  try {
    const payload = JSON.parse(decoded) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string, skewSeconds = 10): boolean {
  const exp = getTokenExpiryEpochSeconds(token);
  if (!exp) {
    return false;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds >= exp - skewSeconds;
}

function serializeFrame(
  command: string,
  headers: Record<string, string>,
  body: string = ''
): string {
  let frame = `${command}\n`;
  for (const [key, value] of Object.entries(headers)) {
    frame += `${key}:${value}\n`;
  }
  frame += '\n';
  frame += body;
  frame += '\0';
  return frame;
}

function parseFrame(data: string): StompFrame {
  const cleaned = data.replace(/\0$/, '');
  const lines = cleaned.split('\n');

  const command = lines[0] || '';
  const headers: Record<string, string> = {};
  let bodyStartIndex = 1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') {
      bodyStartIndex = i + 1;
      break;
    }
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex);
      const value = line.substring(colonIndex + 1);
      headers[key] = value;
    }
  }

  const body = lines.slice(bodyStartIndex).join('\n');

  return { command, headers, body };
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionIdRef = useRef(0);
  const subscriptionsRef = useRef<
    Map<string, { destination: string; callback: (frame: StompFrame) => void }>
  >(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 10;
  const pendingSubscriptionsRef = useRef<
    Array<{ id: string; destination: string; callback: (frame: StompFrame) => void }>
  >([]);
  const tokenRefreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const hasLoggedExpiredWarningRef = useRef(false);

  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setTokens = useAuthStore((state) => state.setTokens);
  const logout = useAuthStore((state) => state.logout);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (tokenRefreshPromiseRef.current) {
      return tokenRefreshPromiseRef.current;
    }

    tokenRefreshPromiseRef.current = (async () => {
      const currentRefreshToken = useAuthStore.getState().refreshToken ?? refreshToken;
      if (!currentRefreshToken) {
        logout();
        return false;
      }

      try {
        const response = await authService.refreshToken(currentRefreshToken);
        setTokens(response.accessToken, response.refreshToken);
        return true;
      } catch {
        logout();
        return false;
      } finally {
        tokenRefreshPromiseRef.current = null;
      }
    })();

    return tokenRefreshPromiseRef.current;
  }, [logout, refreshToken, setTokens]);

  const sendFrame = useCallback(
    (command: string, headers: Record<string, string>, body: string = '') => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(serializeFrame(command, headers, body));
      }
    },
    []
  );

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const frame = parseFrame(typeof event.data === 'string' ? event.data : '');

      switch (frame.command) {
        case 'CONNECTED':
          isConnectedRef.current = true;
          setIsConnected(true);
          reconnectAttemptRef.current = 0;

          for (const pending of pendingSubscriptionsRef.current) {
            subscriptionsRef.current.set(pending.id, {
              destination: pending.destination,
              callback: pending.callback,
            });
          }
          pendingSubscriptionsRef.current = [];

          for (const [id, sub] of subscriptionsRef.current.entries()) {
            sendFrame('SUBSCRIBE', {
              id,
              destination: sub.destination,
            });
          }
          break;

        case 'MESSAGE': {
          const subscriptionId = frame.headers['subscription'];
          if (subscriptionId) {
            const subscription = subscriptionsRef.current.get(subscriptionId);
            if (subscription) {
              subscription.callback(frame);
            }
          }
          break;
        }

        case 'ERROR':
          console.warn('[WebSocket] STOMP error:', frame.headers['message'], frame.body);
          break;

        default:
          break;
      }
    },
    [sendFrame]
  );

  const connect = useCallback(() => {
    if (wsRef.current) {
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        return;
      }
    }

    if (!accessToken) {
      return;
    }

    if (isTokenExpired(accessToken)) {
      if (!hasLoggedExpiredWarningRef.current) {
        console.warn('[WebSocket] Access token expired. Refreshing token before reconnect.');
        hasLoggedExpiredWarningRef.current = true;
      }
      void refreshAccessToken();
      return;
    }
    hasLoggedExpiredWarningRef.current = false;

    try {
      const separator = Config.WS_URL.includes('?') ? '&' : '?';
      const wsUrl = `${Config.WS_URL}${separator}access_token=${encodeURIComponent(accessToken)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        sendFrame('CONNECT', {
          'accept-version': '1.2',
          'heart-beat': '10000,10000',
          Authorization: `Bearer ${accessToken}`,
        });
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        isConnectedRef.current = false;
        setIsConnected(false);

        const latestAccessToken = useAuthStore.getState().accessToken;
        if (latestAccessToken && isTokenExpired(latestAccessToken)) {
          void refreshAccessToken();
          return;
        }

        if (
          reconnectAttemptRef.current < maxReconnectAttempts &&
          useAuthStore.getState().isAuthenticated
        ) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
          reconnectAttemptRef.current++;

          reconnectTimerRef.current = setTimeout(() => {
            if (useAuthStore.getState().isAuthenticated) {
              connect();
            }
          }, delay);
        }
      };

      ws.onerror = () => {
        console.warn('[WebSocket] Connection error. Will retry if session is valid.');
      };
    } catch (error) {
      console.warn('[WebSocket] Failed to create connection:', error);
    }
  }, [accessToken, handleMessage, refreshAccessToken, sendFrame]);

  const subscribe = useCallback(
    (destination: string, callback: (frame: StompFrame) => void): StompSubscription | null => {
      const id = `sub-${++subscriptionIdRef.current}`;

      if (isConnectedRef.current) {
        sendFrame('SUBSCRIBE', { id, destination });
        subscriptionsRef.current.set(id, { destination, callback });
      } else {
        pendingSubscriptionsRef.current.push({ id, destination, callback });
      }

      return {
        id,
        unsubscribe: () => {
          if (isConnectedRef.current) {
            sendFrame('UNSUBSCRIBE', { id });
          }
          subscriptionsRef.current.delete(id);
          pendingSubscriptionsRef.current = pendingSubscriptionsRef.current.filter(
            (p) => p.id !== id
          );
        },
      };
    },
    [sendFrame]
  );

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    reconnectAttemptRef.current = maxReconnectAttempts;

    if (wsRef.current) {
      if (isConnectedRef.current) {
        sendFrame('DISCONNECT', {});
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    isConnectedRef.current = false;
    setIsConnected(false);
    hasLoggedExpiredWarningRef.current = false;
    subscriptionsRef.current.clear();
    pendingSubscriptionsRef.current = [];
  }, [sendFrame]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, accessToken, connect, disconnect]);

  return {
    subscribe,
    disconnect,
    isConnected,
  };
}

export type { StompFrame, StompSubscription };
