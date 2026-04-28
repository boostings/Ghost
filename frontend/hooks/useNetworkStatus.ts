import { useEffect, useRef, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  isOffline: boolean;
}

const OFFLINE_CONFIRM_MS = 6000;

function rawIsOffline(state: NetInfoState): boolean {
  // Require BOTH signals to agree the device is offline. NetInfo on iOS 17+
  // simulators (and behind some captive portals) can flap either signal alone
  // even when the API is reachable, which produced false-positive banners.
  return state.isConnected === false && state.isInternetReachable === false;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: null,
    isInternetReachable: null,
    isOffline: false,
  });
  const offlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearTimer() {
      if (offlineTimer.current) {
        clearTimeout(offlineTimer.current);
        offlineTimer.current = null;
      }
    }

    function apply(state: NetInfoState) {
      const next: NetworkStatus = {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable ?? null,
        isOffline: false,
      };
      if (rawIsOffline(state)) {
        if (!offlineTimer.current) {
          offlineTimer.current = setTimeout(() => {
            setStatus((prev) => ({ ...prev, isOffline: true }));
          }, OFFLINE_CONFIRM_MS);
        }
        setStatus((prev) => ({ ...next, isOffline: prev.isOffline }));
      } else {
        clearTimer();
        setStatus(next);
      }
    }

    const unsubscribe = NetInfo.addEventListener(apply);
    NetInfo.fetch()
      .then(apply)
      .catch(() => {});

    return () => {
      clearTimer();
      unsubscribe();
    };
  }, []);

  return status;
}
