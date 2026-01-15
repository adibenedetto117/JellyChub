import { View, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from '@/providers';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTVRemoteHandler } from '@/hooks';
import type { MusicPlayerCore } from '@/hooks';
import { TVMusicPlayerInfo } from './TVMusicPlayerInfo';
import { TVMusicPlayerProgress } from './TVMusicPlayerProgress';
import { TVMusicPlayerControls } from './TVMusicPlayerControls';
import { TVMusicPlayerQueue } from './TVMusicPlayerQueue';

interface TVMusicPlayerProps {
  core: MusicPlayerCore;
}

export function TVMusicPlayer({ core }: TVMusicPlayerProps) {
  const { t } = useTranslation();

  const {
    albumArtUrl,
    displayName,
    albumArtist,
    albumName,
    playerState,
    progressValue,
    showLoading,
    shuffleMode,
    repeatMode,
    isFavorite,
    accentColor,
    getDisplayPosition,
    localProgress,
    handlePlayPause,
    handleSkipPrevious,
    handleSkipNext,
    handleToggleShuffle,
    handleToggleRepeat,
    handleToggleFavorite,
    handleClose,
  } = core;

  useTVRemoteHandler({
    onSelect: handlePlayPause,
    onMenu: handleClose,
    onLeft: handleSkipPrevious,
    onRight: handleSkipNext,
    onUp: handleToggleFavorite,
    onDown: handleToggleRepeat,
    onLongLeft: handleToggleShuffle,
  });

  return (
    <View style={styles.container}>
      {albumArtUrl && (
        <Image
          source={{ uri: albumArtUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          blurRadius={100}
        />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.98)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.nowPlaying}>{t('player.nowPlaying')}</Text>
          {albumName && (
            <Text style={styles.albumName}>{albumName}</Text>
          )}
        </View>

        <View style={styles.mainContent}>
          <TVMusicPlayerInfo
            albumArtUrl={albumArtUrl}
            displayName={displayName}
            albumArtist={albumArtist}
            isFavorite={isFavorite}
            accentColor={accentColor}
          />

          <View style={styles.infoSection}>
            <TVMusicPlayerProgress
              progressValue={progressValue}
              position={getDisplayPosition()}
              duration={localProgress.duration}
              accentColor={accentColor}
            />

            <TVMusicPlayerControls
              playerState={playerState}
              showLoading={showLoading}
              shuffleMode={shuffleMode}
              repeatMode={repeatMode}
              accentColor={accentColor}
              onPlayPause={handlePlayPause}
              onSkipPrevious={handleSkipPrevious}
              onSkipNext={handleSkipNext}
              onToggleShuffle={handleToggleShuffle}
              onToggleRepeat={handleToggleRepeat}
            />

            <TVMusicPlayerQueue />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  nowPlaying: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  albumName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 60,
    paddingBottom: 40,
    gap: 60,
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 40,
  },
});
