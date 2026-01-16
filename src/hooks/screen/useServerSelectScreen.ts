import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useSettingsStore } from '@/stores';
import { validateServerUrl, getServerPublicInfo, jellyfinClient } from '@/api';
import type { ServerInfo } from '@/api';

interface CustomHeader {
  id: string;
  name: string;
  value: string;
}

interface ServerConnectionStatus {
  isOnline: boolean;
  serverInfo: ServerInfo | null;
  isChecking: boolean;
}

export function useServerSelectScreen() {
  const { t } = useTranslation();
  const [protocol, setProtocol] = useState<'http' | 'https'>('https');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddServer, setShowAddServer] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ServerConnectionStatus>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<CustomHeader[]>([]);

  const buildUrl = useCallback(() => {
    const trimmedHost = host.trim();
    if (!trimmedHost) return '';
    return `${protocol}://${trimmedHost}${port ? ':' + port : ''}`;
  }, [protocol, host, port]);

  const { servers, addServer, setActiveServer, removeServer, currentUser, activeServerId } = useAuthStore();
  const { setOfflineMode } = useSettingsStore();

  const isLoggedIn = !!currentUser && !!activeServerId;

  const getHeadersRecord = useCallback((headers: CustomHeader[]): Record<string, string> | undefined => {
    const validHeaders = headers.filter((h) => h.name.trim() && h.value.trim());
    if (validHeaders.length === 0) return undefined;
    return validHeaders.reduce((acc, h) => {
      acc[h.name.trim()] = h.value.trim();
      return acc;
    }, {} as Record<string, string>);
  }, []);

  const addCustomHeader = useCallback(() => {
    setCustomHeaders((prev) => [
      ...prev,
      { id: `header_${Date.now()}`, name: '', value: '' },
    ]);
  }, []);

  const updateCustomHeader = useCallback((id: string, field: 'name' | 'value', value: string) => {
    setCustomHeaders((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: value } : h))
    );
  }, []);

  const removeCustomHeader = useCallback((id: string) => {
    setCustomHeaders((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const checkServerConnections = useCallback(async () => {
    for (const server of servers) {
      setConnectionStatus((prev) => ({
        ...prev,
        [server.id]: { ...prev[server.id], isChecking: true, isOnline: false, serverInfo: null },
      }));

      try {
        const serverInfo = await getServerPublicInfo(server.url, server.customHeaders);
        setConnectionStatus((prev) => ({
          ...prev,
          [server.id]: {
            isOnline: serverInfo !== null,
            serverInfo,
            isChecking: false,
          },
        }));
      } catch {
        setConnectionStatus((prev) => ({
          ...prev,
          [server.id]: {
            isOnline: false,
            serverInfo: null,
            isChecking: false,
          },
        }));
      }
    }
  }, [servers]);

  useEffect(() => {
    checkServerConnections();
  }, [checkServerConnections]);

  useEffect(() => {
    if (servers.length === 0) {
      setShowAddServer(true);
    }
  }, [servers.length]);

  const handleAddServer = useCallback(async () => {
    const url = buildUrl();
    if (!url) {
      setError(t('auth.invalidUrl'));
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const headersRecord = getHeadersRecord(customHeaders);
      const serverInfo = await validateServerUrl(url, headersRecord);

      if (!serverInfo) {
        setError(t('auth.connectionFailed'));
        return;
      }

      const serverId = addServer({
        name: serverInfo.ServerName,
        url: url.replace(/\/$/, ''),
        isDefault: servers.length === 0,
        customHeaders: headersRecord,
      });

      jellyfinClient.initialize(url, headersRecord);
      setActiveServer(serverId);
      setProtocol('https');
      setHost('');
      setPort('');
      setCustomHeaders([]);
      setShowAdvanced(false);
      setShowAddServer(false);
      router.replace('/(auth)/login');
    } catch {
      setError(t('auth.connectionFailed'));
    } finally {
      setIsValidating(false);
    }
  }, [buildUrl, t, getHeadersRecord, customHeaders, addServer, servers.length, setActiveServer]);

  const handleSelectServer = useCallback((id: string) => {
    const server = servers.find((s) => s.id === id);
    if (server) {
      jellyfinClient.initialize(server.url, server.customHeaders);
      setActiveServer(id);
      router.replace('/(auth)/login');
    }
  }, [servers, setActiveServer]);

  const handleRemoveServer = useCallback((id: string) => {
    removeServer(id);
    setConnectionStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[id];
      return newStatus;
    });
  }, [removeServer]);

  const handleEnterOfflineMode = useCallback(() => {
    setOfflineMode(true);
    router.replace('/(tabs)/downloads');
  }, [setOfflineMode]);

  const handleCancelAddServer = useCallback(() => {
    setShowAddServer(false);
    setError(null);
    setProtocol('https');
    setHost('');
    setPort('');
    setCustomHeaders([]);
    setShowAdvanced(false);
  }, []);

  const handleProtocolChange = useCallback((newProtocol: 'http' | 'https') => {
    setProtocol(newProtocol);
    setError(null);
  }, []);

  const handleHostChange = useCallback((text: string) => {
    setHost(text);
    setError(null);
  }, []);

  const handlePortChange = useCallback((text: string) => {
    setPort(text);
    setError(null);
  }, []);

  const toggleAdvanced = useCallback(() => {
    setShowAdvanced((prev) => !prev);
  }, []);

  const openAddServer = useCallback(() => {
    setShowAddServer(true);
  }, []);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  }, []);

  return {
    isLoggedIn,
    activeServerId,
    servers,
    protocol,
    host,
    port,
    isValidating,
    error,
    showAddServer,
    connectionStatus,
    showAdvanced,
    customHeaders,
    handleAddServer,
    handleSelectServer,
    handleRemoveServer,
    handleEnterOfflineMode,
    handleCancelAddServer,
    handleProtocolChange,
    handleHostChange,
    handlePortChange,
    toggleAdvanced,
    openAddServer,
    addCustomHeader,
    updateCustomHeader,
    removeCustomHeader,
    handleGoBack,
  };
}
