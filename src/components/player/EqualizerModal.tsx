import { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/stores';
import {
  EQUALIZER_PRESETS,
  EQUALIZER_FREQUENCIES,
  MIN_GAIN,
  MAX_GAIN,
  getPresetById,
} from '@/constants/equalizer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EqualizerModalProps {
  visible: boolean;
  onClose: () => void;
}

interface BandSliderProps {
  index: number;
  frequency: string;
  value: number;
  onChange: (index: number, value: number) => void;
  accentColor: string;
  isCustom: boolean;
}

function BandSlider({ index, frequency, value, onChange, accentColor, isCustom }: BandSliderProps) {
  const sliderHeight = 140;
  const thumbSize = 20;
  const trackWidth = 6;

  const normalizedValue = (value - MIN_GAIN) / (MAX_GAIN - MIN_GAIN);
  const thumbPosition = (1 - normalizedValue) * (sliderHeight - thumbSize);

  const translateY = useSharedValue(thumbPosition);

  const updateValue = useCallback((y: number) => {
    const clampedY = Math.max(0, Math.min(y, sliderHeight - thumbSize));
    const newNormalized = 1 - clampedY / (sliderHeight - thumbSize);
    const newValue = Math.round(MIN_GAIN + newNormalized * (MAX_GAIN - MIN_GAIN));
    onChange(index, newValue);
  }, [index, onChange, sliderHeight, thumbSize]);

  const panGesture = Gesture.Pan()
    .enabled(isCustom)
    .onUpdate((e) => {
      const newY = Math.max(0, Math.min(e.y, sliderHeight - thumbSize));
      translateY.value = newY;
      runOnJS(updateValue)(newY);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isCustom ? translateY.value : thumbPosition }],
  }));

  const filledHeight = sliderHeight - thumbPosition - thumbSize / 2;
  const fillTop = thumbPosition + thumbSize / 2;

  return (
    <View style={{ alignItems: 'center', width: (SCREEN_WIDTH - 48) / 10 }}>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginBottom: 4 }}>
        {value > 0 ? `+${value}` : value}
      </Text>

      <GestureDetector gesture={panGesture}>
        <View style={{ height: sliderHeight, width: 32, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              position: 'absolute',
              width: trackWidth,
              height: sliderHeight,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: trackWidth / 2,
            }}
          />

          <View
            style={{
              position: 'absolute',
              width: trackWidth,
              height: filledHeight,
              top: fillTop,
              backgroundColor: accentColor,
              borderRadius: trackWidth / 2,
            }}
          />

          <View
            style={{
              position: 'absolute',
              width: trackWidth,
              height: 2,
              backgroundColor: 'rgba(255,255,255,0.4)',
              top: sliderHeight / 2 - 1,
            }}
          />

          <Animated.View
            style={[
              {
                position: 'absolute',
                width: thumbSize,
                height: thumbSize,
                borderRadius: thumbSize / 2,
                backgroundColor: isCustom ? '#fff' : accentColor,
                left: (32 - thumbSize) / 2,
                top: 0,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                elevation: 3,
              },
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>

      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 4 }}>
        {frequency}
      </Text>
    </View>
  );
}

export function EqualizerModal({ visible, onClose }: EqualizerModalProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const equalizerPreset = useSettingsStore((s) => s.equalizerPreset);
  const customEqualizerBands = useSettingsStore((s) => s.customEqualizerBands);
  const setEqualizerPreset = useSettingsStore((s) => s.setEqualizerPreset);
  const setCustomEqualizerBands = useSettingsStore((s) => s.setCustomEqualizerBands);

  const [localBands, setLocalBands] = useState<number[]>(
    equalizerPreset === 'custom' ? customEqualizerBands : getPresetById(equalizerPreset)?.bands ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  );

  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      const preset = getPresetById(equalizerPreset);
      if (preset) {
        if (equalizerPreset === 'custom') {
          setLocalBands(customEqualizerBands);
        } else {
          setLocalBands(preset.bands);
        }
      }
    }
  }, [visible]);

  const isCustomPreset = equalizerPreset === 'custom';
  const currentPreset = getPresetById(equalizerPreset);

  const handlePresetSelect = (presetId: string) => {
    setEqualizerPreset(presetId);
    const preset = getPresetById(presetId);
    if (preset) {
      if (presetId === 'custom') {
        setLocalBands(customEqualizerBands);
      } else {
        setLocalBands(preset.bands);
      }
    }
  };

  const handleBandChange = (index: number, value: number) => {
    const newBands = [...localBands];
    newBands[index] = value;
    setLocalBands(newBands);

    if (isCustomPreset) {
      setCustomEqualizerBands(newBands);
    }
  };

  const handleResetCustom = () => {
    const flatBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    setLocalBands(flatBands);
    setCustomEqualizerBands(flatBands);
  };

  const closeModal = useCallback(() => {
    onClose();
  }, [onClose]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 500) {
        translateY.value = withTiming(500, { duration: 200 });
        runOnJS(closeModal)();
      } else {
        translateY.value = withSpring(0, { damping: 20 });
      }
    });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />

          <GestureDetector gesture={gesture}>
            <Animated.View
              style={[
                {
                  backgroundColor: '#1a1a1a',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingBottom: 40,
                  maxHeight: '85%',
                },
                sheetStyle,
              ]}
            >
              <View style={{ paddingTop: 12, paddingBottom: 16, alignItems: 'center' }}>
                <View
                  style={{
                    width: 48,
                    height: 4,
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    borderRadius: 2,
                  }}
                />
              </View>

              <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Equalizer</Text>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: 'rgba(255,165,0,0.2)',
                    }}
                  >
                    <Text style={{ color: '#ffa500', fontSize: 11, fontWeight: '600' }}>
                      Visual Only
                    </Text>
                  </View>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>
                  Audio processing requires native implementation
                </Text>
              </View>

              <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>
                  Presets
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {EQUALIZER_PRESETS.map((preset) => {
                      const isSelected = preset.id === equalizerPreset;
                      return (
                        <Pressable
                          key={preset.id}
                          onPress={() => handlePresetSelect(preset.id)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 20,
                            backgroundColor: isSelected ? accentColor : 'rgba(255,255,255,0.1)',
                          }}
                        >
                          <Text
                            style={{
                              color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                              fontSize: 14,
                              fontWeight: isSelected ? '600' : '400',
                            }}
                          >
                            {preset.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View style={{ paddingHorizontal: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' }}>
                    {isCustomPreset ? 'Custom Bands' : `${currentPreset?.name ?? 'Preset'} Bands`}
                  </Text>
                  {isCustomPreset && (
                    <Pressable onPress={handleResetCustom} style={{ paddingVertical: 4, paddingHorizontal: 8 }}>
                      <Text style={{ color: accentColor, fontSize: 13 }}>Reset</Text>
                    </Pressable>
                  )}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {EQUALIZER_FREQUENCIES.map((freq, index) => (
                    <BandSlider
                      key={freq.frequency}
                      index={index}
                      frequency={freq.label}
                      value={localBands[index] ?? 0}
                      onChange={handleBandChange}
                      accentColor={accentColor}
                      isCustom={isCustomPreset}
                    />
                  ))}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>+{MAX_GAIN}dB</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>0dB</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{MIN_GAIN}dB</Text>
                </View>
              </View>

              {!isCustomPreset && (
                <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center' }}>
                    Select "Custom" to adjust bands manually
                  </Text>
                </View>
              )}

              <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
                <Pressable
                  onPress={onClose}
                  style={{
                    backgroundColor: accentColor,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Done</Text>
                </Pressable>
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
