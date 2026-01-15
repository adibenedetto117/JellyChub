import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { PlayerControlId } from '@/types/player';
import { DEFAULT_PLAYER_CONTROLS_CONFIG, DEFAULT_PLAYER_CONTROLS_ORDER } from '@/types/player';

interface MoreOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  screenHeight: number;
  accentColor: string;
  controlsConfig?: Record<PlayerControlId, 'visible' | 'menu' | 'hidden'>;
  controlsOrder?: PlayerControlId[];
  // Control states
  selectedSubtitleIndex?: number;
  externalSubtitleCues: boolean;
  openSubtitlesApiKey?: string;
  videoPlaybackSpeed: number;
  streamingQuality: string;
  hasChapters: boolean;
  isEpisode: boolean;
  hasEpisodes: boolean;
  episodeInfo?: { season?: number; episode?: number };
  hasSleepTimer: boolean;
  controlsLocked: boolean;
  chromecastAvailable: boolean;
  chromecastConnected: boolean;
  externalPlayerAvailable: boolean;
  externalPlayerEnabled: boolean;
  hasStreamUrl: boolean;
  subtitleOffset: number;
  hasActiveSubtitles: boolean;
  // Callbacks
  onAudioSubtitleSelector: () => void;
  onSubtitleSearch: () => void;
  onSpeed: () => void;
  onQuality: () => void;
  onChapters: () => void;
  onEpisodes: () => void;
  onSleepTimer: () => void;
  onLock: () => void;
  onPiP: () => void;
  onCast: () => void;
  onExternalPlayer: () => void;
  onSubtitleStyle: () => void;
  onSubtitleOffset: () => void;
}

export function MoreOptionsModal({
  visible,
  onClose,
  screenHeight,
  accentColor,
  controlsConfig,
  controlsOrder,
  selectedSubtitleIndex,
  externalSubtitleCues,
  openSubtitlesApiKey,
  videoPlaybackSpeed,
  streamingQuality,
  hasChapters,
  isEpisode,
  hasEpisodes,
  episodeInfo,
  hasSleepTimer,
  controlsLocked,
  chromecastAvailable,
  chromecastConnected,
  externalPlayerAvailable,
  externalPlayerEnabled,
  hasStreamUrl,
  subtitleOffset,
  hasActiveSubtitles,
  onAudioSubtitleSelector,
  onSubtitleSearch,
  onSpeed,
  onQuality,
  onChapters,
  onEpisodes,
  onSleepTimer,
  onLock,
  onPiP,
  onCast,
  onExternalPlayer,
  onSubtitleStyle,
  onSubtitleOffset,
}: MoreOptionsModalProps) {
  if (!visible) return null;

  const config = controlsConfig ?? DEFAULT_PLAYER_CONTROLS_CONFIG;
  const order = controlsOrder ?? DEFAULT_PLAYER_CONTROLS_ORDER;

  const renderControlOption = (controlId: PlayerControlId) => {
    const placement = config[controlId];
    if (placement !== 'menu') return null;

    switch (controlId) {
      case 'audioSubs':
        return (
          <Pressable
            key={controlId}
            onPress={() => { onClose(); onAudioSubtitleSelector(); }}
            className="flex-row items-center py-3 border-b border-white/10"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={selectedSubtitleIndex !== undefined ? accentColor : '#fff'} />
            <Text className="text-white ml-3 flex-1">Audio & Subtitles</Text>
          </Pressable>
        );
      case 'subtitleSearch':
        if (!openSubtitlesApiKey) return null;
        return (
          <Pressable
            key={controlId}
            onPress={() => { onClose(); onSubtitleSearch(); }}
            className="flex-row items-center py-3 border-b border-white/10"
          >
            <Ionicons name="search-outline" size={20} color={externalSubtitleCues ? accentColor : '#fff'} />
            <Text className="text-white ml-3 flex-1">Search Subtitles</Text>
            {externalSubtitleCues && (
              <Text className="text-white/60 text-sm">Active</Text>
            )}
          </Pressable>
        );
      case 'speed':
        return (
          <Pressable
            key={controlId}
            onPress={() => { onClose(); onSpeed(); }}
            className="flex-row items-center py-3 border-b border-white/10"
          >
            <Ionicons name="speedometer-outline" size={20} color={videoPlaybackSpeed !== 1 ? accentColor : '#fff'} />
            <Text className="text-white ml-3 flex-1">Playback Speed</Text>
            <Text className="text-white/60 text-sm">{videoPlaybackSpeed}x</Text>
          </Pressable>
        );
      case 'quality':
        return (
          <Pressable
            key={controlId}
            onPress={() => { onClose(); onQuality(); }}
            className="flex-row items-center py-3 border-b border-white/10"
          >
            <Ionicons name="settings-outline" size={20} color={streamingQuality !== 'auto' ? accentColor : '#fff'} />
            <Text className="text-white ml-3 flex-1">Quality</Text>
            <Text className="text-white/60 text-sm">
              {streamingQuality === 'auto' ? 'Auto' : streamingQuality === 'original' ? 'Original' : streamingQuality}
            </Text>
          </Pressable>
        );
      case 'chapters':
        if (!hasChapters) return null;
        return (
          <Pressable
            key={controlId}
            onPress={() => { onClose(); onChapters(); }}
            className="flex-row items-center py-3 border-b border-white/10"
          >
            <Ionicons name="bookmark-outline" size={20} color="#fff" />
            <Text className="text-white ml-3">Chapters</Text>
          </Pressable>
        );
      case 'episodes':
        if (!isEpisode || !hasEpisodes) return null;
        return (
          <Pressable
            key={controlId}
            onPress={() => { onClose(); onEpisodes(); }}
            className="flex-row items-center py-3 border-b border-white/10"
          >
            <Ionicons name="tv-outline" size={20} color="#fff" />
            <Text className="text-white ml-3 flex-1">Episodes</Text>
            {episodeInfo && (
              <Text className="text-white/60 text-sm">S{episodeInfo.season} E{episodeInfo.episode}</Text>
            )}
          </Pressable>
        );
      case 'sleepTimer':
        return (
          <Pressable
            key={controlId}
            onPress={() => { onClose(); onSleepTimer(); }}
            className="flex-row items-center py-3 border-b border-white/10"
          >
            <Ionicons name="moon-outline" size={20} color={hasSleepTimer ? accentColor : '#fff'} />
            <Text className="text-white ml-3 flex-1">Sleep Timer</Text>
            {hasSleepTimer && (
              <Text className="text-white/60 text-sm">Active</Text>
            )}
          </Pressable>
        );
      case 'lock':
        return (
          <Pressable
            key={controlId}
            onPress={() => { onClose(); onLock(); }}
            className="flex-row items-center py-3 border-b border-white/10"
          >
            <Ionicons name={controlsLocked ? 'lock-closed' : 'lock-open-outline'} size={20} color={controlsLocked ? accentColor : '#fff'} />
            <Text className="text-white ml-3">{controlsLocked ? 'Unlock Controls' : 'Lock Controls'}</Text>
          </Pressable>
        );
      case 'pip':
        return (
          <Pressable
            key={controlId}
            onPress={() => { onClose(); onPiP(); }}
            className="flex-row items-center py-3 border-b border-white/10"
          >
            <Ionicons name="albums-outline" size={20} color="#fff" />
            <Text className="text-white ml-3">Picture-in-Picture</Text>
          </Pressable>
        );
      case 'cast':
        if (!chromecastAvailable) return null;
        return (
          <Pressable
            key={controlId}
            onPress={() => { onClose(); onCast(); }}
            className="flex-row items-center py-3 border-b border-white/10"
          >
            <Ionicons name={chromecastConnected ? 'tv' : 'tv-outline'} size={20} color={chromecastConnected ? accentColor : '#fff'} />
            <Text className="text-white ml-3">{chromecastConnected ? 'Cast Remote' : 'Cast'}</Text>
          </Pressable>
        );
      case 'externalPlayer':
        if (!externalPlayerAvailable || !externalPlayerEnabled || !hasStreamUrl) return null;
        return (
          <Pressable
            key={controlId}
            onPress={() => { onClose(); onExternalPlayer(); }}
            className="flex-row items-center py-3 border-b border-white/10"
          >
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text className="text-white ml-3">External Player</Text>
          </Pressable>
        );
      default:
        return null;
    }
  };

  return (
    <Pressable
      onPress={onClose}
      className="absolute inset-0 bg-black/80 items-center justify-center z-50"
    >
      <View
        className="bg-zinc-900 rounded-2xl p-6 w-80"
        style={{ maxHeight: screenHeight * 0.8 }}
      >
        <Text className="text-white text-lg font-bold mb-4 text-center">More Options</Text>
        <ScrollView
          showsVerticalScrollIndicator={true}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingBottom: 4 }}
        >
          {order.map(renderControlOption)}

          {openSubtitlesApiKey && (
            <Pressable
              onPress={() => { onClose(); onSubtitleSearch(); }}
              className="flex-row items-center py-3 border-b border-white/10"
            >
              <Ionicons name="search-outline" size={20} color="#fff" />
              <Text className="text-white ml-3">Search Subtitles</Text>
            </Pressable>
          )}

          {hasActiveSubtitles && (
            <>
              <Pressable
                onPress={() => { onClose(); onSubtitleStyle(); }}
                className="flex-row items-center py-3 border-b border-white/10"
              >
                <Ionicons name="color-palette-outline" size={20} color="#fff" />
                <Text className="text-white ml-3">Subtitle Style</Text>
              </Pressable>
              <Pressable
                onPress={() => { onClose(); onSubtitleOffset(); }}
                className="flex-row items-center py-3 border-b border-white/10"
              >
                <Ionicons name="time-outline" size={20} color={subtitleOffset !== 0 ? accentColor : '#fff'} />
                <Text className="text-white ml-3">
                  {subtitleOffset !== 0 ? `Sync: ${subtitleOffset > 0 ? '+' : ''}${(subtitleOffset / 1000).toFixed(1)}s` : 'Subtitle Sync'}
                </Text>
              </Pressable>
            </>
          )}

          <Pressable
            onPress={() => { onClose(); router.push('/settings/player-controls' as any); }}
            className="flex-row items-center py-3 border-b border-white/10"
          >
            <Ionicons name="options-outline" size={20} color="#fff" />
            <Text className="text-white ml-3">Customize Controls</Text>
          </Pressable>
        </ScrollView>

        <Pressable
          onPress={onClose}
          className="mt-4 py-3 rounded-lg bg-white/10 items-center"
        >
          <Text className="text-white font-medium">Close</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
