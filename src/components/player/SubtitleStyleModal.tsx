import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSettingsStore } from '@/stores';
import type { SubtitleSize, SubtitlePosition, SubtitleFontColor, SubtitleBackgroundColor, SubtitleOutlineStyle } from '@/types/player';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SIZE_OPTIONS: { value: SubtitleSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extraLarge', label: 'Extra Large' },
];

const COLOR_OPTIONS: { value: SubtitleFontColor; label: string }[] = [
  { value: '#ffffff', label: 'White' },
  { value: '#ffff00', label: 'Yellow' },
  { value: '#00ffff', label: 'Cyan' },
  { value: '#00ff00', label: 'Green' },
];

const BG_COLOR_OPTIONS: { value: SubtitleBackgroundColor; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: '#000000', label: 'Black' },
  { value: '#333333', label: 'Dark Gray' },
];

const OUTLINE_OPTIONS: { value: SubtitleOutlineStyle; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'outline', label: 'Outline' },
  { value: 'shadow', label: 'Shadow' },
  { value: 'both', label: 'Both' },
];

const POSITION_OPTIONS: { value: SubtitlePosition; label: string }[] = [
  { value: 'bottom', label: 'Bottom' },
  { value: 'top', label: 'Top' },
];

export function SubtitleStyleModal({ visible, onClose }: Props) {
  const { accentColor, player, updatePlayerSettings } = useSettingsStore();

  if (!visible) return null;

  const renderOptionRow = <T extends string>(
    label: string,
    options: { value: T; label: string }[],
    currentValue: T,
    onSelect: (value: T) => void,
    renderColor?: boolean
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const isSelected = currentValue === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                styles.optionButton,
                isSelected && { backgroundColor: accentColor },
              ]}
            >
              {renderColor && option.value !== 'none' ? (
                <View style={styles.colorOptionContent}>
                  <View style={[styles.colorSwatch, { backgroundColor: option.value }]} />
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Subtitle Appearance</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeX}>
              <View style={[styles.closeLine, { transform: [{ rotate: '45deg' }] }]} />
              <View style={[styles.closeLine, { transform: [{ rotate: '-45deg' }] }]} />
            </View>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.previewContainer}>
            <View
              style={[
                styles.previewBox,
                player.subtitleBackgroundColor !== 'none' && {
                  backgroundColor: `${player.subtitleBackgroundColor}${Math.round(player.subtitleBackgroundOpacity * 255).toString(16).padStart(2, '0')}`,
                },
              ]}
            >
              <Text
                style={[
                  styles.previewText,
                  {
                    color: player.subtitleTextColor,
                    fontSize: player.subtitleSize === 'small' ? 12 : player.subtitleSize === 'medium' ? 14 : player.subtitleSize === 'large' ? 16 : 20,
                  },
                  player.subtitleOutlineStyle === 'shadow' && {
                    textShadowColor: 'rgba(0,0,0,0.8)',
                    textShadowOffset: { width: 2, height: 2 },
                    textShadowRadius: 3,
                  },
                  player.subtitleOutlineStyle === 'outline' && {
                    textShadowColor: '#000',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 3,
                  },
                  player.subtitleOutlineStyle === 'both' && {
                    textShadowColor: '#000',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 4,
                  },
                ]}
              >
                Preview Subtitle Text
              </Text>
            </View>
          </View>

          {renderOptionRow(
            'Font Size',
            SIZE_OPTIONS,
            player.subtitleSize,
            (value) => updatePlayerSettings({ subtitleSize: value })
          )}

          {renderOptionRow(
            'Font Color',
            COLOR_OPTIONS,
            player.subtitleTextColor,
            (value) => updatePlayerSettings({ subtitleTextColor: value }),
            true
          )}

          {renderOptionRow(
            'Background',
            BG_COLOR_OPTIONS,
            player.subtitleBackgroundColor,
            (value) => updatePlayerSettings({ subtitleBackgroundColor: value }),
            true
          )}

          {player.subtitleBackgroundColor !== 'none' && (
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sectionLabel}>Background Opacity</Text>
                <Text style={styles.sliderValue}>{Math.round(player.subtitleBackgroundOpacity * 100)}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.1}
                maximumValue={1}
                value={player.subtitleBackgroundOpacity}
                onValueChange={(value) => updatePlayerSettings({ subtitleBackgroundOpacity: value })}
                minimumTrackTintColor={accentColor}
                maximumTrackTintColor="rgba(255,255,255,0.3)"
                thumbTintColor={accentColor}
              />
            </View>
          )}

          {renderOptionRow(
            'Text Style',
            OUTLINE_OPTIONS,
            player.subtitleOutlineStyle,
            (value) => updatePlayerSettings({ subtitleOutlineStyle: value })
          )}

          {renderOptionRow(
            'Position',
            POSITION_OPTIONS,
            player.subtitlePosition,
            (value) => updatePlayerSettings({ subtitlePosition: value })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  modal: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    width: '90%',
    maxWidth: 420,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLine: {
    position: 'absolute',
    width: 14,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  content: {
    padding: 18,
  },
  previewContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBox: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  previewText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  optionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
  },
  colorOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sliderValue: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
