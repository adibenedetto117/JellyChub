import { View, Text, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { GestureDetector, GestureHandlerRootView, GestureType } from 'react-native-gesture-handler';
import { Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getDisplayName, getImageUrl } from '@/utils';

interface MobileMusicPlayerQueueProps {
  visible: boolean;
  onClose: () => void;
  gesture: GestureType;
  sheetStyle: any;
  playlists: any;
  item: any;
  albumArtUrl: string | null;
  accentColor: string;
  hideMedia: boolean;
  onSelectPlaylist: (playlistId: string) => void;
}

export function MobileMusicPlayerQueue({
  visible,
  onClose,
  gesture,
  sheetStyle,
  playlists,
  item,
  albumArtUrl,
  accentColor,
  hideMedia,
  onSelectPlaylist,
}: MobileMusicPlayerQueueProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <GestureDetector gesture={gesture}>
            <Animated.View style={[{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 40 }, sheetStyle]}>
              <View style={{ paddingTop: 12, paddingBottom: 16, alignItems: 'center' }}>
                <View style={{ width: 48, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
              </View>

              <View style={{ paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {albumArtUrl ? (
                    <Image
                      source={{ uri: albumArtUrl }}
                      style={{ width: 48, height: 48, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="musical-note" size={20} color="rgba(255,255,255,0.5)" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 2 }}>Add to playlist</Text>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }} numberOfLines={1}>
                      {getDisplayName(item, hideMedia) ?? 'Unknown'}
                    </Text>
                  </View>
                </View>
              </View>

              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {!playlists ? (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <ActivityIndicator color={accentColor} size="large" />
                  </View>
                ) : playlists.Items && playlists.Items.length > 0 ? (
                  playlists.Items.map((playlist: any) => {
                    const playlistImageUrl = playlist.ImageTags?.Primary
                      ? getImageUrl(playlist.Id, 'Primary', { maxWidth: 100, tag: playlist.ImageTags.Primary })
                      : null;

                    return (
                      <Pressable
                        key={playlist.Id}
                        onPress={() => onSelectPlaylist(playlist.Id)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 12,
                          paddingHorizontal: 24,
                          backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'transparent',
                        })}
                      >
                        <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginRight: 12 }}>
                          {playlistImageUrl ? (
                            <Image
                              source={{ uri: playlistImageUrl }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="list" size={24} color="rgba(255,255,255,0.4)" />
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }} numberOfLines={1}>{playlist.Name}</Text>
                          {playlist.UserData?.UnplayedItemCount !== undefined && (
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 }}>
                              {playlist.UserData.UnplayedItemCount} {playlist.UserData.UnplayedItemCount === 1 ? 'track' : 'tracks'}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="add-circle-outline" size={24} color="rgba(255,255,255,0.4)" />
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <Ionicons name="list" size={48} color="rgba(255,255,255,0.2)" />
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, marginTop: 12 }}>No playlists found</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 4 }}>Create a playlist in Jellyfin first</Text>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
