import { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { updateItem, applyRemoteSearchResult, refreshItemMetadata } from '@/api/admin';
import type { RemoteSearchResult } from '@/api/admin';
import type { BaseItem } from '@/types/jellyfin';
import type { MetadataEditorProps, MetadataTab } from './types';
import { MetadataForm } from './MetadataForm';
import { IdentifyPanel } from './IdentifyPanel';
import { RefreshPanel } from './RefreshPanel';

const ALL_TABS: { id: MetadataTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'edit', label: 'Edit', icon: 'create-outline' },
  { id: 'identify', label: 'Identify', icon: 'search-outline' },
  { id: 'refresh', label: 'Refresh', icon: 'refresh-outline' },
];

const TYPES_WITHOUT_IDENTIFY = ['Episode', 'Season'];

export function MetadataEditorModal({ visible, onClose, item, onUpdate }: MetadataEditorProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<MetadataTab>('edit');
  const queryClient = useQueryClient();

  const tabs = useMemo(() => {
    if (TYPES_WITHOUT_IDENTIFY.includes(item.Type || '')) {
      return ALL_TABS.filter(tab => tab.id !== 'identify');
    }
    return ALL_TABS;
  }, [item.Type]);

  const handleSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['item', item.Id] });
    queryClient.invalidateQueries({ queryKey: ['items'] });
    onUpdate?.();
  }, [queryClient, item.Id, onUpdate]);

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<BaseItem>) => updateItem(item.Id, updates),
    onSuccess: () => {
      Alert.alert('Success', 'Metadata updated successfully');
      handleSuccess();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update metadata');
    },
  });

  const identifyMutation = useMutation({
    mutationFn: ({ result, replaceAll }: { result: RemoteSearchResult; replaceAll: boolean }) =>
      applyRemoteSearchResult(item.Id, result, {
        replaceAllMetadata: replaceAll,
        replaceAllImages: replaceAll,
      }),
    onSuccess: () => {
      Alert.alert('Success', 'Metadata applied successfully');
      handleSuccess();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to apply metadata');
    },
  });

  const refreshMutation = useMutation({
    mutationFn: ({ replaceMetadata, replaceImages }: { replaceMetadata: boolean; replaceImages: boolean }) =>
      refreshItemMetadata(item.Id, {
        metadataRefreshMode: 'FullRefresh',
        imageRefreshMode: 'FullRefresh',
        replaceAllMetadata: replaceMetadata,
        replaceAllImages: replaceImages,
        recursive: true,
      }),
    onSuccess: () => {
      Alert.alert('Success', 'Refresh started. Changes may take a moment to appear.');
      handleSuccess();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to start refresh');
    },
  });

  const handleSaveMetadata = useCallback(async (updates: Partial<BaseItem>) => {
    await updateMutation.mutateAsync(updates);
  }, [updateMutation]);

  const handleApplyIdentify = useCallback(async (result: RemoteSearchResult, replaceAll: boolean) => {
    await identifyMutation.mutateAsync({ result, replaceAll });
  }, [identifyMutation]);

  const handleRefresh = useCallback(async (replaceMetadata: boolean, replaceImages: boolean) => {
    await refreshMutation.mutateAsync({ replaceMetadata, replaceImages });
  }, [refreshMutation]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.title}>Edit Metadata</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{item.Name}</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.tabs}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              >
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={activeTab === tab.id ? '#7c3aed' : 'rgba(255,255,255,0.5)'}
                />
                <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'edit' && (
              <MetadataForm
                item={item}
                onSave={handleSaveMetadata}
                isPending={updateMutation.isPending}
              />
            )}
            {activeTab === 'identify' && (
              <IdentifyPanel
                item={item}
                onApply={handleApplyIdentify}
                isPending={identifyMutation.isPending}
              />
            )}
            {activeTab === 'refresh' && (
              <RefreshPanel
                item={item}
                onRefresh={handleRefresh}
                isPending={refreshMutation.isPending}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
  },
  tabLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#7c3aed',
  },
  content: {
    flex: 1,
    marginTop: 8,
  },
});
