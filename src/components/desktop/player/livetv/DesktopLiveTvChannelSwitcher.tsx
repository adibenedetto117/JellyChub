import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';
import type { LiveTvChannel } from '@/types/livetv';

interface DesktopLiveTvChannelSwitcherProps {
  visible: boolean;
  channels: LiveTvChannel[];
  currentChannelId: string;
  accentColor: string;
  onChannelSelect: (channel: LiveTvChannel) => void;
  onClose: () => void;
}

export function DesktopLiveTvChannelSwitcher({
  visible,
  channels,
  currentChannelId,
  accentColor,
  onChannelSelect,
  onClose,
}: DesktopLiveTvChannelSwitcherProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChannels = channels.filter((channel) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      channel.Name.toLowerCase().includes(query) ||
      channel.Number?.toLowerCase().includes(query) ||
      channel.ChannelNumber?.toLowerCase().includes(query)
    );
  });

  const renderChannelItem = useCallback(
    ({ item }: { item: LiveTvChannel }) => {
      const isActive = item.Id === currentChannelId;
      return (
        <Pressable
          onPress={() => {
            onChannelSelect(item);
            onClose();
          }}
          style={({ hovered }: { hovered?: boolean }) => [
            styles.channelItem,
            isActive && { backgroundColor: accentColor + '30' },
            hovered && !isActive && styles.channelItemHovered,
          ]}
        >
          <Text style={styles.channelNumber}>
            {item.Number ?? item.ChannelNumber ?? '-'}
          </Text>
          <View style={styles.channelItemInfo}>
            <Text
              style={[styles.channelItemName, isActive && { color: accentColor }]}
              numberOfLines={1}
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
    [currentChannelId, onChannelSelect, onClose, accentColor]
  );

  if (!visible) return null;

  return (
    <View style={styles.sidePanel}>
      <View style={styles.sidePanelHeader}>
        <Text style={styles.sidePanelTitle}>{t('liveTV.channels')}</Text>
        <Pressable onPress={onClose} style={styles.closePanelButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.text.tertiary} />
        <input
          type="text"
          placeholder={t('liveTV.searchChannels') || 'Search channels...'}
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchQuery(e.target.value)
          }
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: 14,
            marginLeft: 8,
          }}
        />
        {searchQuery && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filteredChannels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item.Id}
        style={styles.channelList}
        contentContainerStyle={styles.channelListContent}
        initialScrollIndex={
          filteredChannels.length > 0
            ? Math.max(
                0,
                filteredChannels.findIndex((ch) => ch.Id === currentChannelId)
              )
            : 0
        }
        getItemLayout={(_, index) => ({
          length: 64,
          offset: 64 * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sidePanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 360,
    backgroundColor: 'rgba(10,10,10,0.98)',
    borderLeftWidth: 1,
    borderLeftColor: colors.border.default,
  },
  sidePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  sidePanelTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  closePanelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  channelItemHovered: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  channelNumber: {
    color: colors.text.tertiary,
    fontSize: 14,
    fontWeight: '600',
    width: 48,
    fontFamily: 'monospace',
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
    marginTop: 3,
  },
});
