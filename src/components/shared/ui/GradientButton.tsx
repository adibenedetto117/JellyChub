import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface GradientButtonProps {
  icon?: string;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  colors?: [string, string];
  style?: any;
}

export function GradientButton({
  icon,
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  colors: gradientColors = ['#6366f1', '#4f46e5'],
  style,
}: GradientButtonProps) {
  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={[styles.wrapper, style]}>
        <LinearGradient
          colors={disabled ? ['#4b5563', '#374151'] : gradientColors}
          style={[styles.button, disabled && styles.disabled]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              {icon && <Ionicons name={icon as any} size={20} color="#fff" />}
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
        variant === 'outline' ? styles.outline : styles.secondary,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? gradientColors[0] : '#fff'} />
      ) : (
        <>
          {icon && <Ionicons name={icon as any} size={20} color={variant === 'outline' ? gradientColors[0] : '#fff'} />}
          <Text style={[styles.text, variant === 'outline' && { color: gradientColors[0] }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  disabled: {
    opacity: 0.6,
  },
  secondary: {
    backgroundColor: '#27272a',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
