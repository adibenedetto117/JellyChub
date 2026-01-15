import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors } from '@/theme';
import { JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK } from './constants';

export interface TabItem {
  id: string;
  label: string;
  visible: boolean;
  badge?: number;
}

interface RequestTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function RequestTabs({ tabs, activeTab, onTabChange }: RequestTabsProps) {
  return (
    <View style={styles.tabBar}>
      {tabs.filter((t) => t.visible).map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable key={tab.id} onPress={() => onTabChange(tab.id)} style={styles.tab}>
            <View style={styles.tabContent}>
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? JELLYSEERR_PURPLE : colors.text.tertiary },
                ]}
              >
                {tab.label}
              </Text>
              {tab.badge !== undefined && (
                <View style={[styles.tabBadge, { backgroundColor: JELLYSEERR_PURPLE }]}>
                  <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
            {isActive && (
              <Animated.View entering={FadeIn.duration(200)}>
                <LinearGradient
                  colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
                  style={styles.tabIndicator}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 24,
  },
  tab: {
    paddingBottom: 8,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tabIndicator: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
  },
});
