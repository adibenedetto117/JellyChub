import { memo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface FilterChipProps {
  label: string;
  icon?: string;
  isActive: boolean;
  onPress: () => void;
  accentColor: string;
}

export const FilterChip = memo(function FilterChip({
  label,
  icon,
  isActive,
  onPress,
  accentColor,
}: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        isActive && { backgroundColor: accentColor + '30', borderColor: accentColor },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={16}
          color={isActive ? accentColor : colors.text.secondary}
        />
      )}
      <Text
        style={[
          styles.text,
          isActive && { color: accentColor },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface.default,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  text: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
});
