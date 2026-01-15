import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useSettingsStore, DEFAULT_BOTTOM_BAR_CONFIG } from '@/stores';
import {
  authenticateByName,
  initiateQuickConnect,
  checkQuickConnectStatus,
  authenticateWithQuickConnect,
  getPublicUsers,
  getServerPublicInfo,
} from '@/api';
import type { JellyfinUser } from '@/types/jellyfin';
import type { ServerInfo } from '@/api';

export function useLoginScreen() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicUsers, setPublicUsers] = useState<JellyfinUser[]>([]);
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [quickConnectCode, setQuickConnectCode] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [isLoadingServerInfo, setIsLoadingServerInfo] = useState(true);

  const {
    setUser,
    getActiveServer,
    quickConnectSecret,
    setQuickConnect,
    clearQuickConnect,
  } = useAuthStore();
  const accentColor = useSettingsStore((s) => s.accentColor);
  const activeServer = getActiveServer();

  const getLandingPageRoute = useCallback((): string => {
    const bottomBarConfig = useSettingsStore.getState().bottomBarConfig;
    const landingPage = bottomBarConfig?.landingPage ?? DEFAULT_BOTTOM_BAR_CONFIG.landingPage;
    return `/(tabs)/${landingPage}`;
  }, []);

  const loadServerInfo = useCallback(async () => {
    if (!activeServer?.url) return;

    setIsLoadingServerInfo(true);
    try {
      const info = await getServerPublicInfo(activeServer.url);
      setServerInfo(info);
    } catch {
      setServerInfo(null);
    } finally {
      setIsLoadingServerInfo(false);
    }
  }, [activeServer?.url]);

  const loadPublicUsers = useCallback(async () => {
    try {
      const users = await getPublicUsers();
      setPublicUsers(users);
    } catch {
      setPublicUsers([]);
    }
  }, []);

  useEffect(() => {
    loadServerInfo();
    loadPublicUsers();
  }, [loadServerInfo, loadPublicUsers]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (quickConnectSecret) {
      interval = setInterval(async () => {
        try {
          const status = await checkQuickConnectStatus(quickConnectSecret);
          if (status.Authenticated) {
            clearInterval(interval);
            const auth = await authenticateWithQuickConnect(quickConnectSecret);
            setUser(auth.User, auth.AccessToken);
            clearQuickConnect();
            router.replace(getLandingPageRoute() as any);
          }
        } catch {
          clearInterval(interval);
          clearQuickConnect();
          setShowQuickConnect(false);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [quickConnectSecret, clearQuickConnect, getLandingPageRoute, setUser]);

  const handleLogin = useCallback(async () => {
    if (!username.trim()) {
      setError(t('auth.pleaseEnterUsername'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const auth = await authenticateByName(username, password);
      setUser(auth.User, auth.AccessToken);
      router.replace(getLandingPageRoute() as any);
    } catch {
      setError(t('auth.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  }, [username, password, t, setUser, getLandingPageRoute]);

  const handleQuickConnect = useCallback(async () => {
    try {
      setShowQuickConnect(true);
      const result = await initiateQuickConnect();
      setQuickConnect(result.Secret, result.Code);
      setQuickConnectCode(result.Code);
    } catch {
      setError(t('auth.quickConnectUnavailable'));
      setShowQuickConnect(false);
    }
  }, [t, setQuickConnect]);

  const handleSelectUser = useCallback((user: JellyfinUser) => {
    setUsername(user.Name);
    setError(null);
  }, []);

  const handleBack = useCallback(() => {
    router.replace('/(auth)/server-select');
  }, []);

  const handleCancelQuickConnect = useCallback(() => {
    clearQuickConnect();
    setShowQuickConnect(false);
    setQuickConnectCode(null);
  }, [clearQuickConnect]);

  const handleUsernameChange = useCallback((text: string) => {
    setUsername(text);
    setError(null);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    setError(null);
  }, []);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const serverName = serverInfo?.ServerName ?? activeServer?.name ?? 'Jellyfin Server';
  const serverVersion = serverInfo?.Version;

  return {
    username,
    password,
    showPassword,
    isLoading,
    error,
    publicUsers,
    showQuickConnect,
    quickConnectCode,
    serverName,
    serverVersion,
    isLoadingServerInfo,
    accentColor,
    handleLogin,
    handleQuickConnect,
    handleSelectUser,
    handleBack,
    handleCancelQuickConnect,
    handleUsernameChange,
    handlePasswordChange,
    toggleShowPassword,
  };
}
