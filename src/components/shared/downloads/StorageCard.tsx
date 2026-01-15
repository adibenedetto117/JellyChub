import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatBytes } from '@/utils';
import { colors } from '@/theme';

interface StorageCardProps {
  usedStorage: number;
  maxStorage: number;
  accentColor: string;
  label: string;
}

export const StorageCard = memo(function StorageCard({
  usedStorage,
  maxStorage,
  accentColor,
  label,
}: StorageCardProps) {
  const storagePercent = maxStorage > 0 ? (usedStorage / maxStorage) * 100 : 0;

  return (
    <View style={styles.storageCard}>
      <View style={styles.storageHeader}>
        <View style={[styles.storageIcon, { backgroundColor: accentColor + '20' }]}>
          <Ionicons name="cloud-download-outline" size={18} color={accentColor} />
        </View>
        <View style={styles.storageInfo}>
          <Text style={styles.storageTitle}>{label}</Text>
          <Text style={styles.storageSubtitle}>
            {formatBytes(usedStorage)} of {formatBytes(maxStorage)} used
          </Text>
        </View>
        <Text style={styles.storagePercent}>{Math.round(storagePercent)}%</Text>
      </View>
      <View style={styles.storageBarBg}>
        <View
          style={[
            styles.storageBarFill,
            {
              width: `${Math.min(100, storagePercent)}%`,
              backgroundColor: storagePercent > 90 ? '#ef4444' : accentColor,
            },
          ]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  storageCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.surface.default,
    borderRadius: 16,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  storageInfo: {
    flex: 1,
  },
  storageTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  storageSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  storagePercent: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  storageBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
