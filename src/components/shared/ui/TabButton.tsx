import { memo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  accentColor: string;
}

export const TabButton = memo(function TabButton({
  label,
  isActive,
  onPress,
  accentColor,
}: TabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        isActive && { borderBottomColor: accentColor, borderBottomWidth: 2 },
      ]}
    >
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
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  text: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
