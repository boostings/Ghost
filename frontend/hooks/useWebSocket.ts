import { useEffect, useRef, useCallback, useState } from 'react';
import { Config } from '../constants/config';
import { useAuthStore } from '../stores/authStore';

// ============================================================
// Lightweight STOMP-over-WebSocket implementation.
//
// This avoids adding @stomp/stompjs as a dependency.
// It implements only the STOMP frames needed for Ghost:
// CONNECT, SUBSCRIBE, UNSUBSCRIBE, DISCONNECT, and
// handles incoming MESSAGE and CONNECTED frames.
// ============================================================

/** Represents a subscription that can be unsubscribed. */
interface StompSubscription {
  id: string;
  unsubscribe: () => void;
}

/** STOMP frame as parsed from raw WebSocket messages. */
interface StompFrame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

/**
 * Serialize a STOMP frame to a string suitable for sending over WebSocket.
 */
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

/**
 * Parse a raw STOMP frame string into a StompFrame object.
 */
function parseFrame(data: string): StompFrame {
  // Remove trailing null character
  const cleaned = data.replace(/\0$/, '');
  const lines = cleaned.split('\n');

  const command = lines[0] || '';
  const headers: Record<string, string> = {};
  let bodyStartIndex = 1;

  // Parse headers until we hit an empty line
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

/**
 * Hook for managing a STOMP WebSocket connection to the Ghost backend.
 *
 * Features:
 * - Automatic connection on mount (when authenticated)
 * - Automatic reconnection with exponential backoff on disconnect
 * - subscribe(topic, callback) returns a subscription that can be unsubscribed
 * - disconnect() for manual cleanup
 *
 * Usage:
 * ```ts
 * const { subscribe, disconnect, isConnected } = useWebSocket();
 *
 * useEffect(() => {
 *   const sub = subscribe('/topic/whiteboard/abc/questions', (message) => {
 *     console.log('New question:', JSON.parse(message.body));
 *   });
 *   return () => sub?.unsubscribe();
 * }, [subscribe]);
 * ```
 */
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

  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  /**
   * Send a raw STOMP frame over the WebSocket connection.
   */
  const sendFrame = useCallback(
    (command: string, headers: Record<string, string>, body: string = '') => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(serializeFrame(command, headers, body));
      }
    },
    []
  );

  /**
   * Handle incoming WebSocket messages and route them to the appropriate
   * subscription callback.
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const frame = parseFrame(typeof event.data === 'string' ? event.data : '');

      switch (frame.command) {
        case 'CONNECTED':
          isConnectedRef.current = true;
          setIsConnected(true);
          reconnectAttemptRef.current = 0;

          // Re-subscribe any pending subscriptions
          for (const pending of pendingSubscriptionsRef.current) {
            sendFrame('SUBSCRIBE', {
              id: pending.id,
              destination: pending.destination,
            });
            subscriptionsRef.current.set(pending.id, {
              destination: pending.destination,
              callback: pending.callback,
            });
          }
          pendingSubscriptionsRef.current = [];

          // Also re-subscribe existing subscriptions (reconnection case)
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
          // RECEIPT, HEARTBEAT, etc. - ignore
          break;
      }
    },
    [sendFrame]
  );

  /**
   * Establish a WebSocket connection and send the STOMP CONNECT frame.
   */
  const connect = useCallback(() => {
    if (wsRef.current) {
      // Already connected or connecting
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

    try {
      const separator = Config.WS_URL.includes('?') ? '&' : '?';
      const wsUrl = `${Config.WS_URL}${separator}access_token=${encodeURIComponent(accessToken)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send STOMP CONNECT frame with auth token
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

        // Attempt reconnection with exponential backoff
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

      ws.onerror = (error) => {
        console.warn('[WebSocket] Connection error:', error);
      };
    } catch (error) {
      console.warn('[WebSocket] Failed to create connection:', error);
    }
  }, [accessToken, handleMessage, sendFrame]);

  /**
   * Subscribe to a STOMP destination (topic).
   *
   * @param destination - The STOMP destination to subscribe to, e.g. "/topic/whiteboard/{id}/questions"
   * @param callback - Function called when a message is received on this destination
   * @returns A StompSubscription object with an unsubscribe() method, or null if not connected
   */
  const subscribe = useCallback(
    (destination: string, callback: (frame: StompFrame) => void): StompSubscription | null => {
      const id = `sub-${++subscriptionIdRef.current}`;

      if (isConnectedRef.current) {
        sendFrame('SUBSCRIBE', { id, destination });
        subscriptionsRef.current.set(id, { destination, callback });
      } else {
        // Queue subscription for when connection is established
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

  /**
   * Disconnect from the WebSocket server and clean up all subscriptions.
   */
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    reconnectAttemptRef.current = maxReconnectAttempts; // Prevent reconnection

    if (wsRef.current) {
      if (isConnectedRef.current) {
        sendFrame('DISCONNECT', {});
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    isConnectedRef.current = false;
    setIsConnected(false);
    subscriptionsRef.current.clear();
    pendingSubscriptionsRef.current = [];
  }, [sendFrame]);

  // Auto-connect when authenticated, auto-disconnect when not
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, accessToken]);

  return {
    subscribe,
    disconnect,
    isConnected,
  };
}

// Re-export the StompFrame type for consumers
export type { StompFrame, StompSubscription };
