import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { PlayerControlId } from '@/types/player';
import { DEFAULT_PLAYER_CONTROLS_CONFIG, DEFAULT_PLAYER_CONTROLS_ORDER } from '@/types/player';

interface ControlIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isActive?: boolean;
  accentColor: string;
}

export function ControlIconButton({ icon, onPress, isActive, accentColor }: ControlIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="w-10 h-10 rounded-full items-center justify-center mx-1"
      style={{ backgroundColor: isActive ? accentColor + '60' : 'rgba(0,0,0,0.5)' }}
    >
      <Ionicons name={icon} size={21} color={isActive ? accentColor : '#fff'} />
    </Pressable>
  );
}

interface VideoPlayerHeaderProps {
  title: string;
  subtitle?: string | null;
  isPortrait: boolean;
  accentColor: string;
  controlsConfig?: Record<PlayerControlId, 'visible' | 'menu' | 'hidden'>;
  controlsOrder?: PlayerControlId[];
  onClose: () => void;
  onMoreOptions: () => void;
  // Control-specific props
  selectedSubtitleIndex?: number;
  externalSubtitleCues: boolean;
  openSubtitlesApiKey?: string;
  isEpisode: boolean;
  hasEpisodes: boolean;
  chromecastAvailable: boolean;
  chromecastConnected: boolean;
  videoPlaybackSpeed: number;
  streamingQuality: string;
  hasChapters: boolean;
  hasSleepTimer: boolean;
  controlsLocked: boolean;
  externalPlayerAvailable: boolean;
  externalPlayerEnabled: boolean;
  hasStreamUrl: boolean;
  // Callbacks
  onAudioSubtitleSelector: () => void;
  onSubtitleSearch: () => void;
  onEpisodeList: () => void;
  onChromecast: () => void;
  onPiP: () => void;
  onSpeed: () => void;
  onQuality: () => void;
  onChapters: () => void;
  onSleepTimer: () => void;
  onLock: () => void;
  onExternalPlayer: () => void;
}

export function VideoPlayerHeader({
  title,
  subtitle,
  isPortrait,
  accentColor,
  controlsConfig,
  controlsOrder,
  onClose,
  onMoreOptions,
  selectedSubtitleIndex,
  externalSubtitleCues,
  openSubtitlesApiKey,
  isEpisode,
  hasEpisodes,
  chromecastAvailable,
  chromecastConnected,
  videoPlaybackSpeed,
  streamingQuality,
  hasChapters,
  hasSleepTimer,
  controlsLocked,
  externalPlayerAvailable,
  externalPlayerEnabled,
  hasStreamUrl,
  onAudioSubtitleSelector,
  onSubtitleSearch,
  onEpisodeList,
  onChromecast,
  onPiP,
  onSpeed,
  onQuality,
  onChapters,
  onSleepTimer,
  onLock,
  onExternalPlayer,
}: VideoPlayerHeaderProps) {
  const insets = useSafeAreaInsets();

  const config = controlsConfig ?? DEFAULT_PLAYER_CONTROLS_CONFIG;
  const order = controlsOrder ?? DEFAULT_PLAYER_CONTROLS_ORDER;

  const renderControl = (controlId: PlayerControlId) => {
    const placement = config[controlId];
    if (placement !== 'visible') return null;

    switch (controlId) {
      case 'audioSubs':
        return (
          <ControlIconButton
            key={controlId}
            icon="chatbubble-ellipses-outline"
            onPress={onAudioSubtitleSelector}
            isActive={selectedSubtitleIndex !== undefined || externalSubtitleCues}
            accentColor={accentColor}
          />
        );
      case 'subtitleSearch':
        if (!openSubtitlesApiKey) return null;
        return (
          <ControlIconButton
            key={controlId}
            icon="search-outline"
            onPress={onSubtitleSearch}
            isActive={externalSubtitleCues}
            accentColor={accentColor}
          />
        );
      case 'episodes':
        if (!isEpisode || !hasEpisodes) return null;
        return (
          <ControlIconButton
            key={controlId}
            icon="list-outline"
            onPress={onEpisodeList}
            accentColor={accentColor}
          />
        );
      case 'cast':
        if (!chromecastAvailable) return null;
        return (
          <ControlIconButton
            key={controlId}
            icon={chromecastConnected ? 'tv' : 'tv-outline'}
            onPress={onChromecast}
            isActive={chromecastConnected}
            accentColor={accentColor}
          />
        );
      case 'pip':
        return (
          <ControlIconButton
            key={controlId}
            icon="albums-outline"
            onPress={onPiP}
            accentColor={accentColor}
          />
        );
      case 'speed':
        return (
          <ControlIconButton
            key={controlId}
            icon="speedometer-outline"
            onPress={onSpeed}
            isActive={videoPlaybackSpeed !== 1}
            accentColor={accentColor}
          />
        );
      case 'quality':
        return (
          <ControlIconButton
            key={controlId}
            icon="settings-outline"
            onPress={onQuality}
            isActive={streamingQuality !== 'auto'}
            accentColor={accentColor}
          />
        );
      case 'chapters':
        if (!hasChapters) return null;
        return (
          <ControlIconButton
            key={controlId}
            icon="bookmark-outline"
            onPress={onChapters}
            accentColor={accentColor}
          />
        );
      case 'sleepTimer':
        return (
          <ControlIconButton
            key={controlId}
            icon="moon-outline"
            onPress={onSleepTimer}
            isActive={hasSleepTimer}
            accentColor={accentColor}
          />
        );
      case 'lock':
        return (
          <ControlIconButton
            key={controlId}
            icon={controlsLocked ? 'lock-closed' : 'lock-open-outline'}
            onPress={onLock}
            isActive={controlsLocked}
            accentColor={accentColor}
          />
        );
      case 'externalPlayer':
        if (!externalPlayerAvailable || !externalPlayerEnabled || !hasStreamUrl) return null;
        return (
          <ControlIconButton
            key={controlId}
            icon="open-outline"
            onPress={onExternalPlayer}
            accentColor={accentColor}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View
      className="absolute top-0 left-0 right-0"
      style={{
        paddingTop: isPortrait ? insets.top + 8 : 20,
        paddingBottom: 8,
        paddingLeft: Math.max(48, insets.left + 24),
        paddingRight: Math.max(48, insets.right + 24),
      }}
    >
      <View className="flex-row items-center">
        {/* Title area - left side */}
        <View className="flex-1 mr-4">
          <Text className="text-white text-lg font-bold" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text className="text-white/60 text-sm mt-1" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Top-right controls */}
        <View className="flex-row items-center">
          {order.map(renderControl)}

          {/* Always show More Options button */}
          <ControlIconButton
            icon="ellipsis-horizontal"
            onPress={onMoreOptions}
            accentColor={accentColor}
          />

          <Pressable
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-11 h-11 rounded-full bg-white/15 items-center justify-center active:bg-white/30 ml-1"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
