import { ScrollView, Pressable, View, Text } from 'react-native';
import { colors } from '@/theme';
import type { TabType } from './types';

interface Tab {
  id: TabType;
  label: string;
  badge?: number;
}

interface AdminTabBarProps {
  tabs: Tab[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  accentColor: string;
}

export function AdminTabBar({ tabs, activeTab, onTabChange, accentColor }: AdminTabBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={{
              backgroundColor: isActive ? '#fff' : colors.surface.default,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: isActive ? '#000' : 'rgba(255,255,255,0.6)',
              fontWeight: '600',
              fontSize: 13,
            }}>
              {tab.label}
            </Text>
            {tab.badge ? (
              <View style={{
                marginLeft: 6,
                backgroundColor: isActive ? 'rgba(0,0,0,0.15)' : accentColor,
                paddingHorizontal: 5,
                paddingVertical: 1,
                borderRadius: 8,
                minWidth: 18,
                alignItems: 'center',
              }}>
                <Text style={{ color: isActive ? '#000' : '#fff', fontSize: 11, fontWeight: '700' }}>
                  {tab.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
