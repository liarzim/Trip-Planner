import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Custom hook that listens to the device network connectivity.
 * Returns true if the device is online, and false if offline.
 */
export function useNetworkState(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected !== false);
    });

    // Fetch the initial network state
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected !== false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return isOnline;
}
