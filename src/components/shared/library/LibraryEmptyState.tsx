import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface LibraryEmptyStateProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  fontSize: { xl: number; sm: number };
  actionLabel?: string;
  onAction?: () => void;
}

export const LibraryEmptyState = memo(function LibraryEmptyState({
  title,
  subtitle,
  icon,
  accentColor,
  fontSize,
  actionLabel,
  onAction,
}: LibraryEmptyStateProps) {
  return (
    <View style={styles.emptyStateContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: accentColor + '20' }]}>
        <Ionicons name={icon} size={48} color={accentColor} />
      </View>
      <Text style={[styles.emptyStateTitle, { fontSize: fontSize.xl }]}>{title}</Text>
      <Text style={[styles.emptyStateSubtitle, { fontSize: fontSize.sm }]}>{subtitle}</Text>
      {actionLabel && onAction && (
        <Pressable
          style={[styles.actionButton, { borderColor: accentColor }]}
          onPress={onAction}
        >
          <Text style={[styles.actionButtonText, { color: accentColor }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  actionButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionButtonText: {
    fontWeight: '600',
  },
});
