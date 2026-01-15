import { View, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from '@/providers';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTVRemoteHandler } from '@/hooks';
import type { AudiobookPlayerCore } from '@/hooks';
import { TVAudiobookInfo } from './TVAudiobookInfo';
import { TVAudiobookControls } from './TVAudiobookControls';
import { TVAudiobookProgress } from './TVAudiobookProgress';

interface TVAudiobookPlayerProps {
  core: AudiobookPlayerCore;
}

export function TVAudiobookPlayer({ core }: TVAudiobookPlayerProps) {
  const { t } = useTranslation();

  const {
    coverUrl,
    displayName,
    displayAuthor,
    playerState,
    progressValue,
    remainingTime,
    chapters,
    currentChapter,
    audiobookSpeed,
    sleepTimeRemaining,
    accentColor,
    handlePlayPause,
    handleSkip,
    handleMinimize,
    getDisplayPosition,
  } = core;

  useTVRemoteHandler({
    onSelect: handlePlayPause,
    onMenu: handleMinimize,
    onLeft: () => handleSkip(-10),
    onRight: () => handleSkip(10),
    onLongLeft: () => handleSkip(-30),
    onLongRight: () => handleSkip(30),
  });

  return (
    <View style={styles.container}>
      {coverUrl && (
        <Image
          source={{ uri: coverUrl }}
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
          {sleepTimeRemaining && sleepTimeRemaining > 0 && (
            <View style={styles.sleepIndicator}>
              <Ionicons name="moon" size={16} color={accentColor} />
              <Text style={[styles.sleepText, { color: accentColor }]}>
                {sleepTimeRemaining}m
              </Text>
            </View>
          )}
        </View>

        <View style={styles.mainContent}>
          <TVAudiobookInfo
            coverUrl={coverUrl}
            displayName={displayName}
            displayAuthor={displayAuthor}
            currentChapter={currentChapter}
            chapters={chapters}
            accentColor={accentColor}
          />
        </View>

        <View style={styles.controlsSection}>
          <TVAudiobookProgress
            progressValue={progressValue}
            accentColor={accentColor}
            remainingTime={remainingTime}
            getDisplayPosition={getDisplayPosition}
          />

          <TVAudiobookControls
            playerState={playerState}
            audiobookSpeed={audiobookSpeed}
            accentColor={accentColor}
            handlePlayPause={handlePlayPause}
            handleSkip={handleSkip}
          />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  nowPlaying: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sleepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sleepText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
  },
  controlsSection: {
    paddingHorizontal: 60,
    paddingBottom: 40,
  },
});
