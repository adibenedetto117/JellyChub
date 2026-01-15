import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, Modal, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';
import { useTVRemoteHandler } from '@/hooks';
import { tvConstants } from '@/utils/platform';
import {
  EQUALIZER_PRESETS,
  EQUALIZER_FREQUENCIES,
  MIN_GAIN,
  MAX_GAIN,
  getPresetById,
} from '@/constants/equalizer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TVEqualizerModalProps {
  visible: boolean;
  onClose: () => void;
}

type FocusArea = 'presets' | 'bands' | 'reset' | 'done';

interface TVBandSliderProps {
  index: number;
  frequency: string;
  value: number;
  isFocused: boolean;
  isCustom: boolean;
  accentColor: string;
}

function TVBandSlider({ index, frequency, value, isFocused, isCustom, accentColor }: TVBandSliderProps) {
  const sliderHeight = 180;
  const thumbSize = 28;
  const trackWidth = 10;

  const normalizedValue = (value - MIN_GAIN) / (MAX_GAIN - MIN_GAIN);
  const thumbPosition = (1 - normalizedValue) * (sliderHeight - thumbSize);

  const filledHeight = sliderHeight - thumbPosition - thumbSize / 2;
  const fillTop = thumbPosition + thumbSize / 2;

  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      scale.value = withTiming(tvConstants.focusScale, { duration: tvConstants.focusDuration });
      borderOpacity.value = withTiming(1, { duration: tvConstants.focusDuration });
    } else {
      scale.value = withTiming(1, { duration: tvConstants.focusDuration });
      borderOpacity.value = withTiming(0, { duration: tvConstants.focusDuration });
    }
  }, [isFocused, scale, borderOpacity]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  return (
    <Animated.View style={[styles.bandContainer, containerStyle]}>
      <Text style={[styles.gainLabel, isFocused && { color: '#fff' }]}>
        {value > 0 ? `+${value}` : value}
      </Text>

      <View style={styles.sliderWrapper}>
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

        <View style={[styles.centerMark, { width: trackWidth, top: sliderHeight / 2 - 1 }]} />

        <View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: isCustom && isFocused ? '#fff' : accentColor,
              top: thumbPosition,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.focusBorder,
            borderStyle,
            {
              borderColor: accentColor,
              borderRadius: 12,
            },
          ]}
        />
      </View>

      <Text style={[styles.freqLabel, isFocused && { color: 'rgba(255,255,255,0.8)' }]}>
        {frequency}
      </Text>
    </Animated.View>
  );
}

interface TVPresetButtonProps {
  preset: { id: string; name: string };
  isSelected: boolean;
  isFocused: boolean;
  accentColor: string;
  onPress: () => void;
  onFocus: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TVPresetButton({ preset, isSelected, isFocused, accentColor, onPress, onFocus }: TVPresetButtonProps) {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      scale.value = withTiming(tvConstants.focusScale, { duration: tvConstants.focusDuration });
      borderOpacity.value = withTiming(1, { duration: tvConstants.focusDuration });
    } else {
      scale.value = withTiming(1, { duration: tvConstants.focusDuration });
      borderOpacity.value = withTiming(0, { duration: tvConstants.focusDuration });
    }
  }, [isFocused, scale, borderOpacity]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onFocus={onFocus}
      style={[
        styles.presetButton,
        { backgroundColor: isSelected ? accentColor : 'rgba(255,255,255,0.1)' },
        buttonStyle,
      ]}
    >
      <Text
        style={[
          styles.presetButtonText,
          { color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)' },
          isSelected && { fontWeight: '600' },
        ]}
        numberOfLines={1}
      >
        {preset.name}
      </Text>
      <Animated.View
        style={[
          styles.presetFocusBorder,
          borderStyle,
          { borderColor: accentColor },
        ]}
      />
    </AnimatedPressable>
  );
}

export function TVEqualizerModal({ visible, onClose }: TVEqualizerModalProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const equalizerPreset = useSettingsStore((s) => s.equalizerPreset);
  const customEqualizerBands = useSettingsStore((s) => s.customEqualizerBands);
  const setEqualizerPreset = useSettingsStore((s) => s.setEqualizerPreset);
  const setCustomEqualizerBands = useSettingsStore((s) => s.setCustomEqualizerBands);

  const [localBands, setLocalBands] = useState<number[]>(
    equalizerPreset === 'custom' ? customEqualizerBands : getPresetById(equalizerPreset)?.bands ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  );

  const [focusArea, setFocusArea] = useState<FocusArea>('presets');
  const [presetIndex, setPresetIndex] = useState(0);
  const [bandIndex, setBandIndex] = useState(0);

  const isCustomPreset = equalizerPreset === 'custom';
  const currentPreset = getPresetById(equalizerPreset);

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
      setFocusArea('presets');
      const idx = EQUALIZER_PRESETS.findIndex((p) => p.id === equalizerPreset);
      setPresetIndex(idx >= 0 ? idx : 0);
      setBandIndex(0);
    }
  }, [visible, equalizerPreset, customEqualizerBands]);

  const handlePresetSelect = useCallback((presetId: string) => {
    setEqualizerPreset(presetId);
    const preset = getPresetById(presetId);
    if (preset) {
      if (presetId === 'custom') {
        setLocalBands(customEqualizerBands);
      } else {
        setLocalBands(preset.bands);
      }
    }
  }, [setEqualizerPreset, customEqualizerBands]);

  const handleBandChange = useCallback((index: number, delta: number) => {
    if (!isCustomPreset) return;

    const newBands = [...localBands];
    const newValue = Math.max(MIN_GAIN, Math.min(MAX_GAIN, newBands[index] + delta));
    newBands[index] = newValue;
    setLocalBands(newBands);
    setCustomEqualizerBands(newBands);
  }, [isCustomPreset, localBands, setCustomEqualizerBands]);

  const handleResetCustom = useCallback(() => {
    const flatBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    setLocalBands(flatBands);
    setCustomEqualizerBands(flatBands);
  }, [setCustomEqualizerBands]);

  const presetRows = 4;
  const presetsPerRow = 3;

  useTVRemoteHandler({
    onSelect: () => {
      if (focusArea === 'presets') {
        handlePresetSelect(EQUALIZER_PRESETS[presetIndex].id);
      } else if (focusArea === 'reset' && isCustomPreset) {
        handleResetCustom();
      } else if (focusArea === 'done') {
        onClose();
      }
    },
    onMenu: onClose,
    onUp: () => {
      if (focusArea === 'presets') {
        if (presetIndex >= presetsPerRow) {
          setPresetIndex(presetIndex - presetsPerRow);
        }
      } else if (focusArea === 'bands') {
        if (isCustomPreset) {
          handleBandChange(bandIndex, 1);
        } else {
          setFocusArea('presets');
        }
      } else if (focusArea === 'reset') {
        setFocusArea('bands');
      } else if (focusArea === 'done') {
        if (isCustomPreset) {
          setFocusArea('reset');
        } else {
          setFocusArea('bands');
        }
      }
    },
    onDown: () => {
      if (focusArea === 'presets') {
        if (presetIndex + presetsPerRow < EQUALIZER_PRESETS.length) {
          setPresetIndex(presetIndex + presetsPerRow);
        } else {
          setFocusArea('bands');
        }
      } else if (focusArea === 'bands') {
        if (isCustomPreset) {
          handleBandChange(bandIndex, -1);
        } else {
          setFocusArea('done');
        }
      } else if (focusArea === 'reset') {
        setFocusArea('done');
      }
    },
    onLeft: () => {
      if (focusArea === 'presets') {
        if (presetIndex > 0) {
          setPresetIndex(presetIndex - 1);
        }
      } else if (focusArea === 'bands') {
        if (bandIndex > 0) {
          setBandIndex(bandIndex - 1);
        } else {
          setFocusArea('presets');
        }
      }
    },
    onRight: () => {
      if (focusArea === 'presets') {
        if (presetIndex < EQUALIZER_PRESETS.length - 1) {
          setPresetIndex(presetIndex + 1);
        } else {
          setFocusArea('bands');
        }
      } else if (focusArea === 'bands') {
        if (bandIndex < EQUALIZER_FREQUENCIES.length - 1) {
          setBandIndex(bandIndex + 1);
        } else if (isCustomPreset) {
          setFocusArea('reset');
        } else {
          setFocusArea('done');
        }
      } else if (focusArea === 'reset') {
        setFocusArea('done');
      }
    },
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Equalizer</Text>
            <Text style={styles.subtitle}>
              Use D-pad to navigate • OK to select
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.presetsSection}>
              <Text style={styles.sectionTitle}>Presets</Text>
              <View style={styles.presetsGrid}>
                {EQUALIZER_PRESETS.map((preset, idx) => (
                  <TVPresetButton
                    key={preset.id}
                    preset={preset}
                    isSelected={preset.id === equalizerPreset}
                    isFocused={focusArea === 'presets' && presetIndex === idx}
                    accentColor={accentColor}
                    onPress={() => handlePresetSelect(preset.id)}
                    onFocus={() => {
                      setFocusArea('presets');
                      setPresetIndex(idx);
                    }}
                  />
                ))}
              </View>
            </View>

            <View style={styles.bandsSection}>
              <View style={styles.bandsSectionHeader}>
                <Text style={styles.sectionTitle}>
                  {isCustomPreset ? 'Custom Bands' : `${currentPreset?.name ?? 'Preset'} Bands`}
                </Text>
                {isCustomPreset && (
                  <Pressable
                    onPress={handleResetCustom}
                    style={[
                      styles.resetButton,
                      focusArea === 'reset' && { backgroundColor: 'rgba(255,255,255,0.2)' },
                    ]}
                  >
                    <Text style={[styles.resetButtonText, { color: accentColor }]}>Reset</Text>
                    {focusArea === 'reset' && (
                      <View style={[styles.resetFocusBorder, { borderColor: accentColor }]} />
                    )}
                  </Pressable>
                )}
              </View>

              <View style={styles.bandsRow}>
                {EQUALIZER_FREQUENCIES.map((freq, idx) => (
                  <TVBandSlider
                    key={freq.frequency}
                    index={idx}
                    frequency={freq.label}
                    value={localBands[idx] ?? 0}
                    isFocused={focusArea === 'bands' && bandIndex === idx}
                    isCustom={isCustomPreset}
                    accentColor={accentColor}
                  />
                ))}
              </View>

              <View style={styles.gainLabels}>
                <Text style={styles.gainRangeLabel}>+{MAX_GAIN}dB</Text>
                <Text style={styles.gainRangeLabel}>0dB</Text>
                <Text style={styles.gainRangeLabel}>{MIN_GAIN}dB</Text>
              </View>

              {isCustomPreset && focusArea === 'bands' && (
                <View style={styles.bandHint}>
                  <Ionicons name="arrow-up" size={16} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.hintText}> / </Text>
                  <Ionicons name="arrow-down" size={16} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.hintText}> to adjust gain</Text>
                </View>
              )}

              {!isCustomPreset && (
                <View style={styles.customHint}>
                  <Text style={styles.customHintText}>
                    Select "Custom" to adjust bands manually
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={[
                styles.doneButton,
                { backgroundColor: accentColor },
                focusArea === 'done' && styles.doneButtonFocused,
              ]}
            >
              <Text style={styles.doneButtonText}>Done</Text>
              {focusArea === 'done' && (
                <View style={[styles.doneFocusBorder, { borderColor: '#fff' }]} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 1200,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    padding: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginTop: 8,
  },
  content: {
    flexDirection: 'row',
    padding: 32,
    gap: 48,
  },
  presetsSection: {
    width: 320,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetButton: {
    width: 96,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  presetButtonText: {
    fontSize: 14,
  },
  presetFocusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: tvConstants.focusRingWidth,
    borderRadius: 12,
  },
  bandsSection: {
    flex: 1,
  },
  bandsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  resetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  resetFocusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: tvConstants.focusRingWidth,
    borderRadius: 8,
  },
  bandsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  bandContainer: {
    alignItems: 'center',
    width: 64,
  },
  gainLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  sliderWrapper: {
    height: 180,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
  },
  trackFill: {
    position: 'absolute',
    borderRadius: 5,
  },
  centerMark: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  thumb: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  focusBorder: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderWidth: tvConstants.focusRingWidth,
  },
  freqLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 8,
  },
  gainLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  gainRangeLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  bandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  hintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  customHint: {
    marginTop: 20,
    alignItems: 'center',
  },
  customHintText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  footer: {
    padding: 32,
    paddingTop: 0,
    alignItems: 'center',
  },
  doneButton: {
    paddingVertical: 18,
    paddingHorizontal: 64,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  doneButtonFocused: {
    transform: [{ scale: tvConstants.focusScale }],
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  doneFocusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: tvConstants.focusRingWidth,
    borderRadius: 12,
  },
});
