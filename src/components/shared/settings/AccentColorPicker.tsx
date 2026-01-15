import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ACCENT_COLOR_PRESETS } from '@/stores/settingsStore';

interface AccentColorPickerProps {
  selectedColor: string;
  onSelect: (color: string) => void;
}

export function AccentColorPicker({ selectedColor, onSelect }: AccentColorPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">Accent Color</Text>
      <View style={styles.colors} accessibilityRole="radiogroup">
        {ACCENT_COLOR_PRESETS.map((preset) => (
          <Pressable
            key={preset.color}
            onPress={() => onSelect(preset.color)}
            style={styles.colorItem}
            accessible={true}
            accessibilityRole="radio"
            accessibilityLabel={`${preset.name} accent color`}
            accessibilityState={{ checked: selectedColor === preset.color }}
            accessibilityHint="Sets the app accent color"
          >
            <View
              style={[
                styles.colorCircle,
                { backgroundColor: preset.color },
                selectedColor === preset.color && styles.colorSelected,
              ]}
              accessible={false}
            />
            <Text
              style={[
                styles.colorName,
                selectedColor === preset.color && styles.colorNameSelected,
              ]}
              accessible={false}
            >
              {preset.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  colors: {
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
  colorSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  colorName: {
    fontSize: 12,
    marginTop: 4,
    color: 'rgba(255,255,255,0.5)',
  },
  colorNameSelected: {
    color: '#fff',
  },
});
