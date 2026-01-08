import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
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

function UserAvatar({
  user,
  isSelected,
  onPress,
}: {
  user: JellyfinUser;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        className={`items-center mr-4 p-3 rounded-2xl ${
          isSelected ? 'bg-accent/20 border border-accent/30' : 'bg-surface'
        }`}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${
            isSelected ? 'bg-accent/30' : 'bg-surface-elevated'
          }`}
        >
          <Text className={`text-xl ${isSelected ? 'text-accent' : 'text-white'}`}>
            {user.Name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text
          className={`text-sm ${isSelected ? 'text-accent' : 'text-white'}`}
          numberOfLines={1}
        >
          {user.Name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function LoginScreen() {
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

  const getLandingPageRoute = (): string => {
    const bottomBarConfig = useSettingsStore.getState().bottomBarConfig;
    const landingPage = bottomBarConfig?.landingPage ?? DEFAULT_BOTTOM_BAR_CONFIG.landingPage;
    return `/(tabs)/${landingPage}`;
  };

  useEffect(() => {
    loadServerInfo();
    loadPublicUsers();
  }, []);

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
  }, [quickConnectSecret]);

  const loadServerInfo = async () => {
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
  };

  const loadPublicUsers = async () => {
    try {
      const users = await getPublicUsers();
      setPublicUsers(users);
    } catch {
      setPublicUsers([]);
    }
  };

  const handleLogin = async () => {
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
  };

  const handleQuickConnect = async () => {
    try {
      setShowQuickConnect(true);
      const result = await initiateQuickConnect();
      setQuickConnect(result.Secret, result.Code);
      setQuickConnectCode(result.Code);
    } catch {
      setError(t('auth.quickConnectUnavailable'));
      setShowQuickConnect(false);
    }
  };

  const handleSelectUser = (user: JellyfinUser) => {
    setUsername(user.Name);
    setError(null);
  };

  const handleBack = () => {
    router.replace('/(auth)/server-select');
  };

  // Quick Connect View
  if (showQuickConnect && quickConnectCode) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Animated.View
          entering={FadeIn.duration(400)}
          className="flex-1 justify-center items-center px-6"
        >
          <View className="w-16 h-16 rounded-2xl bg-accent/20 items-center justify-center mb-6">
            <Text className="text-3xl text-accent">Q</Text>
          </View>

          <Text className="text-white text-2xl font-bold mb-2">{t('auth.quickConnect')}</Text>
          <Text className="text-text-secondary text-center mb-8 px-8">
            {t('auth.quickConnectInstructions')}
          </Text>

          <View className="bg-surface px-10 py-6 rounded-2xl mb-8 border border-white/5">
            <Text className="text-4xl font-mono text-accent tracking-[0.3em]">
              {quickConnectCode}
            </Text>
          </View>

          <View className="flex-row items-center mb-2">
            <ActivityIndicator color={accentColor} size="small" />
            <Text className="text-text-tertiary ml-3">{t('auth.waitingForAuth')}</Text>
          </View>

          <Pressable
            className="mt-6 py-3 px-8"
            onPress={() => {
              clearQuickConnect();
              setShowQuickConnect(false);
              setQuickConnectCode(null);
            }}
          >
            <Text className="text-text-secondary">{t('common.cancel')}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const serverName = serverInfo?.ServerName ?? activeServer?.name ?? 'Jellyfin Server';
  const serverVersion = serverInfo?.Version;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Back Button */}
        <Animated.View entering={FadeIn.duration(400)} className="pt-4 pb-2">
          <Pressable
            className="flex-row items-center py-2 -ml-1"
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text className="text-accent mr-1">{'<'}</Text>
            <Text className="text-accent">{t('auth.servers')}</Text>
          </Pressable>
        </Animated.View>

        {/* Server Branding */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} className="pt-4 pb-6 items-center">
          <View className="w-16 h-16 rounded-2xl bg-accent/20 items-center justify-center mb-4">
            <Text className="text-2xl text-accent">
              {serverName.charAt(0).toUpperCase()}
            </Text>
          </View>

          {isLoadingServerInfo ? (
            <View className="h-8 items-center justify-center">
              <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" />
            </View>
          ) : (
            <>
              <Text className="text-2xl font-bold text-white text-center">
                {serverName}
              </Text>
              {serverVersion && (
                <Text className="text-text-muted text-sm mt-1">
                  Jellyfin {serverVersion}
                </Text>
              )}
            </>
          )}
        </Animated.View>

        {/* Public Users */}
        {publicUsers.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mb-6">
            <Text className="text-text-secondary text-sm font-medium uppercase tracking-wider mb-3">
              {t('auth.selectUser')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-1"
              contentContainerClassName="px-1"
            >
              {publicUsers.map((user) => (
                <UserAvatar
                  key={user.Id}
                  user={user}
                  isSelected={username === user.Name}
                  onPress={() => handleSelectUser(user)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Login Form */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          className="bg-surface rounded-2xl p-5 border border-white/5"
        >
          <View className="mb-4">
            <Text className="text-text-tertiary text-xs uppercase tracking-wider mb-2">
              {t('auth.username')}
            </Text>
            <TextInput
              className="bg-background-secondary text-white px-4 py-3.5 rounded-xl text-base"
              placeholder={t('auth.enterUsername')}
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View className="mb-4">
            <Text className="text-text-tertiary text-xs uppercase tracking-wider mb-2">
              {t('auth.password')}
            </Text>
            <View className="flex-row items-center bg-background-secondary rounded-xl">
              <TextInput
                className="flex-1 text-white px-4 py-3.5 text-base"
                placeholder={t('auth.enterPassword')}
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
                secureTextEntry={!showPassword}
              />
              <Pressable
                className="px-4 py-3.5"
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
              >
                <Text className="text-text-tertiary text-sm">
                  {showPassword ? t('auth.hide') : t('auth.show')}
                </Text>
              </Pressable>
            </View>
          </View>

          {error && (
            <View className="bg-error/10 rounded-xl px-4 py-3 mb-4">
              <Text className="text-error text-sm">{error}</Text>
            </View>
          )}

          <Pressable
            className={`py-3.5 rounded-xl items-center ${
              isLoading ? 'bg-accent/70' : 'bg-accent'
            }`}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white font-semibold ml-2">{t('auth.signingIn')}</Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-base">{t('auth.signIn')}</Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Quick Connect */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} className="mt-6">
          <View className="flex-row items-center justify-center mb-4">
            <View className="flex-1 h-px bg-white/10" />
            <Text className="text-text-muted text-xs mx-4">{t('auth.or')}</Text>
            <View className="flex-1 h-px bg-white/10" />
          </View>

          <Pressable
            className="py-3.5 rounded-xl items-center border border-white/10"
            onPress={handleQuickConnect}
          >
            <Text className="text-text-secondary font-medium">{t('auth.useQuickConnect')}</Text>
          </Pressable>

          <Text className="text-text-muted text-xs text-center mt-3">
            {t('auth.quickConnectDesc')}
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
