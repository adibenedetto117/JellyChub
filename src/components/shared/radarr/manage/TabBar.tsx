import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { RADARR_ORANGE } from '../constants';
import type { TabType } from './types';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TABS: { key: TabType; icon: string; label: string }[] = [
  { key: 'library', icon: 'library', label: 'Library' },
  { key: 'queue', icon: 'cloud-download', label: 'Queue' },
  { key: 'search', icon: 'search', label: 'Search' },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <View style={styles.tabRow}>
      {TABS.map((tab) => (
        <Pressable
          key={tab.key}
          style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
          onPress={() => onTabChange(tab.key)}
        >
          <Ionicons
            name={tab.icon as any}
            size={16}
            color={activeTab === tab.key ? RADARR_ORANGE : colors.text.muted}
          />
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing[4],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[1],
    marginBottom: spacing[3],
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2.5],
    gap: spacing[1.5],
    borderRadius: borderRadius.md,
  },
  tabBtnActive: {
    backgroundColor: colors.surface.elevated,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.muted,
  },
  tabTextActive: {
    color: RADARR_ORANGE,
  },
});
