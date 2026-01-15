import { View, Text, Pressable } from 'react-native';
import { colors } from '@/theme';
import { TabIcon } from './TabIcon';

interface TabItemProps {
  icon: string;
  title: string;
  accentColor: string;
  isLandingPage: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetLandingPage: () => void;
}

export function TabItem({
  icon,
  title,
  accentColor,
  isLandingPage,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onSetLandingPage,
}: TabItemProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface.default,
      }}
    >
      <Pressable
        onPress={onSetLandingPage}
        style={{ marginRight: 12 }}
      >
        <TabIcon icon={icon} size={36} isActive={isLandingPage} accentColor={accentColor} />
      </Pressable>
      <Pressable onPress={onSetLandingPage} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{title}</Text>
          {isLandingPage && (
            <View
              style={{
                marginLeft: 8,
                paddingHorizontal: 6,
                paddingVertical: 2,
                backgroundColor: accentColor + '30',
                borderRadius: 4,
              }}
            >
              <Text style={{ color: accentColor, fontSize: 10, fontWeight: '600' }}>START</Text>
            </View>
          )}
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={onMoveUp}
          disabled={!canMoveUp}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canMoveUp ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
          }}
        >
          <Text style={{ color: canMoveUp ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 16 }}>
            {'\u2191'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onMoveDown}
          disabled={!canMoveDown}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canMoveDown ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
          }}
        >
          <Text style={{ color: canMoveDown ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 16 }}>
            {'\u2193'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
