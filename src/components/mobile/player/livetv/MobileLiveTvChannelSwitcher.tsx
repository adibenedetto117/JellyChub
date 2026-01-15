import { useCallback } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';
import type { LiveTvChannel } from '@/types/livetv';

interface MobileLiveTvChannelSwitcherProps {
  visible: boolean;
  channels: LiveTvChannel[];
  currentChannelId: string;
  accentColor: string;
  onChannelSelect: (channel: LiveTvChannel) => void;
  onClose: () => void;
}

export function MobileLiveTvChannelSwitcher({
  visible,
  channels,
  currentChannelId,
  accentColor,
  onChannelSelect,
  onClose,
}: MobileLiveTvChannelSwitcherProps) {
  const { t } = useTranslation();

  const renderChannelItem = useCallback(
    ({ item }: { item: LiveTvChannel }) => {
      const isActive = item.Id === currentChannelId;
      return (
        <Pressable
          onPress={() => onChannelSelect(item)}
          style={[
            styles.channelItem,
            isActive && { backgroundColor: accentColor + '30' },
          ]}
        >
          <Text style={styles.channelNumber}>
            {item.Number ?? item.ChannelNumber}
          </Text>
          <View style={styles.channelItemInfo}>
            <Text
              style={[styles.channelItemName, isActive && { color: accentColor }]}
            >
              {item.Name}
            </Text>
            {item.CurrentProgram && (
              <Text style={styles.channelItemProgram} numberOfLines={1}>
                {item.CurrentProgram.Name}
              </Text>
            )}
          </View>
          {isActive && <Ionicons name="play" size={16} color={accentColor} />}
        </Pressable>
      );
    },
    [currentChannelId, onChannelSelect, accentColor]
  );

  if (!visible) return null;

  return (
    <Animated.View style={styles.channelListContainer}>
      <View style={styles.channelListHeader}>
        <Text style={styles.channelListTitle}>{t('liveTV.channels')}</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>
      <FlatList
        data={channels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item.Id}
        style={styles.channelList}
        contentContainerStyle={styles.channelListContent}
        initialScrollIndex={Math.max(
          0,
          channels.findIndex((ch) => ch.Id === currentChannelId)
        )}
        getItemLayout={(_, index) => ({
          length: 64,
          offset: 64 * index,
          index,
        })}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  channelListContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderLeftWidth: 1,
    borderLeftColor: colors.border.default,
  },
  channelListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  channelListTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  channelList: {
    flex: 1,
  },
  channelListContent: {
    paddingBottom: 32,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  channelNumber: {
    color: colors.text.tertiary,
    fontSize: 14,
    fontWeight: '600',
    width: 40,
  },
  channelItemInfo: {
    flex: 1,
    marginLeft: 8,
  },
  channelItemName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  channelItemProgram: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 2,
  },
});
