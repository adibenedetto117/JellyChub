import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore, usePlayerStore } from '@/stores';
import { markAsFavorite, getPlaylists, addToPlaylist } from '@/api';
import type { BaseItem } from '@/types/jellyfin';

interface TrackOptionsMenuProps {
  track: BaseItem;
  visible: boolean;
  onClose: () => void;
}

export function TrackOptionsMenu({ track, visible, onClose }: TrackOptionsMenuProps) {
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [isFavorite, setIsFavorite] = useState(track.UserData?.IsFavorite ?? false);

  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const addToPlayNext = usePlayerStore((state) => state.addToPlayNext);
  const queryClient = useQueryClient();
  const userId = currentUser?.Id ?? '';

  const { data: playlists, isLoading: playlistsLoading } = useQuery({
    queryKey: ['playlists', userId],
    queryFn: () => getPlaylists(userId),
    enabled: !!userId && showPlaylistPicker,
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ itemId, favorite }: { itemId: string; favorite: boolean }) =>
      markAsFavorite(userId, itemId, favorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteSongs'] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['playlistTracks'] });
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: ({ playlistId, itemId }: { playlistId: string; itemId: string }) =>
      addToPlaylist(playlistId, [itemId], userId),
    onSuccess: () => {
      setShowPlaylistPicker(false);
      onClose();
      Alert.alert('Added', 'Track added to playlist');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add to playlist');
    },
  });

  const handleToggleFavorite = async () => {
    const newValue = !isFavorite;
    setIsFavorite(newValue);
    try {
      await favoriteMutation.mutateAsync({ itemId: track.Id, favorite: newValue });
      onClose();
    } catch {
      setIsFavorite(!newValue);
    }
  };

  const handleAddToPlaylist = () => {
    setShowPlaylistPicker(true);
  };

  const handlePlayNext = () => {
    addToPlayNext({
      id: track.Id,
      item: track,
      index: 0, // Will be re-indexed by the store
    });
    onClose();
    Alert.alert('Added', 'Track will play next');
  };

  const handleSelectPlaylist = (playlistId: string) => {
    addToPlaylistMutation.mutate({ playlistId, itemId: track.Id });
  };

  const handleClosePlaylistPicker = () => {
    setShowPlaylistPicker(false);
  };

  if (showPlaylistPicker) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClosePlaylistPicker}
      >
        <View className="flex-1 bg-black/60 justify-center items-center">
          <View className="bg-surface rounded-2xl w-[85%] max-h-[70%] overflow-hidden">
            <View className="flex-row items-center justify-between p-4 border-b border-white/10">
              <Text className="text-white text-lg font-semibold">Add to Playlist</Text>
              <Pressable
                onPress={handleClosePlaylistPicker}
                className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#fff" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {playlistsLoading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator color={accentColor} size="large" />
                </View>
              ) : playlists?.Items && playlists.Items.length > 0 ? (
                playlists.Items.map((playlist) => (
                  <Pressable
                    key={playlist.Id}
                    onPress={() => handleSelectPlaylist(playlist.Id)}
                    className="flex-row items-center p-4 border-b border-white/5 active:bg-white/10"
                    disabled={addToPlaylistMutation.isPending}
                  >
                    <View className="w-10 h-10 rounded-lg bg-white/10 items-center justify-center mr-3">
                      <Ionicons name="musical-notes" size={18} color="rgba(255,255,255,0.5)" />
                    </View>
                    <Text className="text-white text-base flex-1" numberOfLines={1}>
                      {playlist.Name}
                    </Text>
                    {addToPlaylistMutation.isPending &&
                      addToPlaylistMutation.variables?.playlistId === playlist.Id && (
                        <ActivityIndicator size="small" color={accentColor} />
                      )}
                  </Pressable>
                ))
              ) : (
                <View className="p-8 items-center">
                  <Text className="text-text-tertiary">No playlists found</Text>
                  <Text className="text-text-muted text-sm mt-2">
                    Create a playlist in the Music tab
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-surface rounded-t-3xl pb-10">
          <View className="pt-3 pb-5 items-center">
            <View className="w-12 h-1 bg-white/30 rounded-full" />
          </View>

          <View className="px-6">
            <View className="flex-row items-center mb-6">
              <View className="w-14 h-14 rounded-lg bg-white/10 items-center justify-center mr-4">
                <Ionicons name="musical-note" size={24} color="rgba(255,255,255,0.5)" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-lg" numberOfLines={1}>
                  {track.Name}
                </Text>
                <Text className="text-text-secondary" numberOfLines={1}>
                  {(track as any)?.AlbumArtist ?? (track as any)?.Artists?.[0] ?? 'Unknown Artist'}
                </Text>
              </View>
            </View>

            <Pressable
              className="flex-row items-center py-4 border-b border-white/10"
              onPress={handleToggleFavorite}
              disabled={favoriteMutation.isPending}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? accentColor : '#fff'}
              />
              <Text className="text-white text-base ml-4">
                {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </Text>
              {favoriteMutation.isPending && (
                <ActivityIndicator size="small" color={accentColor} style={{ marginLeft: 'auto' }} />
              )}
            </Pressable>

            <Pressable
              className="flex-row items-center py-4 border-b border-white/10"
              onPress={handleAddToPlaylist}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text className="text-white text-base ml-4">Add to Playlist</Text>
            </Pressable>

            <Pressable
              className="flex-row items-center py-4 border-b border-white/10"
              onPress={handlePlayNext}
            >
              <Ionicons name="play-forward" size={24} color="#fff" />
              <Text className="text-white text-base ml-4">Play Next</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
