import { useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { RefreshPanelProps } from './types';

export function RefreshPanel({ item, onRefresh, isPending }: RefreshPanelProps) {
  const [replaceMetadata, setReplaceMetadata] = useState(false);
  const [replaceImages, setReplaceImages] = useState(false);

  const handleRefresh = useCallback(async () => {
    await onRefresh(replaceMetadata, replaceImages);
  }, [replaceMetadata, replaceImages, onRefresh]);

  const isFolder = item.IsFolder || item.Type === 'Series' || item.Type === 'Season' || item.Type === 'MusicAlbum';

  return (
    <View style={styles.container}>
      <View style={styles.infoSection}>
        <View style={styles.infoIcon}>
          <Ionicons name="refresh" size={32} color="#7c3aed" />
        </View>
        <Text style={styles.infoTitle}>Refresh Metadata</Text>
        <Text style={styles.infoText}>
          Scan this item against your configured metadata providers to update information and images.
        </Text>
      </View>

      <View style={styles.optionsSection}>
        <Text style={styles.sectionTitle}>Options</Text>

        <Pressable
          onPress={() => setReplaceMetadata(!replaceMetadata)}
          style={styles.optionRow}
        >
          <View style={[styles.checkbox, replaceMetadata && styles.checkboxChecked]}>
            {replaceMetadata && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionLabel}>Replace all metadata</Text>
            <Text style={styles.optionHint}>Overwrite existing data with new values</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setReplaceImages(!replaceImages)}
          style={styles.optionRow}
        >
          <View style={[styles.checkbox, replaceImages && styles.checkboxChecked]}>
            {replaceImages && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionLabel}>Replace all images</Text>
            <Text style={styles.optionHint}>Download new poster and backdrop images</Text>
          </View>
        </Pressable>
      </View>

      {isFolder && (
        <View style={styles.noteSection}>
          <Ionicons name="information-circle" size={18} color="rgba(255,255,255,0.5)" />
          <Text style={styles.noteText}>
            This will also refresh all child items (episodes, tracks, etc.)
          </Text>
        </View>
      )}

      <Pressable
        onPress={handleRefresh}
        disabled={isPending}
        style={[styles.refreshButton, isPending && styles.buttonDisabled]}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.buttonText}>Start Refresh</Text>
          </>
        )}
      </Pressable>

      <Text style={styles.disclaimer}>
        The refresh will run in the background. Changes may take a few moments to appear.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  infoSection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  infoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  optionsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface.default,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  optionHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  noteText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    flex: 1,
  },
  refreshButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  disclaimer: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
