import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { isChromecastSupported } from '@/utils/casting';

interface OptionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  isActive?: boolean;
  accentColor: string;
}

const OptionRow = memo(function OptionRow({
  icon,
  label,
  value,
  onPress,
  isActive = false,
  accentColor,
}: OptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-4 px-4 active:bg-white/10"
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
    </Pressable>
  );
});

interface VideoOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  accentColor: string;
  onSpeedPress: () => void;
  currentSpeed: number;
  onSubtitleStylePress: () => void;
  onChapterPress: () => void;
  hasChapters: boolean;
  onSleepTimerPress: () => void;
  hasSleepTimer: boolean;
  sleepTimerLabel?: string;
  onOpenSubtitlesPress: () => void;
  hasOpenSubtitles: boolean;
  hasSubtitle: boolean;
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
  onSubtitleStylePress,
  onChapterPress,
  hasChapters,
  onSleepTimerPress,
  hasSleepTimer,
  sleepTimerLabel,
  onOpenSubtitlesPress,
  hasOpenSubtitles,
  hasSubtitle,
  chromecastConnected,
  onCastPress,
  onCastRemotePress,
  CastButton,
}: VideoOptionsMenuProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/70 justify-end items-center"
      >
        <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
          <View className="bg-neutral-900 rounded-t-3xl">
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

              <OptionRow
                icon="moon-outline"
                label="Sleep Timer"
                value={hasSleepTimer ? sleepTimerLabel : 'Off'}
                onPress={() => { onClose(); onSleepTimerPress(); }}
                isActive={hasSleepTimer}
                accentColor={accentColor}
              />

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
