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
  const [serverUrl, setServerUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddServer, setShowAddServer] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ServerConnectionStatus>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<CustomHeader[]>([]);

  const { servers, addServer, setActiveServer, removeServer } = useAuthStore();
  const { setOfflineMode } = useSettingsStore();

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
    if (!serverUrl.trim()) {
      setError(t('auth.invalidUrl'));
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      let url = serverUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

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
      setServerUrl('');
      setCustomHeaders([]);
      setShowAdvanced(false);
      setShowAddServer(false);
      router.replace('/(auth)/login');
    } catch {
      setError(t('auth.connectionFailed'));
    } finally {
      setIsValidating(false);
    }
  }, [serverUrl, t, getHeadersRecord, customHeaders, addServer, servers.length, setActiveServer]);

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
    setServerUrl('');
    setCustomHeaders([]);
    setShowAdvanced(false);
  }, []);

  const handleServerUrlChange = useCallback((text: string) => {
    setServerUrl(text);
    setError(null);
  }, []);

  const toggleAdvanced = useCallback(() => {
    setShowAdvanced((prev) => !prev);
  }, []);

  const openAddServer = useCallback(() => {
    setShowAddServer(true);
  }, []);

  return {
    servers,
    serverUrl,
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
    handleServerUrlChange,
    toggleAdvanced,
    openAddServer,
    addCustomHeader,
    updateCustomHeader,
    removeCustomHeader,
  };
}
