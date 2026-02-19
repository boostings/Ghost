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

  return {
    isConnected,
    isInternetReachable,
    isOffline: isConnected === false || isInternetReachable === false,
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
