import { memo, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleHeader } from './CollapsibleHeader';
import { DownloadCard } from './DownloadCard';
import type { SeriesGroup } from './types';
import type { DownloadItem } from '@/types';

const PLACEHOLDER_SERIES = ['Drama Series', 'Comedy Show', 'Action Series', 'Mystery Show', 'Sci-Fi Series'];

interface TVShowsSectionProps {
  seriesGroups: SeriesGroup[];
  accentColor: string;
  onPlay: (item: DownloadItem) => void;
  onDelete: (item: DownloadItem) => void;
  hideMedia: boolean;
}

export const TVShowsSection = memo(function TVShowsSection({
  seriesGroups,
  accentColor,
  onPlay,
  onDelete,
  hideMedia,
}: TVShowsSectionProps) {
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());

  const toggleSeries = useCallback((seriesId: string) => {
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  }, []);

  const toggleSeason = useCallback((key: string) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (seriesGroups.length === 0) {
    return (
      <View style={styles.emptySection}>
        <Ionicons name="tv-outline" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptySectionText}>No downloaded TV shows</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionContent}>
      {seriesGroups.map((series, index) => {
        const isSeriesExpanded = expandedSeries.has(series.seriesId);
        const displaySeriesName = hideMedia
          ? PLACEHOLDER_SERIES[index % PLACEHOLDER_SERIES.length]
          : series.seriesName;
        return (
          <View key={series.seriesId} style={styles.groupContainer}>
            <CollapsibleHeader
              title={displaySeriesName}
              count={series.episodeCount}
              size={series.totalSize}
              expanded={isSeriesExpanded}
              onToggle={() => toggleSeries(series.seriesId)}
              accentColor={accentColor}
            />
            {isSeriesExpanded && (
              <Animated.View entering={FadeIn.duration(200)}>
                {series.seasons.map((season) => {
                  const seasonKey = `${series.seriesId}-${season.seasonNumber}`;
                  const isSeasonExpanded = expandedSeasons.has(seasonKey);
                  return (
                    <View key={seasonKey}>
                      <CollapsibleHeader
                        title={`Season ${season.seasonNumber}`}
                        count={season.episodes.length}
                        size={season.totalSize}
                        expanded={isSeasonExpanded}
                        onToggle={() => toggleSeason(seasonKey)}
                        accentColor={accentColor}
                        level={1}
                      />
                      {isSeasonExpanded && (
                        <Animated.View entering={FadeIn.duration(200)} style={styles.episodesList}>
                          {season.episodes.map((episode) => (
                            <DownloadCard
                              key={episode.id}
                              item={episode}
                              accentColor={accentColor}
                              onPlay={() => onPlay(episode)}
                              onDelete={() => onDelete(episode)}
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
  episodesList: {
    paddingLeft: 16,
    marginBottom: 8,
  },
});
