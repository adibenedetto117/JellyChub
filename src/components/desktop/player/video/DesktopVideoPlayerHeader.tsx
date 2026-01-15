import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DesktopVideoPlayerHeaderProps {
  title: string;
  subtitle?: string | null;
  isEpisode: boolean;
  hasEpisodes: boolean;
  hasChapters: boolean;
  videoPlaybackSpeed: number;
  isFullscreen: boolean;
  onClose: () => void;
  onEpisodeList: () => void;
  onAudioSubtitleSelector: () => void;
  onChapterList: () => void;
  onSpeedSelector: () => void;
  onToggleFullscreen: () => void;
}

export function DesktopVideoPlayerHeader({
  title,
  subtitle,
  isEpisode,
  hasEpisodes,
  hasChapters,
  videoPlaybackSpeed,
  isFullscreen,
  onClose,
  onEpisodeList,
  onAudioSubtitleSelector,
  onChapterList,
  onSpeedSelector,
  onToggleFullscreen,
}: DesktopVideoPlayerHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onClose} style={styles.closeButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>

      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>

      <View style={styles.headerActions}>
        {isEpisode && hasEpisodes && (
          <Pressable onPress={onEpisodeList} style={styles.headerButton}>
            <Ionicons name="list" size={20} color="#fff" />
          </Pressable>
        )}
        <Pressable onPress={onAudioSubtitleSelector} style={styles.headerButton}>
          <Ionicons name="text" size={20} color="#fff" />
        </Pressable>
        {hasChapters && (
          <Pressable onPress={onChapterList} style={styles.headerButton}>
            <Ionicons name="bookmark" size={20} color="#fff" />
          </Pressable>
        )}
        <Pressable onPress={onSpeedSelector} style={styles.headerButton}>
          <Text style={styles.speedText}>{videoPlaybackSpeed}x</Text>
        </Pressable>
        <Pressable onPress={onToggleFullscreen} style={styles.headerButton}>
          <Ionicons name={isFullscreen ? 'contract' : 'expand'} size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
