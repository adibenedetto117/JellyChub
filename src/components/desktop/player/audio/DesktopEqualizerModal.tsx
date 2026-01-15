import { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Platform, ScrollView } from 'react-native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';
import {
  EQUALIZER_PRESETS,
  EQUALIZER_FREQUENCIES,
  MIN_GAIN,
  MAX_GAIN,
  getPresetById,
} from '@/constants/equalizer';

interface DesktopEqualizerModalProps {
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
  isFocused: boolean;
  onFocus: () => void;
}

function BandSlider({
  index,
  frequency,
  value,
  onChange,
  accentColor,
  isCustom,
  isFocused,
  onFocus,
}: BandSliderProps) {
  const sliderHeight = 160;
  const thumbSize = 16;
  const trackWidth = 6;

  const [isHovered, setIsHovered] = useState(false);

  const normalizedValue = (value - MIN_GAIN) / (MAX_GAIN - MIN_GAIN);
  const thumbPosition = (1 - normalizedValue) * (sliderHeight - thumbSize);

  const translateY = useSharedValue(thumbPosition);

  useEffect(() => {
    translateY.value = withTiming(thumbPosition, { duration: 150 });
  }, [thumbPosition, translateY]);

  const updateValue = useCallback(
    (y: number) => {
      const clampedY = Math.max(0, Math.min(y, sliderHeight - thumbSize));
      const newNormalized = 1 - clampedY / (sliderHeight - thumbSize);
      const newValue = Math.round(MIN_GAIN + newNormalized * (MAX_GAIN - MIN_GAIN));
      onChange(index, newValue);
    },
    [index, onChange, sliderHeight, thumbSize]
  );

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
    <Pressable
      onPress={onFocus}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.bandContainer,
        (isHovered || isFocused) && styles.bandContainerHovered,
        isFocused && { borderColor: accentColor },
      ]}
    >
      <Text style={[styles.bandValue, isFocused && { color: accentColor }]}>
        {value > 0 ? `+${value}` : value}
      </Text>

      <GestureDetector gesture={panGesture}>
        <View style={[styles.sliderContainer, { height: sliderHeight }]}>
          <View style={[styles.track, { width: trackWidth, height: sliderHeight }]} />

          <View
            style={[
              styles.trackFill,
              {
                width: trackWidth,
                height: filledHeight,
                top: fillTop,
                backgroundColor: accentColor,
              },
            ]}
          />

          <View style={[styles.trackCenter, { width: trackWidth, top: sliderHeight / 2 - 1 }]} />

          <Animated.View
            style={[
              styles.thumb,
              {
                width: thumbSize,
                height: thumbSize,
                borderRadius: thumbSize / 2,
                backgroundColor: isCustom ? '#fff' : accentColor,
                left: (32 - thumbSize) / 2,
                borderWidth: isFocused ? 2 : 0,
                borderColor: accentColor,
              },
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>

      <Text style={[styles.bandFrequency, isFocused && { color: 'rgba(255,255,255,0.8)' }]}>
        {frequency}
      </Text>
    </Pressable>
  );
}

export function DesktopEqualizerModal({ visible, onClose }: DesktopEqualizerModalProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const equalizerPreset = useSettingsStore((s) => s.equalizerPreset);
  const customEqualizerBands = useSettingsStore((s) => s.customEqualizerBands);
  const setEqualizerPreset = useSettingsStore((s) => s.setEqualizerPreset);
  const setCustomEqualizerBands = useSettingsStore((s) => s.setCustomEqualizerBands);

  const [localBands, setLocalBands] = useState<number[]>(
    equalizerPreset === 'custom'
      ? customEqualizerBands
      : getPresetById(equalizerPreset)?.bands ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  );
  const [focusedBand, setFocusedBand] = useState<number | null>(null);
  const [focusedPreset, setFocusedPreset] = useState<number>(0);
  const [focusMode, setFocusMode] = useState<'presets' | 'bands'>('presets');

  useEffect(() => {
    if (visible) {
      const preset = getPresetById(equalizerPreset);
      if (preset) {
        if (equalizerPreset === 'custom') {
          setLocalBands(customEqualizerBands);
        } else {
          setLocalBands(preset.bands);
        }
      }
      const presetIndex = EQUALIZER_PRESETS.findIndex((p) => p.id === equalizerPreset);
      setFocusedPreset(presetIndex >= 0 ? presetIndex : 0);
      setFocusMode('presets');
      setFocusedBand(null);
    }
  }, [visible, equalizerPreset, customEqualizerBands]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      const isCustomPreset = equalizerPreset === 'custom';

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;

        case 'Tab':
          e.preventDefault();
          setFocusMode((prev) => (prev === 'presets' ? 'bands' : 'presets'));
          if (focusMode === 'presets') {
            setFocusedBand(0);
          } else {
            setFocusedBand(null);
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (focusMode === 'presets') {
            setFocusedPreset((prev) => Math.max(0, prev - 1));
          } else if (focusedBand !== null) {
            setFocusedBand(Math.max(0, focusedBand - 1));
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (focusMode === 'presets') {
            setFocusedPreset((prev) => Math.min(EQUALIZER_PRESETS.length - 1, prev + 1));
          } else if (focusedBand !== null) {
            setFocusedBand(Math.min(EQUALIZER_FREQUENCIES.length - 1, focusedBand + 1));
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (focusMode === 'bands' && focusedBand !== null && isCustomPreset) {
            const newValue = Math.min(MAX_GAIN, localBands[focusedBand] + 1);
            handleBandChange(focusedBand, newValue);
          } else if (focusMode === 'presets') {
            const rowSize = 4;
            setFocusedPreset((prev) => Math.max(0, prev - rowSize));
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (focusMode === 'bands' && focusedBand !== null && isCustomPreset) {
            const newValue = Math.max(MIN_GAIN, localBands[focusedBand] - 1);
            handleBandChange(focusedBand, newValue);
          } else if (focusMode === 'presets') {
            const rowSize = 4;
            setFocusedPreset((prev) => Math.min(EQUALIZER_PRESETS.length - 1, prev + rowSize));
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusMode === 'presets') {
            const preset = EQUALIZER_PRESETS[focusedPreset];
            if (preset) {
              handlePresetSelect(preset.id);
            }
          }
          break;

        case 'r':
          e.preventDefault();
          if (isCustomPreset) {
            handleResetCustom();
          }
          break;

        case '0':
          e.preventDefault();
          if (focusMode === 'bands' && focusedBand !== null && isCustomPreset) {
            handleBandChange(focusedBand, 0);
          }
          break;

        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          setFocusedBand(parseInt(e.key) - 1);
          setFocusMode('bands');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, focusMode, focusedBand, focusedPreset, localBands, equalizerPreset, onClose]);

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons name="options" size={24} color={accentColor} />
                <Text style={styles.title}>Equalizer</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>

            <View style={styles.presetSection}>
              <Text style={styles.sectionTitle}>Presets</Text>
              <View style={styles.presetGrid}>
                {EQUALIZER_PRESETS.map((preset, index) => {
                  const isSelected = preset.id === equalizerPreset;
                  const isFocused = focusMode === 'presets' && focusedPreset === index;

                  return (
                    <Pressable
                      key={preset.id}
                      onPress={() => handlePresetSelect(preset.id)}
                      style={[
                        styles.presetButton,
                        isSelected && { backgroundColor: accentColor },
                        isFocused && styles.presetButtonFocused,
                        isFocused && { borderColor: accentColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetButtonText,
                          isSelected && styles.presetButtonTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {preset.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.bandsSection}>
              <View style={styles.bandsSectionHeader}>
                <Text style={styles.sectionTitle}>
                  {isCustomPreset ? 'Custom Bands' : `${currentPreset?.name ?? 'Preset'} Bands`}
                </Text>
                {isCustomPreset && (
                  <Pressable onPress={handleResetCustom} style={styles.resetButton}>
                    <Text style={[styles.resetButtonText, { color: accentColor }]}>Reset (R)</Text>
                  </Pressable>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.bandsContainer}>
                  {EQUALIZER_FREQUENCIES.map((freq, index) => (
                    <BandSlider
                      key={freq.frequency}
                      index={index}
                      frequency={freq.label}
                      value={localBands[index] ?? 0}
                      onChange={handleBandChange}
                      accentColor={accentColor}
                      isCustom={isCustomPreset}
                      isFocused={focusMode === 'bands' && focusedBand === index}
                      onFocus={() => {
                        setFocusMode('bands');
                        setFocusedBand(index);
                      }}
                    />
                  ))}
                </View>
              </ScrollView>

              <View style={styles.gainLabels}>
                <Text style={styles.gainLabel}>+{MAX_GAIN}dB</Text>
                <Text style={styles.gainLabel}>0dB</Text>
                <Text style={styles.gainLabel}>{MIN_GAIN}dB</Text>
              </View>
            </View>

            {!isCustomPreset && (
              <View style={styles.hint}>
                <Text style={styles.hintText}>Select "Custom" to adjust bands manually</Text>
              </View>
            )}

            <View style={styles.footer}>
              <View style={styles.shortcuts}>
                <Text style={styles.shortcutsText}>
                  Tab: Switch focus | Arrows: Navigate/Adjust | Enter: Select | R: Reset | 1-9: Jump
                  to band | Esc: Close
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={[styles.doneButton, { backgroundColor: accentColor }]}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 700,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetButtonFocused: {
    borderWidth: 2,
  },
  presetButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  presetButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  bandsSection: {
    marginBottom: 16,
  },
  bandsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resetButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bandsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  bandContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bandContainerHovered: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bandValue: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 6,
  },
  sliderContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
  },
  trackFill: {
    position: 'absolute',
    borderRadius: 3,
  },
  trackCenter: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  thumb: {
    position: 'absolute',
    top: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  bandFrequency: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 6,
  },
  gainLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  gainLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  hint: {
    marginBottom: 16,
  },
  hintText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    gap: 12,
  },
  shortcuts: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  shortcutsText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    textAlign: 'center',
  },
  doneButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
