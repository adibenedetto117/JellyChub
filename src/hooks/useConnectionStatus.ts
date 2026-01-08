import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores';
import { jellyfinClient } from '@/api';

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'no_server';

interface ConnectionState {
  status: ConnectionStatus;
  error: string | null;
  lastChecked: number | null;
}

export function useConnectionStatus() {
  const activeServer = useAuthStore((state) => state.getActiveServer());
  const [state, setState] = useState<ConnectionState>({
    status: 'checking',
    error: null,
    lastChecked: null,
  });

  const checkConnection = useCallback(async () => {
    if (!activeServer?.url) {
      setState({
        status: 'no_server',
        error: 'No server configured',
        lastChecked: Date.now(),
      });
      return false;
    }

    setState((prev) => ({ ...prev, status: 'checking' }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = `${activeServer.url}/System/Info/Public`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setState({
          status: 'connected',
          error: null,
          lastChecked: Date.now(),
        });
        return true;
      } else {
        const errorMsg = `Server returned HTTP ${response.status}`;
        setState({
          status: 'disconnected',
          error: errorMsg,
          lastChecked: Date.now(),
        });
        return false;
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      let errorMessage = 'Unable to connect to server';

      if (error.name === 'AbortError') {
        errorMessage = `Connection timed out after 15s - server may be slow or unreachable`;
      } else if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network error - check your internet connection';
      } else if (error.message?.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused - server may be down';
      } else if (error.message?.includes('SSL') || error.message?.includes('certificate')) {
        errorMessage = 'SSL/Certificate error - check server HTTPS config';
      } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
        errorMessage = 'Server not found - check the URL';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setState({
        status: 'disconnected',
        error: errorMessage,
        lastChecked: Date.now(),
      });
      return false;
    }
  }, [activeServer?.url]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    ...state,
    serverUrl: activeServer?.url,
    serverName: activeServer?.name,
    checkConnection,
    isConnected: state.status === 'connected',
    isChecking: state.status === 'checking',
    hasError: state.status === 'disconnected' || state.status === 'no_server',
  };
}
