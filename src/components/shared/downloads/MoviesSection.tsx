import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DownloadCard } from './DownloadCard';
import type { DownloadItem } from '@/types';

interface MoviesSectionProps {
  movies: DownloadItem[];
  accentColor: string;
  onPlay: (item: DownloadItem) => void;
  onDelete: (item: DownloadItem) => void;
  hideMedia: boolean;
}

export const MoviesSection = memo(function MoviesSection({
  movies,
  accentColor,
  onPlay,
  onDelete,
  hideMedia,
}: MoviesSectionProps) {
  if (movies.length === 0) {
    return (
      <View style={styles.emptySection}>
        <Ionicons name="film-outline" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptySectionText}>No downloaded movies</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionContent}>
      {movies.map((item) => (
        <DownloadCard
          key={item.id}
          item={item}
          accentColor={accentColor}
          onPlay={() => onPlay(item)}
          onDelete={() => onDelete(item)}
          onPauseResume={() => {}}
          hideMedia={hideMedia}
        />
      ))}
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
});
