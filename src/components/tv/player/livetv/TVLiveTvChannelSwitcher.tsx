import { useCallback } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';
import type { LiveTvChannel } from '@/types/livetv';

interface TVLiveTvChannelSwitcherProps {
  visible: boolean;
  channels: LiveTvChannel[];
  currentChannelId: string;
  accentColor: string;
  onChannelSelect: (channel: LiveTvChannel) => void;
}

export function TVLiveTvChannelSwitcher({
  visible,
  channels,
  currentChannelId,
  accentColor,
  onChannelSelect,
}: TVLiveTvChannelSwitcherProps) {
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
          {isActive && <Ionicons name="play" size={20} color={accentColor} />}
        </Pressable>
      );
    },
    [currentChannelId, onChannelSelect, accentColor]
  );

  if (!visible) return null;

  return (
    <View style={styles.channelListContainer}>
      <View style={styles.channelListHeader}>
        <Text style={styles.channelListTitle}>{t('liveTV.channels')}</Text>
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
          length: 72,
          offset: 72 * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  channelListContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 400,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRightWidth: 1,
    borderRightColor: colors.border.default,
  },
  channelListHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  channelListTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  channelList: {
    flex: 1,
  },
  channelListContent: {
    paddingBottom: 40,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    height: 72,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  channelNumber: {
    color: colors.text.tertiary,
    fontSize: 18,
    fontWeight: '600',
    width: 60,
  },
  channelItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  channelItemName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  channelItemProgram: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginTop: 4,
  },
});
