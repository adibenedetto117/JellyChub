import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { VideoAirPlayButton } from 'expo-video';
import { isAirPlaySupported, isChromecastSupported } from '@/utils/casting';

interface OptionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  isActive?: boolean;
  accentColor: string;
  disabled?: boolean;
  rightContent?: React.ReactNode;
}

const OptionRow = memo(function OptionRow({
  icon,
  label,
  value,
  onPress,
  isActive = false,
  accentColor,
  disabled = false,
  rightContent,
}: OptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center py-4 px-4 active:bg-white/10"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: isActive ? accentColor + '40' : 'rgba(255,255,255,0.1)' }}
      >
        <Ionicons name={icon} size={20} color={isActive ? accentColor : '#fff'} />
      </View>
      <View className="flex-1">
        <Text className="text-white text-base font-medium">{label}</Text>
        {value && (
          <Text className="text-white/60 text-sm mt-0.5">{value}</Text>
        )}
      </View>
      {rightContent}
    </Pressable>
  );
});

interface VideoOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  accentColor: string;
  onSpeedPress: () => void;
  currentSpeed: number;
  onAudioPress: () => void;
  currentAudio?: string;
  onSubtitlePress: () => void;
  hasSubtitle: boolean;
  currentSubtitle?: string;
  onSubtitleStylePress: () => void;
  onChapterPress: () => void;
  hasChapters: boolean;
  onLoopAPress: () => void;
  onLoopBPress: () => void;
  onLoopClearPress: () => void;
  loopA: number | null;
  loopB: number | null;
  onLockPress: () => void;
  isLocked: boolean;
  onSleepTimerPress: () => void;
  hasSleepTimer: boolean;
  sleepTimerLabel?: string;
  onExternalPlayerPress: () => void;
  hasExternalPlayer: boolean;
  onOpenSubtitlesPress: () => void;
  hasOpenSubtitles: boolean;
  onPipPress: () => void;
  chromecastConnected: boolean;
  onCastPress: () => void;
  onCastRemotePress: () => void;
  CastButton: React.ComponentType<any> | null;
}

export const VideoOptionsMenu = memo(function VideoOptionsMenu({
  visible,
  onClose,
  accentColor,
  onSpeedPress,
  currentSpeed,
  onAudioPress,
  currentAudio,
  onSubtitlePress,
  hasSubtitle,
  currentSubtitle,
  onSubtitleStylePress,
  onChapterPress,
  hasChapters,
  onLoopAPress,
  onLoopBPress,
  onLoopClearPress,
  loopA,
  loopB,
  onLockPress,
  isLocked,
  onSleepTimerPress,
  hasSleepTimer,
  sleepTimerLabel,
  onExternalPlayerPress,
  hasExternalPlayer,
  onOpenSubtitlesPress,
  hasOpenSubtitles,
  onPipPress,
  chromecastConnected,
  onCastPress,
  onCastRemotePress,
  CastButton,
}: VideoOptionsMenuProps) {
  if (!visible) return null;

  const hasLoop = loopA !== null || loopB !== null;
  const loopLabel = hasLoop
    ? loopA !== null && loopB !== null
      ? 'A-B Loop Active'
      : loopA !== null
        ? 'Point A Set'
        : 'Point B Set'
    : 'Set loop points';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/70 justify-end"
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View className="bg-neutral-900 rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/10">
              <Text className="text-white text-lg font-bold">Options</Text>
              <Pressable
                onPress={onClose}
                className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
              >
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>

            <ScrollView className="px-2" showsVerticalScrollIndicator={false}>
              <OptionRow
                icon="speedometer-outline"
                label="Playback Speed"
                value={`${currentSpeed}x`}
                onPress={() => { onClose(); onSpeedPress(); }}
                isActive={currentSpeed !== 1}
                accentColor={accentColor}
              />

              <OptionRow
                icon="musical-notes-outline"
                label="Audio Track"
                value={currentAudio || 'Default'}
                onPress={() => { onClose(); onAudioPress(); }}
                accentColor={accentColor}
              />

              <OptionRow
                icon="text-outline"
                label="Subtitles"
                value={hasSubtitle ? currentSubtitle || 'On' : 'Off'}
                onPress={() => { onClose(); onSubtitlePress(); }}
                isActive={hasSubtitle}
                accentColor={accentColor}
              />

              {hasSubtitle && (
                <OptionRow
                  icon="color-palette-outline"
                  label="Subtitle Style"
                  onPress={() => { onClose(); onSubtitleStylePress(); }}
                  accentColor={accentColor}
                />
              )}

              {hasOpenSubtitles && (
                <OptionRow
                  icon="search-outline"
                  label="OpenSubtitles Search"
                  onPress={() => { onClose(); onOpenSubtitlesPress(); }}
                  accentColor={accentColor}
                />
              )}

              {hasChapters && (
                <OptionRow
                  icon="list-outline"
                  label="Chapters"
                  onPress={() => { onClose(); onChapterPress(); }}
                  accentColor={accentColor}
                />
              )}

              <View className="flex-row items-center py-4 px-4">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: hasLoop ? accentColor + '40' : 'rgba(255,255,255,0.1)' }}
                >
                  <Ionicons name="repeat-outline" size={20} color={hasLoop ? accentColor : '#fff'} />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base font-medium">A-B Loop</Text>
                  <Text className="text-white/60 text-sm mt-0.5">{loopLabel}</Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={onLoopAPress}
                    className="h-9 px-3 rounded-full items-center justify-center"
                    style={{ backgroundColor: loopA !== null ? accentColor : 'rgba(255,255,255,0.15)' }}
                  >
                    <Text className="text-white text-sm font-bold">A</Text>
                  </Pressable>
                  <Pressable
                    onPress={onLoopBPress}
                    disabled={loopA === null}
                    className="h-9 px-3 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: loopB !== null ? accentColor : 'rgba(255,255,255,0.15)',
                      opacity: loopA === null ? 0.5 : 1
                    }}
                  >
                    <Text className="text-white text-sm font-bold">B</Text>
                  </Pressable>
                  {hasLoop && (
                    <Pressable
                      onPress={onLoopClearPress}
                      className="h-9 px-3 rounded-full bg-red-500/60 items-center justify-center"
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </Pressable>
                  )}
                </View>
              </View>

              <OptionRow
                icon={isLocked ? 'lock-closed' : 'lock-open-outline'}
                label="Lock Controls"
                value={isLocked ? 'Locked' : 'Unlocked'}
                onPress={onLockPress}
                isActive={isLocked}
                accentColor={isLocked ? '#ef4444' : accentColor}
              />

              <OptionRow
                icon="moon-outline"
                label="Sleep Timer"
                value={hasSleepTimer ? sleepTimerLabel : 'Off'}
                onPress={() => { onClose(); onSleepTimerPress(); }}
                isActive={hasSleepTimer}
                accentColor={accentColor}
              />

              {hasExternalPlayer && (
                <OptionRow
                  icon="open-outline"
                  label="External Player"
                  onPress={onExternalPlayerPress}
                  accentColor={accentColor}
                />
              )}

              <OptionRow
                icon="browsers-outline"
                label="Picture in Picture"
                onPress={onPipPress}
                accentColor={accentColor}
              />

              {isAirPlaySupported && (
                <View className="flex-row items-center py-4 px-4">
                  <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-4 overflow-hidden">
                    <VideoAirPlayButton
                      tintColor="#fff"
                      activeTintColor={accentColor}
                      style={{ width: 40, height: 40 }}
                    />
                  </View>
                  <Text className="text-white text-base font-medium">AirPlay</Text>
                </View>
              )}

              {isChromecastSupported && CastButton && (
                <View className="flex-row items-center py-4 px-4">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-4 overflow-hidden"
                    style={{ backgroundColor: chromecastConnected ? accentColor + '40' : 'rgba(255,255,255,0.1)' }}
                  >
                    {chromecastConnected ? (
                      <Ionicons name="tv" size={20} color={accentColor} />
                    ) : (
                      <CastButton style={{ width: 40, height: 40, tintColor: '#fff' }} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-base font-medium">Chromecast</Text>
                    {chromecastConnected && (
                      <Text className="text-white/60 text-sm mt-0.5">Connected</Text>
                    )}
                  </View>
                  {chromecastConnected && (
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={onCastPress}
                        className="h-9 px-4 rounded-full items-center justify-center"
                        style={{ backgroundColor: accentColor }}
                      >
                        <Text className="text-white text-sm font-medium">Cast</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => { onClose(); onCastRemotePress(); }}
                        className="h-9 px-4 rounded-full bg-white/15 items-center justify-center"
                      >
                        <Text className="text-white text-sm font-medium">Remote</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              <View className="h-8" />
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});
