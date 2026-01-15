import { memo, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleHeader } from './CollapsibleHeader';
import { DownloadCard } from './DownloadCard';
import type { ArtistGroup } from './types';
import type { DownloadItem } from '@/types';

const PLACEHOLDER_ARTISTS = ['Artist One', 'Artist Two', 'Artist Three', 'Artist Four', 'Artist Five'];
const PLACEHOLDER_ALBUMS = ['Album One', 'Album Two', 'Album Three', 'Album Four', 'Album Five'];

interface MusicSectionProps {
  artistGroups: ArtistGroup[];
  accentColor: string;
  onPlay: (item: DownloadItem) => void;
  onDelete: (item: DownloadItem) => void;
  hideMedia: boolean;
}

export const MusicSection = memo(function MusicSection({
  artistGroups,
  accentColor,
  onPlay,
  onDelete,
  hideMedia,
}: MusicSectionProps) {
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set());
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());

  const toggleArtist = useCallback((artistName: string) => {
    setExpandedArtists((prev) => {
      const next = new Set(prev);
      if (next.has(artistName)) {
        next.delete(artistName);
      } else {
        next.add(artistName);
      }
      return next;
    });
  }, []);

  const toggleAlbum = useCallback((key: string) => {
    setExpandedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (artistGroups.length === 0) {
    return (
      <View style={styles.emptySection}>
        <Ionicons name="musical-notes-outline" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptySectionText}>No downloaded music</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionContent}>
      {artistGroups.map((artist, artistIndex) => {
        const isArtistExpanded = expandedArtists.has(artist.artistName);
        const displayArtistName = hideMedia
          ? PLACEHOLDER_ARTISTS[artistIndex % PLACEHOLDER_ARTISTS.length]
          : artist.artistName;
        return (
          <View key={artist.artistName} style={styles.groupContainer}>
            <CollapsibleHeader
              title={displayArtistName}
              count={artist.trackCount}
              size={artist.totalSize}
              expanded={isArtistExpanded}
              onToggle={() => toggleArtist(artist.artistName)}
              accentColor={accentColor}
            />
            {isArtistExpanded && (
              <Animated.View entering={FadeIn.duration(200)}>
                {artist.albums.map((album, albumIndex) => {
                  const albumKey = `${artist.artistName}-${album.albumId}`;
                  const isAlbumExpanded = expandedAlbums.has(albumKey);
                  const displayAlbumName = hideMedia
                    ? PLACEHOLDER_ALBUMS[albumIndex % PLACEHOLDER_ALBUMS.length]
                    : album.albumName;
                  return (
                    <View key={albumKey}>
                      <CollapsibleHeader
                        title={displayAlbumName}
                        count={album.tracks.length}
                        size={album.totalSize}
                        expanded={isAlbumExpanded}
                        onToggle={() => toggleAlbum(albumKey)}
                        accentColor={accentColor}
                        level={1}
                      />
                      {isAlbumExpanded && (
                        <Animated.View entering={FadeIn.duration(200)} style={styles.tracksList}>
                          {album.tracks.map((track) => (
                            <DownloadCard
                              key={track.id}
                              item={track}
                              accentColor={accentColor}
                              onPlay={() => onPlay(track)}
                              onDelete={() => onDelete(track)}
                              onPauseResume={() => {}}
                              compact
                              hideMedia={hideMedia}
                            />
                          ))}
                        </Animated.View>
                      )}
                    </View>
                  );
                })}
              </Animated.View>
            )}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  sectionContent: {
    marginTop: 8,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptySectionText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 12,
  },
  groupContainer: {
    marginBottom: 4,
  },
  tracksList: {
    paddingLeft: 16,
    marginBottom: 8,
  },
});
