import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { LiveTvProgram } from '@/types/livetv';

interface DesktopLiveTvControlsProps {
  controlsStyle: { opacity: number };
  showControls: boolean;
  accentColor: string;
  isFavorite: boolean;
  isFullscreen: boolean;
  showChannelList: boolean;
  showEPG: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
  onToggleEPG: () => void;
  onToggleChannelList: () => void;
  onToggleFullscreen: () => void;
  onPrevChannel: () => void;
  onNextChannel: () => void;
  currentProgram?: LiveTvProgram | null;
  channelInfoContent?: React.ReactNode;
  channelDisplayContent?: React.ReactNode;
}

export function DesktopLiveTvControls({
  controlsStyle,
  showControls,
  accentColor,
  isFavorite,
  isFullscreen,
  showChannelList,
  showEPG,
  onBack,
  onToggleFavorite,
  onToggleEPG,
  onToggleChannelList,
  onToggleFullscreen,
  onPrevChannel,
  onNextChannel,
  currentProgram,
  channelInfoContent,
  channelDisplayContent,
}: DesktopLiveTvControlsProps) {
  const { t } = useTranslation();

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProgramProgress = (startDate: string, endDate: string) => {
    const now = Date.now();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const duration = end - start;
    const elapsed = now - start;
    return Math.max(0, Math.min(100, (elapsed / duration) * 100));
  };

  return (
    <Animated.View
      style={[styles.controlsOverlay, controlsStyle]}
      pointerEvents={showControls ? 'auto' : 'none'}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'transparent']}
        style={styles.topGradient}
      />

      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        <View style={styles.channelInfoHeader}>{channelInfoContent}</View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={onToggleFavorite}
            style={({ hovered }: { hovered?: boolean }) => [
              styles.headerButton,
              hovered && styles.headerButtonHovered,
            ]}
          >
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={20}
              color={isFavorite ? '#FFD700' : '#fff'}
            />
          </Pressable>
          <Pressable
            onPress={onToggleEPG}
            style={({ hovered }: { hovered?: boolean }) => [
              styles.headerButton,
              hovered && styles.headerButtonHovered,
              showEPG && { backgroundColor: accentColor + '40' },
            ]}
          >
            <Ionicons name="calendar-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable
            onPress={onToggleChannelList}
            style={({ hovered }: { hovered?: boolean }) => [
              styles.headerButton,
              hovered && styles.headerButtonHovered,
              showChannelList && { backgroundColor: accentColor + '40' },
            ]}
          >
            <Ionicons name="list" size={20} color="#fff" />
          </Pressable>
          <Pressable
            onPress={onToggleFullscreen}
            style={({ hovered }: { hovered?: boolean }) => [
              styles.headerButton,
              hovered && styles.headerButtonHovered,
            ]}
          >
            <Ionicons
              name={isFullscreen ? 'contract' : 'expand'}
              size={20}
              color="#fff"
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.centerControls}>
        <Pressable
          onPress={onPrevChannel}
          style={({ hovered }: { hovered?: boolean }) => [
            styles.navButton,
            hovered && styles.navButtonHovered,
          ]}
        >
          <Ionicons name="chevron-back" size={32} color="#fff" />
        </Pressable>

        {channelDisplayContent}

        <Pressable
          onPress={onNextChannel}
          style={({ hovered }: { hovered?: boolean }) => [
            styles.navButton,
            hovered && styles.navButtonHovered,
          ]}
        >
          <Ionicons name="chevron-forward" size={32} color="#fff" />
        </Pressable>
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
        style={styles.bottomGradient}
      />

      <View style={styles.bottomControls}>
        {currentProgram && (
          <View style={styles.programInfo}>
            <Text style={styles.programTitle} numberOfLines={1}>
              {currentProgram.Name}
            </Text>
            <View style={styles.programMeta}>
              <Text style={styles.programTime}>
                {formatTime(currentProgram.StartDate)} -{' '}
                {formatTime(currentProgram.EndDate)}
              </Text>
              {currentProgram.Overview && (
                <Text style={styles.programDescription} numberOfLines={2}>
                  {currentProgram.Overview}
                </Text>
              )}
            </View>
            <View style={styles.programProgressContainer}>
              <View
                style={[
                  styles.programProgressBar,
                  {
                    width: `${getProgramProgress(
                      currentProgram.StartDate,
                      currentProgram.EndDate
                    )}%`,
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.volumeHint}>
          <Ionicons name="volume-high" size={16} color="rgba(255,255,255,0.5)" />
          <Text style={styles.hintText}>Ctrl+up/down</Text>
        </View>
      </View>

      <View style={styles.shortcutsHint}>
        <Text style={styles.shortcutsText}>
          left/right or up/down: Change Channel | C: Channel List | G: Guide | S:
          Favorite | F: Fullscreen | M: Mute
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonHovered: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  channelInfoHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  centerControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  navButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonHovered: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ scale: 1.1 }],
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  programInfo: {
    flex: 1,
    maxWidth: 600,
  },
  programTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  programMeta: {
    gap: 4,
  },
  programTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  programDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  programProgressContainer: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  programProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  volumeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  shortcutsHint: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shortcutsText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
});
