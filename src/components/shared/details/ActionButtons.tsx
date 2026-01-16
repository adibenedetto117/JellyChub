import { View, Pressable, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/shared/ui/Button';
import { DownloadIcon } from './DownloadIcon';
import { CheckIcon } from './CheckIcon';

interface ActionButtonsProps {
  type: string;
  hasProgress: boolean;
  hasNextUpProgress: boolean;
  hasSeasonProgress: boolean;
  nextUpEpisode: boolean;
  accentColor: string;
  isDownloading: boolean;
  isDownloaded: boolean;
  isDownloadInProgress: boolean;
  downloadProgress?: number;
  isFavorite: boolean;
  isFavoritePending: boolean;
  onPlay: (resume: boolean) => void;
  onShuffle: () => void;
  onDownload: () => void;
  onToggleFavorite: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
  t: (key: string) => string;
}

export function ActionButtons({
  type,
  hasProgress,
  hasNextUpProgress,
  hasSeasonProgress,
  nextUpEpisode,
  accentColor,
  isDownloading,
  isDownloaded,
  isDownloadInProgress,
  downloadProgress,
  isFavorite,
  isFavoritePending,
  onPlay,
  onShuffle,
  onDownload,
  onToggleFavorite,
  onEdit,
  canEdit,
  t,
}: ActionButtonsProps) {
  if (type === 'artist' || type === 'boxset') {
    return null;
  }

  const getPlayButtonTitle = () => {
    if (type === 'series') {
      return hasNextUpProgress ? t('details.continue') : (nextUpEpisode ? t('details.play') : t('details.viewSeasons'));
    }
    if (type === 'season') {
      return hasSeasonProgress ? t('details.continue') : t('details.play');
    }
    return hasProgress ? t('details.continue') : t('details.play');
  };

  const getResumeValue = () => {
    if (type === 'series') return hasNextUpProgress;
    if (type === 'season') return hasSeasonProgress;
    return hasProgress;
  };

  return (
    <View className="mt-5 flex-row gap-3">
      <View className="flex-1">
        <Button
          title={getPlayButtonTitle()}
          onPress={() => onPlay(getResumeValue())}
          fullWidth
        />
      </View>
      {(type === 'album' || type === 'playlist') && (
        <Pressable
          onPress={onShuffle}
          className="w-14 h-14 rounded-xl items-center justify-center"
          style={{ backgroundColor: accentColor + '20' }}
        >
          <Ionicons name="shuffle" size={24} color={accentColor} />
        </Pressable>
      )}
      {(type === 'movie' || type === 'episode' || type === 'book') && (
        <Pressable
          onPress={onDownload}
          disabled={isDownloading}
          className="w-14 h-14 rounded-xl items-center justify-center"
          style={{
            backgroundColor: isDownloaded
              ? '#22c55e20'
              : isDownloadInProgress
                ? accentColor + '40'
                : accentColor + '20',
          }}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : isDownloaded ? (
            <CheckIcon size={22} color="#22c55e" />
          ) : isDownloadInProgress ? (
            <View style={{ alignItems: 'center' }}>
              <DownloadIcon size={20} color={accentColor} />
              <Text style={{ color: accentColor, fontSize: 9, marginTop: 2 }}>
                {downloadProgress ?? 0}%
              </Text>
            </View>
          ) : (
            <DownloadIcon size={22} color={accentColor} />
          )}
        </Pressable>
      )}
      {(type === 'movie' || type === 'series') && (
        <Pressable
          onPress={onToggleFavorite}
          disabled={isFavoritePending}
          className="w-14 h-14 rounded-xl items-center justify-center"
          style={{
            backgroundColor: isFavorite ? accentColor + '30' : accentColor + '20',
          }}
        >
          {isFavoritePending ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? accentColor : 'rgba(255,255,255,0.8)'}
            />
          )}
        </Pressable>
      )}
      {canEdit && onEdit && (
        <Pressable
          onPress={onEdit}
          className="w-14 h-14 rounded-xl items-center justify-center"
          style={{ backgroundColor: accentColor + '20' }}
        >
          <Ionicons name="pencil" size={22} color={accentColor} />
        </Pressable>
      )}
    </View>
  );
}
