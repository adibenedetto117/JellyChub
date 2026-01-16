import { View, Text, Pressable, Modal, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import { getDisplayName } from '@/utils';
import { SleepTimerSelector, SleepTimerIndicator } from '@/components/shared/player';
import { MobileMusicPlayerInfo } from './MobileMusicPlayerInfo';
import { MobileMusicPlayerProgress } from './MobileMusicPlayerProgress';
import { MobileMusicPlayerControls } from './MobileMusicPlayerControls';
import { MobileMusicPlayerQueue } from './MobileMusicPlayerQueue';
import type { MusicPlayerCore } from '@/hooks';

interface MobileMusicPlayerProps {
  core: MusicPlayerCore;
}

export function MobileMusicPlayer({ core }: MobileMusicPlayerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  const {
    item,
    albumArtUrl,
    displayName,
    albumArtist,
    albumName,
    playerState,
    progressValue,
    showLoading,
    isSeeking,
    shuffleMode,
    repeatMode,
    lyrics,
    lyricsLoading,
    currentLyricIndex,
    showLyricsView,
    lyricsScrollRef,
    isFavorite,
    isDownloaded,
    isDownloading,
    downloadProgress,
    playlists,
    showPlaylistPicker,
    showOptions,
    musicSleepTimer,
    showSleepTimer,
    setShowSleepTimer,
    addedToast,
    accentColor,
    albumScale,
    playButtonScale,
    translateY,
    modalTranslateY,
    playlistPickerTranslateY,
    seekGesture,
    dismissGesture,
    modalGesture,
    playlistPickerGesture,
    handlePlayPause,
    handleSkipPrevious,
    handleSkipNext,
    handleToggleShuffle,
    handleToggleRepeat,
    handleToggleFavorite,
    handleToggleLyrics,
    handleSeekToLyric,
    handleGoToAlbum,
    handleGoToArtist,
    handleAddToPlaylist,
    handleSelectPlaylist,
    handlePlayNext,
    handleInstantMix,
    handleDownload,
    handleSelectSleepTimer,
    handleClose,
    handleStopAndClose,
    openOptions,
    closeOptions,
    closePlaylistPicker,
    getDisplayPosition,
    localProgress,
  } = core;

  const containerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateY.value, [0, 150], [1, 0], 'clamp');
    return {
      transform: [{ translateY: translateY.value }],
      opacity,
    };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateY.value, [0, 100], [1, 0], 'clamp');
    return { opacity };
  });

  const albumStyle = useAnimatedStyle(() => ({
    transform: [{ scale: albumScale.value }],
  }));

  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

  const modalSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  const playlistPickerSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: playlistPickerTranslateY.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {albumArtUrl && (
          <Image
            source={{ uri: albumArtUrl }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
            blurRadius={80}
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </View>

      <View style={{ flex: 1, paddingTop: Math.max(insets.top, 44) + 8, paddingBottom: Math.max(insets.bottom, 20) + 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 }}>
          <Pressable onPress={handleClose} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('player.nowPlaying')}
              </Text>
              {albumName ? (
                <Pressable onPress={handleGoToAlbum} disabled={!(item as any)?.AlbumId}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                    {albumName}
                  </Text>
                </Pressable>
              ) : null}
              {musicSleepTimer && (
                <View style={{ marginTop: 4 }}>
                  <SleepTimerIndicator
                    sleepTimer={musicSleepTimer}
                    onPress={() => setShowSleepTimer(true)}
                  />
                </View>
              )}
            </View>

            <Pressable onPress={openOptions} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            </Pressable>
          </View>

          <MobileMusicPlayerInfo
            showLyricsView={showLyricsView}
            lyrics={lyrics}
            lyricsLoading={lyricsLoading}
            currentLyricIndex={currentLyricIndex}
            lyricsScrollRef={lyricsScrollRef}
            accentColor={accentColor}
            albumArtUrl={albumArtUrl}
            displayName={displayName}
            albumArtist={albumArtist}
            isFavorite={isFavorite}
            item={item}
            albumStyle={albumStyle}
            onToggleFavorite={handleToggleFavorite}
            onGoToArtist={handleGoToArtist}
            onSeekToLyric={handleSeekToLyric}
          />

          <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Direct Stream</Text>
              </View>
            </View>

            <MobileMusicPlayerProgress
              progressValue={progressValue}
              isSeeking={isSeeking}
              accentColor={accentColor}
              seekGesture={seekGesture}
              getDisplayPosition={getDisplayPosition}
              duration={localProgress.duration}
            />

            <MobileMusicPlayerControls
              playerState={playerState}
              showLoading={showLoading}
              shuffleMode={shuffleMode}
              repeatMode={repeatMode}
              showLyricsView={showLyricsView}
              musicSleepTimer={musicSleepTimer}
              accentColor={accentColor}
              playButtonStyle={playButtonStyle}
              onPlayPause={handlePlayPause}
              onSkipPrevious={handleSkipPrevious}
              onSkipNext={handleSkipNext}
              onToggleShuffle={handleToggleShuffle}
              onToggleRepeat={handleToggleRepeat}
              onToggleLyrics={handleToggleLyrics}
              onShowSleepTimer={() => setShowSleepTimer(true)}
            />
          </View>
        </View>

        <Modal
          visible={showOptions}
          transparent
          animationType="fade"
          onRequestClose={closeOptions}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <Pressable style={{ flex: 1 }} onPress={closeOptions} />
              <GestureDetector gesture={modalGesture}>
                <Animated.View style={[{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }, modalSheetStyle]}>
                  <View style={{ paddingTop: 12, paddingBottom: 20, alignItems: 'center' }}>
                    <View style={{ width: 48, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
                  </View>

                  <View style={{ paddingHorizontal: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                      {albumArtUrl ? (
                        <Image
                          source={{ uri: albumArtUrl }}
                          style={{ width: 56, height: 56, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="musical-note" size={24} color="rgba(255,255,255,0.5)" />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 18 }} numberOfLines={1}>
                          {getDisplayName(item, hideMedia) ?? 'Unknown'}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.6)' }} numberOfLines={1}>{albumArtist}</Text>
                      </View>
                    </View>

                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                      onPress={() => {
                        closeOptions();
                        setTimeout(handleToggleFavorite, 100);
                      }}
                    >
                      <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? accentColor : "#fff"} />
                      <Text style={{ color: '#fff', fontSize: 16, marginLeft: 16 }}>
                        {isFavorite ? t('player.removeFromFavorites') : t('player.addToFavorites')}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                      onPress={handleAddToPlaylist}
                    >
                      <Ionicons name="add" size={24} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 16, marginLeft: 16 }}>{t('player.addToPlaylist')}</Text>
                    </Pressable>

                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                      onPress={handlePlayNext}
                    >
                      <Ionicons name="play-forward" size={24} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 16, marginLeft: 16 }}>Play Next</Text>
                    </Pressable>

                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                      onPress={handleInstantMix}
                    >
                      <Ionicons name="sparkles" size={24} color={accentColor} />
                      <Text style={{ color: accentColor, fontSize: 16, marginLeft: 16 }}>
                        {t('player.startInstantMix')}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                      onPress={handleDownload}
                      disabled={isDownloading}
                    >
                      <Ionicons
                        name={isDownloaded ? "checkmark-circle" : isDownloading ? "cloud-download" : "download-outline"}
                        size={24}
                        color={isDownloaded ? "#4CAF50" : isDownloading ? accentColor : "#fff"}
                      />
                      <Text style={{ color: isDownloaded ? "#4CAF50" : '#fff', fontSize: 16, marginLeft: 16 }}>
                        {isDownloaded ? t('player.downloaded') : isDownloading ? `${t('player.downloading')} ${Math.round(downloadProgress)}%` : t('player.download')}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                      onPress={handleGoToAlbum}
                    >
                      <Ionicons name="disc-outline" size={24} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 16, marginLeft: 16 }}>{t('player.goToAlbum')}</Text>
                    </Pressable>

                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                      onPress={handleGoToArtist}
                    >
                      <Ionicons name="person-outline" size={24} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 16, marginLeft: 16 }}>{t('player.goToArtist')}</Text>
                    </Pressable>

                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}
                      onPress={() => {
                        closeOptions();
                        setTimeout(handleStopAndClose, 100);
                      }}
                    >
                      <Ionicons name="stop-circle-outline" size={24} color="#ff4444" />
                      <Text style={{ color: '#ff4444', fontSize: 16, marginLeft: 16 }}>Stop Playback</Text>
                    </Pressable>

                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}>
                      <Ionicons name="radio-outline" size={24} color="rgba(255,255,255,0.5)" />
                      <View style={{ marginLeft: 16 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>{t('player.streamingQuality')}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Direct Stream</Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              </GestureDetector>
            </View>
          </GestureHandlerRootView>
        </Modal>

        <MobileMusicPlayerQueue
          visible={showPlaylistPicker}
          onClose={closePlaylistPicker}
          gesture={playlistPickerGesture}
          sheetStyle={playlistPickerSheetStyle}
          playlists={playlists}
          item={item}
          albumArtUrl={albumArtUrl}
          accentColor={accentColor}
          hideMedia={hideMedia}
          onSelectPlaylist={handleSelectPlaylist}
        />

        {addedToast && (
          <View style={{ position: 'absolute', bottom: 100, left: 24, right: 24, alignItems: 'center' }}>
            <View style={{ backgroundColor: '#1a1a1a', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color={accentColor} />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500', marginLeft: 10 }}>Added to {addedToast}</Text>
            </View>
          </View>
        )}

        <SleepTimerSelector
          visible={showSleepTimer}
          onClose={() => setShowSleepTimer(false)}
          onSelectTimer={handleSelectSleepTimer}
          currentTimer={musicSleepTimer}
          isEpisode={false}
        />
    </View>
  );
}
