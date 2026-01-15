import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatBytes } from '@/utils';
import { colors } from '@/theme';

interface CollapsibleHeaderProps {
  title: string;
  subtitle?: string;
  count: number;
  size: number;
  expanded: boolean;
  onToggle: () => void;
  accentColor: string;
  level?: number;
}

export const CollapsibleHeader = memo(function CollapsibleHeader({
  title,
  subtitle,
  count,
  size,
  expanded,
  onToggle,
  accentColor,
  level = 0,
}: CollapsibleHeaderProps) {
  return (
    <Pressable onPress={onToggle} style={[styles.collapsibleHeader, { paddingLeft: 16 + level * 16 }]}>
      <Ionicons
        name={expanded ? 'chevron-down' : 'chevron-forward'}
        size={18}
        color={accentColor}
        style={styles.chevronIcon}
      />
      <View style={styles.headerInfo}>
        <Text style={styles.collapsibleTitle} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <View style={styles.headerMeta}>
        <Text style={styles.headerCount}>{count} {count === 1 ? 'item' : 'items'}</Text>
        <Text style={styles.headerSize}>{formatBytes(size)}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    marginBottom: 4,
  },
  chevronIcon: {
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  collapsibleTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  headerCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  headerSize: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
});
