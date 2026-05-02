import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { whiteboardService } from '../services/whiteboardService';
import { parseInviteCode } from '../utils/inviteCode';
import { extractErrorMessage } from './useApi';

const WHITEBOARD_PAGE_SIZE = 20;

export function useInviteLinks() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setWhiteboards = useWhiteboardStore((state) => state.setWhiteboards);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const joiningRef = useRef(false);
  const handledCodesRef = useRef<Set<string>>(new Set());

  const enqueueInviteUrl = useCallback((url: string | null | undefined) => {
    const inviteCode = parseInviteCode(url ?? '');
    if (!inviteCode) {
      return;
    }
    setPendingInviteCode(inviteCode);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Linking.getInitialURL()
      .then((url) => {
        if (!cancelled) {
          enqueueInviteUrl(url);
        }
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      enqueueInviteUrl(url);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [enqueueInviteUrl]);

  useEffect(() => {
    if (!pendingInviteCode || !isAuthenticated || !accessToken || joiningRef.current) {
      return;
    }

    if (handledCodesRef.current.has(pendingInviteCode)) {
      setPendingInviteCode(null);
      return;
    }

    let cancelled = false;
    joiningRef.current = true;
    handledCodesRef.current.add(pendingInviteCode);

    const joinFromLink = async () => {
      try {
        await whiteboardService.joinByInviteCode(pendingInviteCode);
        const whiteboardPage = await whiteboardService.getWhiteboards({
          page: 0,
          size: WHITEBOARD_PAGE_SIZE,
        });
        if (cancelled) {
          return;
        }
        setWhiteboards(whiteboardPage.content);
        setPendingInviteCode(null);
        Alert.alert('Class Joined', 'You joined the class from the QR code.');
        router.replace('/(tabs)/home');
      } catch (error: unknown) {
        if (!cancelled) {
          setPendingInviteCode(null);
          handledCodesRef.current.delete(pendingInviteCode);
          Alert.alert('Join Failed', extractErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          joiningRef.current = false;
        }
      }
    };

    void joinFromLink();

    return () => {
      cancelled = true;
      joiningRef.current = false;
    };
  }, [accessToken, isAuthenticated, pendingInviteCode, setWhiteboards]);
}
