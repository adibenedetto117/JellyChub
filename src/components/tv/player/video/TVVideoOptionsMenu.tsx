import { View, StyleSheet } from 'react-native';
import { tvConstants } from '@/utils/platform';
import { TVFocusableButton } from '@/components/tv';

interface TVVideoOptionsMenuProps {
  onSubtitlePress?: () => void;
  onAudioPress?: () => void;
  onSpeedPress?: () => void;
  playbackSpeed?: number;
  hasActiveSubtitle?: boolean;
  onFocusChange?: (button: string) => void;
}

export function TVVideoOptionsMenu({
  onSubtitlePress,
  onAudioPress,
  onSpeedPress,
  playbackSpeed = 1,
  hasActiveSubtitle,
  onFocusChange,
}: TVVideoOptionsMenuProps) {
  return (
    <View style={styles.container}>
      {onSubtitlePress && (
        <TVFocusableButton
          icon="text"
          onPress={onSubtitlePress}
          size="small"
          active={hasActiveSubtitle}
          onFocus={() => onFocusChange?.('subtitle')}
          accessibilityLabel="Subtitles"
        />
      )}
      {onAudioPress && (
        <TVFocusableButton
          icon="volume-high"
          onPress={onAudioPress}
          size="small"
          onFocus={() => onFocusChange?.('audio')}
          accessibilityLabel="Audio tracks"
        />
      )}
      {onSpeedPress && (
        <TVFocusableButton
          label={`${playbackSpeed}x`}
          onPress={onSpeedPress}
          size="small"
          onFocus={() => onFocusChange?.('speed')}
          accessibilityLabel={`Playback speed ${playbackSpeed}x`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: tvConstants.buttonGap,
  },
});
