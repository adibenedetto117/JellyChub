import { View, Text, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { SUBTITLE_TEXT_COLORS, SUBTITLE_BG_COLORS, SUBTITLE_SIZES } from '@/constants/subtitleStyles';
import type { SubtitleFontColor, SubtitleBackgroundColor, SubtitleSize } from '@/types/player';

interface SubtitleSettingsProps {
  subtitleSize: SubtitleSize;
  subtitleTextColor: SubtitleFontColor;
  subtitleBackgroundColor: SubtitleBackgroundColor;
  subtitleBackgroundOpacity: number;
  accentColor: string;
  onSizeChange: (size: SubtitleSize) => void;
  onTextColorChange: (color: SubtitleFontColor) => void;
  onBackgroundColorChange: (color: SubtitleBackgroundColor) => void;
  onOpacityChange: (opacity: number) => void;
}

export function SubtitleSettings({
  subtitleSize,
  subtitleTextColor,
  subtitleBackgroundColor,
  subtitleBackgroundOpacity,
  accentColor,
  onSizeChange,
  onTextColorChange,
  onBackgroundColorChange,
  onOpacityChange,
}: SubtitleSettingsProps) {
  const previewFontSize = subtitleSize === 'small' ? 14 : subtitleSize === 'large' ? 22 : subtitleSize === 'extraLarge' ? 28 : 18;

  return (
    <>
      {/* Font Size */}
      <View style={styles.section}>
        <Text style={styles.label}>Font Size</Text>
        <View style={styles.row}>
          {SUBTITLE_SIZES.map((size) => (
            <Pressable
              key={size.value}
              onPress={() => onSizeChange(size.value)}
              style={[
                styles.chip,
                subtitleSize === size.value && { backgroundColor: accentColor },
              ]}
            >
              <Text style={styles.chipText}>{size.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Background Opacity */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Background Opacity: {Math.round(subtitleBackgroundOpacity * 100)}%
        </Text>
        <Slider
          value={subtitleBackgroundOpacity}
          onValueChange={onOpacityChange}
          minimumValue={0}
          maximumValue={1}
          step={0.05}
          minimumTrackTintColor={accentColor}
          maximumTrackTintColor="#3f3f46"
          thumbTintColor={accentColor}
        />
      </View>

      {/* Text Color */}
      <View style={styles.section}>
        <Text style={styles.label}>Text Color</Text>
        <View style={styles.colorRow}>
          {SUBTITLE_TEXT_COLORS.map((tc) => (
            <Pressable
              key={tc.color}
              onPress={() => onTextColorChange(tc.color)}
              style={styles.colorItem}
            >
              <View
                style={[
                  styles.colorCircle,
                  { backgroundColor: tc.color },
                  subtitleTextColor === tc.color && { borderWidth: 3, borderColor: accentColor },
                ]}
              />
              <Text
                style={[
                  styles.colorName,
                  subtitleTextColor === tc.color && styles.colorNameSelected,
                ]}
              >
                {tc.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Background Color */}
      <View style={styles.section}>
        <Text style={styles.label}>Background Color</Text>
        <View style={styles.colorRow}>
          {SUBTITLE_BG_COLORS.map((bg) => (
            <Pressable
              key={bg.color}
              onPress={() => onBackgroundColorChange(bg.color)}
              style={styles.colorItem}
            >
              <View
                style={[
                  styles.colorCircle,
                  { backgroundColor: bg.color },
                  subtitleBackgroundColor === bg.color && { borderWidth: 3, borderColor: accentColor },
                ]}
              />
              <Text
                style={[
                  styles.colorName,
                  subtitleBackgroundColor === bg.color && styles.colorNameSelected,
                ]}
              >
                {bg.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Preview */}
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Preview</Text>
        <View
          style={[
            styles.previewBox,
            {
              backgroundColor: subtitleBackgroundColor === 'none'
                ? 'transparent'
                : `${subtitleBackgroundColor}${Math.round(subtitleBackgroundOpacity * 255).toString(16).padStart(2, '0')}`,
            },
          ]}
        >
          <Text style={{ color: subtitleTextColor, fontSize: previewFontSize }}>
            Sample Subtitle Text
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#27272a',
  },
  chipText: {
    color: '#fff',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorItem: {
    alignItems: 'center',
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  colorName: {
    fontSize: 12,
    marginTop: 4,
    color: 'rgba(255,255,255,0.5)',
  },
  colorNameSelected: {
    color: '#fff',
  },
  preview: {
    paddingVertical: 16,
  },
  previewLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 8,
  },
  previewBox: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
