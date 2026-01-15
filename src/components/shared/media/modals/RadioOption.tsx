import { Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RadioOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accentColor: string;
}

export function RadioOption({ label, selected, onPress, accentColor }: RadioOptionProps) {
  return (
    <Pressable
      style={[styles.optionItem, selected && { borderColor: accentColor }]}
      onPress={onPress}
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? accentColor : 'rgba(255,255,255,0.5)'}
      />
      <Text style={styles.optionText}>{label}</Text>
    </Pressable>
  );
}

interface CheckboxOptionProps {
  label: string;
  checked: boolean;
  onPress: () => void;
  accentColor: string;
}

export function CheckboxOption({ label, checked, onPress, accentColor }: CheckboxOptionProps) {
  return (
    <Pressable style={styles.checkboxRow} onPress={onPress}>
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={24}
        color={checked ? accentColor : 'rgba(255,255,255,0.5)'}
      />
      <Text style={styles.checkboxText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
    gap: 12,
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  checkboxText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
});
