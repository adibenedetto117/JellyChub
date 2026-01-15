import { Text, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';

interface PillTabButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
  accentColor: string;
}

export const PillTabButton = memo(function PillTabButton({
  label,
  active,
  onPress,
  accentColor,
}: PillTabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, { backgroundColor: active ? accentColor : 'rgba(255,255,255,0.1)' }]}
    >
      <Text style={[styles.text, { color: active ? '#fff' : 'rgba(255,255,255,0.6)' }]}>
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});
