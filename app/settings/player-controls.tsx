import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';
import {
  DEFAULT_PLAYER_CONTROLS_CONFIG,
  DEFAULT_PLAYER_CONTROLS_ORDER,
  type PlayerControlId,
  type PlayerControlPlacement,
} from '@/types/player';
import { haptics } from '@/utils';

// Control metadata
const CONTROL_INFO: Record<PlayerControlId, { label: string; icon: keyof typeof Ionicons.glyphMap; description: string }> = {
  pip: { label: 'Picture-in-Picture', icon: 'albums-outline', description: 'Floating video window' },
  cast: { label: 'Chromecast', icon: 'tv-outline', description: 'Cast to external devices' },
  speed: { label: 'Playback Speed', icon: 'speedometer-outline', description: 'Change playback rate' },
  audioSubs: { label: 'Audio & Subtitles', icon: 'chatbubble-ellipses-outline', description: 'Audio track and subtitle selection' },
  subtitleSearch: { label: 'Search Subtitles', icon: 'search-outline', description: 'Search OpenSubtitles.com' },
  episodes: { label: 'Episodes', icon: 'list-outline', description: 'Episode list for TV shows' },
  quality: { label: 'Quality', icon: 'settings-outline', description: 'Streaming quality settings' },
  chapters: { label: 'Chapters', icon: 'bookmark-outline', description: 'Jump to chapters' },
  sleepTimer: { label: 'Sleep Timer', icon: 'moon-outline', description: 'Auto-pause after time' },
  lock: { label: 'Lock Controls', icon: 'lock-closed-outline', description: 'Lock screen controls' },
  externalPlayer: { label: 'External Player', icon: 'open-outline', description: 'Open in external app' },
};

const PLACEMENT_OPTIONS: { value: PlayerControlPlacement; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'visible', label: 'Visible', icon: 'eye-outline' },
  { value: 'menu', label: 'Menu', icon: 'ellipsis-horizontal' },
  { value: 'hidden', label: 'Hidden', icon: 'eye-off-outline' },
];

interface ControlItemProps {
  controlId: PlayerControlId;
  placement: PlayerControlPlacement;
  onPlacementChange: (placement: PlayerControlPlacement) => void;
  accentColor: string;
  index: number;
  totalCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function ControlItem({
  controlId,
  placement,
  onPlacementChange,
  accentColor,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
}: ControlItemProps) {
  const info = CONTROL_INFO[controlId];
  const [showOptions, setShowOptions] = useState(false);

  return (
    <View className="bg-surface rounded-xl mb-3 overflow-hidden">
      <View className="flex-row items-center p-4">
        {/* Reorder buttons */}
        <View className="mr-3">
          <Pressable
            onPress={() => {
              haptics.light();
              onMoveUp();
            }}
            disabled={index === 0}
            className="p-1"
            style={{ opacity: index === 0 ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.5)" />
          </Pressable>
          <Pressable
            onPress={() => {
              haptics.light();
              onMoveDown();
            }}
            disabled={index === totalCount - 1}
            className="p-1"
            style={{ opacity: index === totalCount - 1 ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </View>

        {/* Control info */}
        <View className="flex-1">
          <View className="flex-row items-center">
            <View
              className="w-8 h-8 rounded-lg items-center justify-center mr-3"
              style={{ backgroundColor: placement === 'hidden' ? 'rgba(255,255,255,0.1)' : accentColor + '30' }}
            >
              <Ionicons
                name={info.icon}
                size={18}
                color={placement === 'hidden' ? 'rgba(255,255,255,0.4)' : accentColor}
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-medium"
                style={{ color: placement === 'hidden' ? 'rgba(255,255,255,0.4)' : '#fff' }}
              >
                {info.label}
              </Text>
              <Text className="text-xs text-text-tertiary mt-0.5">{info.description}</Text>
            </View>
          </View>
        </View>

        {/* Placement selector button */}
        <Pressable
          onPress={() => {
            haptics.light();
            setShowOptions(!showOptions);
          }}
          className="flex-row items-center px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        >
          <Ionicons
            name={PLACEMENT_OPTIONS.find(o => o.value === placement)?.icon || 'eye-outline'}
            size={16}
            color={placement === 'visible' ? accentColor : 'rgba(255,255,255,0.6)'}
          />
          <Text
            className="text-sm ml-2"
            style={{ color: placement === 'visible' ? accentColor : 'rgba(255,255,255,0.6)' }}
          >
            {PLACEMENT_OPTIONS.find(o => o.value === placement)?.label}
          </Text>
          <Ionicons
            name={showOptions ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="rgba(255,255,255,0.4)"
            style={{ marginLeft: 4 }}
          />
        </Pressable>
      </View>

      {/* Placement options */}
      {showOptions && (
        <View className="border-t border-white/10 px-4 py-3 flex-row justify-around">
          {PLACEMENT_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                haptics.light();
                onPlacementChange(option.value);
                setShowOptions(false);
              }}
              className="flex-row items-center px-4 py-2 rounded-lg"
              style={{
                backgroundColor: placement === option.value ? accentColor + '30' : 'rgba(255,255,255,0.05)',
              }}
            >
              <Ionicons
                name={option.icon}
                size={18}
                color={placement === option.value ? accentColor : 'rgba(255,255,255,0.5)'}
              />
              <Text
                className="text-sm ml-2"
                style={{ color: placement === option.value ? accentColor : 'rgba(255,255,255,0.5)' }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function PlayerControlsSettingsScreen() {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const player = useSettingsStore((s) => s.player);
  const updatePlayerSettings = useSettingsStore((s) => s.updatePlayerSettings);

  const controlsConfig = player.controlsConfig ?? DEFAULT_PLAYER_CONTROLS_CONFIG;
  const controlsOrder = player.controlsOrder ?? DEFAULT_PLAYER_CONTROLS_ORDER;

  const handlePlacementChange = useCallback((controlId: PlayerControlId, placement: PlayerControlPlacement) => {
    updatePlayerSettings({
      controlsConfig: {
        ...controlsConfig,
        [controlId]: placement,
      },
    });
  }, [controlsConfig, updatePlayerSettings]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newOrder = [...controlsOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    updatePlayerSettings({ controlsOrder: newOrder });
  }, [controlsOrder, updatePlayerSettings]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= controlsOrder.length - 1) return;
    const newOrder = [...controlsOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    updatePlayerSettings({ controlsOrder: newOrder });
  }, [controlsOrder, updatePlayerSettings]);

  const handleResetToDefaults = useCallback(() => {
    haptics.medium();
    updatePlayerSettings({
      controlsConfig: { ...DEFAULT_PLAYER_CONTROLS_CONFIG },
      controlsOrder: [...DEFAULT_PLAYER_CONTROLS_ORDER],
    });
  }, [updatePlayerSettings]);

  // Count controls by placement
  const visibleCount = controlsOrder.filter(id => controlsConfig[id] === 'visible').length;
  const menuCount = controlsOrder.filter(id => controlsConfig[id] === 'menu').length;
  const hiddenCount = controlsOrder.filter(id => controlsConfig[id] === 'hidden').length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Player Controls',
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#fff',
          headerBackTitle: 'Settings',
        }}
      />

      <ScrollView className="flex-1">
        <View className="flex-1 items-center px-4">
          <View className="w-full max-w-2xl">
            {/* Summary */}
            <View className="py-4 flex-row justify-center gap-6">
              <View className="items-center">
                <View className="flex-row items-center">
                  <Ionicons name="eye-outline" size={14} color={accentColor} />
                  <Text className="text-white font-semibold ml-1">{visibleCount}</Text>
                </View>
                <Text className="text-text-tertiary text-xs">Visible</Text>
              </View>
              <View className="items-center">
                <View className="flex-row items-center">
                  <Ionicons name="ellipsis-horizontal" size={14} color="rgba(255,255,255,0.6)" />
                  <Text className="text-white font-semibold ml-1">{menuCount}</Text>
                </View>
                <Text className="text-text-tertiary text-xs">In Menu</Text>
              </View>
              <View className="items-center">
                <View className="flex-row items-center">
                  <Ionicons name="eye-off-outline" size={14} color="rgba(255,255,255,0.4)" />
                  <Text className="text-white font-semibold ml-1">{hiddenCount}</Text>
                </View>
                <Text className="text-text-tertiary text-xs">Hidden</Text>
              </View>
            </View>

            {/* Instructions */}
            <View className="pb-4">
              <Text className="text-text-tertiary text-center text-xs">
                Use arrows to reorder controls. Visible controls appear in the player toolbar.
              </Text>
            </View>

            {/* Controls list */}
            <View>
              {controlsOrder.map((controlId, index) => (
                <ControlItem
                  key={controlId}
                  controlId={controlId}
                  placement={controlsConfig[controlId]}
                  onPlacementChange={(placement) => handlePlacementChange(controlId, placement)}
                  accentColor={accentColor}
                  index={index}
                  totalCount={controlsOrder.length}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                />
              ))}
            </View>

            {/* Reset button */}
            <View className="py-6">
              <Pressable
                onPress={handleResetToDefaults}
                className="py-3 rounded-xl items-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <Text className="text-white font-medium">Reset to Defaults</Text>
              </Pressable>
            </View>

            <View className="h-24" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
