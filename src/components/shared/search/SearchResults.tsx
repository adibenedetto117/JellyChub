import { useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import { getImageUrl } from '@/api';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { SkeletonSearchResults } from '@/components/shared/ui/Skeleton';
import { getDisplayName, getDisplayImageUrl, navigateToDetails } from '@/utils';
import type { SearchHint } from '@/types/jellyfin';

export interface SearchResultsProps {
  results: SearchHint[];
  isLoading: boolean;
  query: string;
  minQueryLength?: number;
  showResultsCount?: boolean;
  emptyStateText?: string;
  startTypingText?: string;
  returnPath?: string;
  style?: 'default' | 'modal';
}

export function SearchResults({
  results,
  isLoading,
  query,
  minQueryLength = 2,
  showResultsCount = true,
  emptyStateText,
  startTypingText,
  returnPath = '/(tabs)/search',
  style = 'default',
}: SearchResultsProps) {
  const { t } = useTranslation();
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  const getImageForItem = useCallback((item: SearchHint): string | null => {
    let rawImageUrl: string | null = null;
    if (item.PrimaryImageTag) {
      rawImageUrl = getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.PrimaryImageTag });
    } else if (item.AlbumId) {
      rawImageUrl = getImageUrl(item.AlbumId, 'Primary', { maxWidth: 120 });
    } else if (item.SeriesId) {
      rawImageUrl = getImageUrl(item.SeriesId, 'Primary', { maxWidth: 120 });
    } else {
      rawImageUrl = getImageUrl(item.Id, 'Primary', { maxWidth: 120 });
    }
    return getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  }, [hideMedia]);

  const handleItemPress = useCallback((item: SearchHint) => {
    const itemType = item.Type.toLowerCase();
    if (itemType === 'audio') {
      router.push(`/player/music?itemId=${item.Id}`);
    } else if (itemType === 'audiobook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else if (itemType === 'book') {
      const container = (item as any).Container?.toLowerCase() || '';
      const path = (item as any).Path?.toLowerCase() || '';
      const isPdf = container === 'pdf' || path.endsWith('.pdf');
      router.push(isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`);
    } else if (itemType === 'musicartist') {
      navigateToDetails('artist', item.Id, returnPath);
    } else if (itemType === 'musicalbum') {
      navigateToDetails('album', item.Id, returnPath);
    } else if (itemType === 'tvchannel') {
      router.push(`/player/livetv?channelId=${item.Id}`);
    } else if (itemType === 'program') {
      const channelId = (item as any).ChannelId || item.Id;
      router.push(`/player/livetv?channelId=${channelId}`);
    } else if (itemType === 'playlist') {
      navigateToDetails('playlist', item.Id, returnPath);
    } else {
      navigateToDetails(itemType, item.Id, returnPath);
    }
  }, [returnPath]);

  const getLabel = useCallback((item: SearchHint) => {
    const itemType = (item.Type || '').toLowerCase();
    switch (itemType) {
      case 'musicartist': return t('search.artistLabel');
      case 'musicalbum': return item.AlbumArtist ? t('search.albumBy', { artist: item.AlbumArtist }) : t('search.albumLabel');
      case 'audio': return item.AlbumArtist || item.Artists?.[0] || t('search.songLabel');
      case 'movie': return item.ProductionYear ? `${t('mediaTypes.movie')} (${item.ProductionYear})` : t('mediaTypes.movie');
      case 'series': return item.ProductionYear ? `${t('mediaTypes.series')} (${item.ProductionYear})` : t('mediaTypes.series');
      case 'episode': return item.Series || t('mediaTypes.episode');
      case 'tvchannel': return (item as any).ChannelNumber ? `Channel ${(item as any).ChannelNumber}` : 'Live TV Channel';
      case 'program': {
        const startDate = (item as any).StartDate;
        if (startDate) {
          const time = new Date(startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `Live TV - ${time}`;
        }
        return 'Live TV Program';
      }
      default: return item.Type;
    }
  }, [t]);

  const renderItem = useCallback(({ item }: { item: SearchHint }) => {
    const imageUrl = getImageForItem(item);
    const isSquare = ['musicalbum', 'audio', 'musicartist'].includes((item.Type || '').toLowerCase());
    const displayName = getDisplayName(item as any, hideMedia);

    if (style === 'modal') {
      return (
        <Pressable
          onPress={() => handleItemPress(item)}
          style={styles.modalItem}
        >
          <View style={[styles.modalImageContainer, { width: isSquare ? 48 : 40 }]}>
            <CachedImage
              uri={imageUrl}
              style={{ width: isSquare ? 48 : 40, height: 48 }}
              borderRadius={isSquare ? 4 : 3}
              fallbackText={(displayName || '?')[0].toUpperCase()}
              showSkeleton={false}
            />
          </View>
          <View style={styles.modalItemContent}>
            <Text style={styles.modalItemTitle} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.modalItemSubtitle} numberOfLines={1}>{getLabel(item)}</Text>
          </View>
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={() => handleItemPress(item)}
        style={styles.defaultItem}
      >
        <View
          style={[styles.defaultImageContainer, { width: isSquare ? 48 : 40 }]}
        >
          <CachedImage
            uri={imageUrl}
            style={{ width: isSquare ? 48 : 40, height: 48 }}
            borderRadius={8}
            fallbackText={displayName.charAt(0).toUpperCase()}
            showSkeleton={false}
          />
        </View>
        <View style={styles.defaultItemContent}>
          <Text style={styles.defaultItemTitle} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.defaultItemSubtitle} numberOfLines={1}>
            {getLabel(item)}
          </Text>
        </View>
      </Pressable>
    );
  }, [getImageForItem, handleItemPress, getLabel, hideMedia, style]);

  if (query.length < minQueryLength) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {startTypingText || t('search.startTyping')}
        </Text>
      </View>
    );
  }

  if (isLoading && results.length === 0) {
    return <SkeletonSearchResults count={8} />;
  }

  if (results.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {emptyStateText || t('common.noResults')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={(item) => item.Id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={style === 'modal' ? styles.modalListContent : styles.defaultListContent}
      ListHeaderComponent={
        showResultsCount && results.length > 0 ? (
          <Text style={styles.resultsCount}>
            {t('search.resultsCount', { count: results.length })}
          </Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },
  resultsCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 12,
  },
  defaultListContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  defaultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    marginBottom: 8,
  },
  defaultImageContainer: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  defaultItemContent: {
    flex: 1,
  },
  defaultItemTitle: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
  },
  defaultItemSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  modalListContent: {
    paddingHorizontal: 16,
    paddingBottom: 50,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalImageContainer: {
    height: 48,
    borderRadius: 4,
    backgroundColor: '#222',
    marginRight: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemTitle: {
    color: '#fff',
    fontSize: 15,
  },
  modalItemSubtitle: {
    color: '#777',
    fontSize: 13,
    marginTop: 2,
  },
});
