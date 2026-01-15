import { memo } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

const JELLYSEERR_PURPLE = '#6366f1';
const JELLYSEERR_PURPLE_DARK = '#4f46e5';

interface JellyseerrActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

export const JellyseerrActionButton = memo(function JellyseerrActionButton({
  icon,
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: JellyseerrActionButtonProps) {
  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={styles.flex}>
        <LinearGradient
          colors={disabled ? ['#4b5563', '#374151'] : [JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
          style={[styles.button, disabled && styles.buttonDisabled]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name={icon as any} size={20} color="#fff" />
              <Text style={styles.text}>{label}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        variant === 'outline' ? styles.buttonOutline : styles.buttonSecondary,
        styles.flex,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? JELLYSEERR_PURPLE : '#fff'} />
      ) : (
        <>
          <Ionicons name={icon as any} size={20} color={variant === 'outline' ? JELLYSEERR_PURPLE : '#fff'} />
          <Text style={[styles.text, variant === 'outline' && styles.textOutline]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonSecondary: {
    backgroundColor: colors.surface.elevated,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: JELLYSEERR_PURPLE,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  textOutline: {
    color: JELLYSEERR_PURPLE,
  },
});
