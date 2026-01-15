import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { JELLYSEERR_PURPLE } from './constants';

interface SettingsCardProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string | number;
  action?: string;
  onAction?: () => void;
  isLoading?: boolean;
}

export function SettingsCard({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  action,
  onAction,
  isLoading,
}: SettingsCardProps) {
  return (
    <View style={styles.settingsCard}>
      <View style={[styles.settingsCardIcon, { backgroundColor: `${iconColor || JELLYSEERR_PURPLE}20` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor || JELLYSEERR_PURPLE} />
      </View>
      <View style={styles.settingsCardContent}>
        <Text style={styles.settingsCardTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsCardSubtitle}>{subtitle}</Text>}
      </View>
      {value !== undefined && (
        <Text style={styles.settingsCardValue}>{value}</Text>
      )}
      {action && onAction && (
        <Pressable onPress={onAction} disabled={isLoading} style={styles.settingsCardAction}>
          {isLoading ? (
            <ActivityIndicator size="small" color={JELLYSEERR_PURPLE} />
          ) : (
            <Text style={styles.settingsCardActionText}>{action}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  settingsCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingsCardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsCardSubtitle: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 2,
  },
  settingsCardValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsCardAction: {
    backgroundColor: JELLYSEERR_PURPLE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  settingsCardActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
