import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { SONARR_BLUE } from '../constants';

export type TabType = 'library' | 'queue' | 'search';

export interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { key: TabType; icon: string; label: string }[] = [
  { key: 'library', icon: 'library', label: 'Library' },
  { key: 'queue', icon: 'cloud-download', label: 'Queue' },
  { key: 'search', icon: 'search', label: 'Search' },
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <View style={styles.tabRow}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
          onPress={() => onTabChange(tab.key)}
        >
          <Ionicons
            name={tab.icon as any}
            size={16}
            color={activeTab === tab.key ? SONARR_BLUE : colors.text.muted}
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
    color: SONARR_BLUE,
  },
});
