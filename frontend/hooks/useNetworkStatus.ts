import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  isOffline: boolean;
}

function toNetworkStatus(state: NetInfoState): NetworkStatus {
  const isConnected = state.isConnected;
  const isInternetReachable = state.isInternetReachable ?? null;

  // Only flag offline when the radio is explicitly disconnected. NetInfo's
  // isInternetReachable probes Apple/Google endpoints that fail to resolve on
  // the iOS Simulator (and behind some captive portals) even when the API is
  // reachable, which produced false-positive banners.
  return {
    isConnected,
    isInternetReachable,
    isOffline: isConnected === false,
  };
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: null,
    isInternetReachable: null,
    isOffline: false,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus(toNetworkStatus(state));
    });

    NetInfo.fetch()
      .then((state) => setStatus(toNetworkStatus(state)))
      .catch(() => {
        setStatus({
          isConnected: null,
          isInternetReachable: null,
          isOffline: false,
        });
      });

    return unsubscribe;
  }, []);

  return status;
}
