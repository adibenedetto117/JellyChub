import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { memo, useState, useCallback } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import type { JellyseerrSeason } from '@/types/jellyseerr';
import { useSettingsStore } from '@/stores/settingsStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (seasonNumbers: number[]) => void;
  seasons: JellyseerrSeason[];
  isLoading?: boolean;
}

export const SeasonSelector = memo(function SeasonSelector({
  visible,
  onClose,
  onConfirm,
  seasons,
  isLoading = false,
}: Props) {
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const accentColor = useSettingsStore((s) => s.accentColor);

  const validSeasons = seasons.filter((s) => s.seasonNumber > 0);

  const toggleSeason = useCallback((seasonNumber: number) => {
    setSelectedSeasons((prev) =>
      prev.includes(seasonNumber)
        ? prev.filter((n) => n !== seasonNumber)
        : [...prev, seasonNumber]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedSeasons(validSeasons.map((s) => s.seasonNumber));
  }, [validSeasons]);

  const clearAll = useCallback(() => {
    setSelectedSeasons([]);
  }, []);

  const handleConfirm = () => {
    onConfirm(selectedSeasons);
    setSelectedSeasons([]);
  };

  const handleClose = () => {
    setSelectedSeasons([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/80 justify-center items-center px-6">
        <Animated.View
          entering={FadeIn.duration(200)}
          className="bg-background-primary rounded-2xl w-full max-w-sm overflow-hidden"
        >
          <View className="p-4 border-b border-white/10">
            <Text className="text-white text-lg font-semibold">Select Seasons</Text>
            <Text className="text-text-tertiary text-sm mt-1">
              Choose which seasons to request
            </Text>
          </View>

          <View className="flex-row justify-end px-4 py-2 border-b border-white/10">
            <Pressable onPress={selectAll} className="mr-4">
              <Text style={{ color: accentColor }} className="text-sm font-medium">
                Select All
              </Text>
            </Pressable>
            <Pressable onPress={clearAll}>
              <Text className="text-text-tertiary text-sm font-medium">Clear</Text>
            </Pressable>
          </View>

          <ScrollView className="max-h-72">
            {validSeasons.map((season) => {
              const isSelected = selectedSeasons.includes(season.seasonNumber);
              return (
                <Pressable
                  key={season.id}
                  onPress={() => toggleSeason(season.seasonNumber)}
                  className={`flex-row items-center justify-between px-4 py-3 border-b border-white/5 ${
                    isSelected ? 'bg-white/5' : ''
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-white font-medium">{season.name}</Text>
                    <Text className="text-text-tertiary text-xs">
                      {season.episodeCount} episodes
                    </Text>
                  </View>

                  <View
                    className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                      isSelected ? 'border-transparent' : 'border-white/30'
                    }`}
                    style={isSelected ? { backgroundColor: accentColor } : undefined}
                  >
                    {isSelected && (
                      <Text className="text-white text-xs font-bold">
                        {'\u2713'}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="flex-row gap-3 p-4 border-t border-white/10">
            <View className="flex-1">
              <Button
                title="Cancel"
                variant="ghost"
                onPress={handleClose}
                fullWidth
              />
            </View>
            <View className="flex-1">
              <Button
                title={`Request ${selectedSeasons.length > 0 ? `(${selectedSeasons.length})` : ''}`}
                variant="primary"
                onPress={handleConfirm}
                disabled={selectedSeasons.length === 0}
                loading={isLoading}
                fullWidth
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});
