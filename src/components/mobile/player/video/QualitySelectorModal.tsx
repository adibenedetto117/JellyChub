import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type StreamingQuality = 'auto' | 'original' | '1080p' | '720p' | '480p';

interface QualityOption {
  value: StreamingQuality;
  label: string;
  description: string;
}

const QUALITY_OPTIONS: QualityOption[] = [
  { value: 'auto', label: 'Auto', description: 'Adjust based on network' },
  { value: 'original', label: 'Original', description: 'Direct play when possible' },
  { value: '1080p', label: '1080p', description: 'Full HD' },
  { value: '720p', label: '720p', description: 'HD' },
  { value: '480p', label: '480p', description: 'SD - Lower data usage' },
];

interface QualitySelectorModalProps {
  visible: boolean;
  onClose: () => void;
  screenHeight: number;
  accentColor: string;
  currentQuality: StreamingQuality;
  onSelectQuality: (quality: StreamingQuality) => void;
}

export function QualitySelectorModal({
  visible,
  onClose,
  screenHeight,
  accentColor,
  currentQuality,
  onSelectQuality,
}: QualitySelectorModalProps) {
  if (!visible) return null;

  return (
    <Pressable
      onPress={onClose}
      className="absolute inset-0 bg-black/80 items-center justify-center z-50"
    >
      <View
        className="bg-zinc-900 rounded-2xl p-6 w-80"
        style={{ maxHeight: screenHeight * 0.7 }}
      >
        <Text className="text-white text-lg font-bold mb-4 text-center">Streaming Quality</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {QUALITY_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onSelectQuality(option.value);
                onClose();
              }}
              className="flex-row items-center py-3 border-b border-white/10"
            >
              <View className="flex-1">
                <Text className="text-white">{option.label}</Text>
                <Text className="text-white/60 text-sm">{option.description}</Text>
              </View>
              {currentQuality === option.value && (
                <Ionicons name="checkmark" size={24} color={accentColor} />
              )}
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          onPress={onClose}
          className="mt-4 py-3 rounded-lg bg-white/10 items-center"
        >
          <Text className="text-white font-medium">Close</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
