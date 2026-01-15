import { Pressable, Text, ActivityIndicator } from 'react-native';
import { colors } from '@/theme';
import type { ActionButtonProps } from './types';

export function ActionButton({
  label,
  onPress,
  loading,
  color,
  disabled,
}: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={{
        backgroundColor: colors.surface.default,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        opacity: loading || disabled ? 0.7 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <Text style={{ color: '#fff', fontWeight: '500', fontSize: 13 }}>{label}</Text>
      )}
    </Pressable>
  );
}
