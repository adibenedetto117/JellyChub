import { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPublicUsers, authenticateByName } from '@/api';
import { useAuthStore } from '@/stores';
import type { JellyfinUser } from '@/types/jellyfin';

interface Props {
  onClose: () => void;
}

export function UserSwitcher({ onClose }: Props) {
  const [selectedUser, setSelectedUser] = useState<JellyfinUser | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { setUser, currentUser } = useAuthStore();
  const activeServer = useAuthStore((s) => s.getActiveServer());
  const queryClient = useQueryClient();

  const { data: publicUsers, isLoading } = useQuery({
    queryKey: ['publicUsers'],
    queryFn: getPublicUsers,
  });

  const loginMutation = useMutation({
    mutationFn: ({ username, pwd }: { username: string; pwd: string }) =>
      authenticateByName(username, pwd),
    onSuccess: (result) => {
      setUser(result.User, result.AccessToken);
      queryClient.invalidateQueries();
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    },
  });

  const handleSelectUser = (user: JellyfinUser) => {
    setError(null);
    setPassword('');

    if (user.HasPassword) {
      setSelectedUser(user);
    } else {
      loginMutation.mutate({ username: user.Name, pwd: '' });
    }
  };

  const handleLogin = () => {
    if (!selectedUser) return;
    loginMutation.mutate({ username: selectedUser.Name, pwd: password });
  };

  const getImageUrl = (user: JellyfinUser) => {
    if (!activeServer?.url || !user.PrimaryImageTag) return null;
    return `${activeServer.url}/Users/${user.Id}/Images/Primary?tag=${user.PrimaryImageTag}`;
  };

  if (selectedUser) {
    return (
      <View className="absolute inset-0 bg-black/95 z-50 items-center justify-center p-6">
        <View className="w-full max-w-sm bg-surface rounded-2xl p-6">
          <Text className="text-white text-xl font-bold mb-4 text-center">
            Enter Password
          </Text>

          <Text className="text-text-secondary text-center mb-4">
            {selectedUser.Name}
          </Text>

          {error && (
            <Text className="text-red-500 text-sm mb-4 text-center">{error}</Text>
          )}

          <TextInput
            className="bg-background text-white px-4 py-3 rounded-xl mb-4"
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.3)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoFocus
            onSubmitEditing={handleLogin}
          />

          <View className="flex-row">
            <Pressable
              onPress={() => setSelectedUser(null)}
              className="flex-1 py-3 rounded-xl bg-surface-secondary mr-2"
            >
              <Text className="text-white text-center">Back</Text>
            </Pressable>

            <Pressable
              onPress={handleLogin}
              disabled={loginMutation.isPending}
              className="flex-1 py-3 rounded-xl bg-accent"
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-white text-center font-semibold">Login</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="absolute inset-0 bg-black/95 z-50">
      <Pressable className="absolute inset-0" onPress={onClose} />
      <View className="flex-1 p-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white text-xl font-bold">Switch User</Text>
          <Pressable
            onPress={onClose}
            className="w-10 h-10 rounded-full bg-surface items-center justify-center"
          >
            <Text className="text-white text-lg font-bold">X</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#8b5cf6" size="large" />
          </View>
        ) : (
          <ScrollView className="flex-1">
            {currentUser && (
              <View className="mb-6">
                <Text className="text-text-secondary text-sm mb-2">Current User</Text>
                <Pressable
                  onPress={onClose}
                  className="bg-accent/20 p-4 rounded-xl flex-row items-center active:bg-accent/30"
                >
                  {getImageUrl(currentUser as JellyfinUser) ? (
                    <Image
                      source={{ uri: getImageUrl(currentUser as JellyfinUser)! }}
                      className="w-12 h-12 rounded-full mr-3"
                    />
                  ) : (
                    <View className="w-12 h-12 rounded-full bg-accent items-center justify-center mr-3">
                      <Text className="text-white text-lg font-bold">
                        {currentUser.Name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-white font-medium">{currentUser.Name}</Text>
                    <Text className="text-accent text-xs">Tap to continue</Text>
                  </View>
                </Pressable>
              </View>
            )}

            <Text className="text-text-secondary text-sm mb-2">Available Users</Text>

            {publicUsers
              ?.filter((user) => user.Id !== currentUser?.Id)
              .map((user) => (
                <Pressable
                  key={user.Id}
                  onPress={() => handleSelectUser(user)}
                  className="p-4 rounded-xl mb-2 flex-row items-center bg-surface active:bg-surface/80"
                >
                  {getImageUrl(user) ? (
                    <Image
                      source={{ uri: getImageUrl(user)! }}
                      className="w-12 h-12 rounded-full mr-3"
                    />
                  ) : (
                    <View className="w-12 h-12 rounded-full bg-accent/50 items-center justify-center mr-3">
                      <Text className="text-white text-lg font-bold">
                        {user.Name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-white font-medium">{user.Name}</Text>
                    {user.HasPassword && (
                      <Text className="text-text-tertiary text-xs">Password protected</Text>
                    )}
                  </View>
                </Pressable>
              ))}

            {publicUsers?.filter((u) => u.Id !== currentUser?.Id).length === 0 && (
              <Text className="text-text-tertiary text-center py-8">
                No other users available
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
