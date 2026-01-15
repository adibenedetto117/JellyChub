import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { SonarrLookupResult, SonarrRootFolder, SonarrQualityProfile } from '@/api/external/sonarr';
import { colors, spacing, borderRadius } from '@/theme';
import { formatBytes } from '@/utils';

const SONARR_BLUE = '#35c5f4';
const SONARR_DARK = '#1a3a4a';
const SONARR_GRADIENT = ['#35c5f4', '#1a8fc9', '#0d6ea3'] as const;

export interface AddSeriesModalProps {
  visible: boolean;
  series: SonarrLookupResult | null;
  rootFolders: SonarrRootFolder[];
  qualityProfiles: SonarrQualityProfile[];
  onClose: () => void;
  onAdd: (options: {
    qualityProfileId: number;
    rootFolderPath: string;
    searchForMissingEpisodes: boolean;
    seriesType: 'standard' | 'daily' | 'anime';
  }) => void;
  isAdding: boolean;
}

export function AddSeriesModal({
  visible,
  series,
  rootFolders,
  qualityProfiles,
  onClose,
  onAdd,
  isAdding,
}: AddSeriesModalProps) {
  const [selectedQuality, setSelectedQuality] = useState<number>(qualityProfiles[0]?.id ?? 0);
  const [selectedFolder, setSelectedFolder] = useState<string>(rootFolders[0]?.path ?? '');
  const [searchForMissing, setSearchForMissing] = useState(true);
  const [seriesType, setSeriesType] = useState<'standard' | 'daily' | 'anime'>('standard');

  useEffect(() => {
    if (qualityProfiles.length > 0 && !selectedQuality) {
      setSelectedQuality(qualityProfiles[0].id);
    }
    if (rootFolders.length > 0 && !selectedFolder) {
      setSelectedFolder(rootFolders[0].path);
    }
    if (series) {
      setSeriesType(series.seriesType || 'standard');
    }
  }, [qualityProfiles, rootFolders, series]);

  if (!series) return null;

  const poster = series.images.find((i) => i.coverType === 'poster');
  const posterUrl = series.remotePoster || poster?.remoteUrl || poster?.url;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeInDown.springify()} style={styles.modalContent}>
          <LinearGradient
            colors={[SONARR_DARK, colors.background.secondary]}
            style={styles.modalGradient}
          />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Series</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.seriesPreview}>
              {posterUrl ? (
                <Image source={{ uri: posterUrl }} style={styles.previewPoster} contentFit="cover" />
              ) : (
                <View style={[styles.previewPoster, styles.noPoster]}>
                  <Ionicons name="tv-outline" size={32} color={colors.text.muted} />
                </View>
              )}
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{series.title}</Text>
                <Text style={styles.previewYear}>{series.year}</Text>
                {series.network && (
                  <Text style={styles.previewNetwork}>{series.network}</Text>
                )}
              </View>
            </View>

            <Text style={styles.sectionLabel}>Quality Profile</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionScroll}
            >
              {qualityProfiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  style={({ pressed }) => [
                    styles.optionButton,
                    selectedQuality === profile.id && styles.optionButtonActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSelectedQuality(profile.id)}
                >
                  {selectedQuality === profile.id ? (
                    <LinearGradient colors={SONARR_GRADIENT} style={styles.optionGradient}>
                      <Text style={styles.optionTextActive}>{profile.name}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.optionText}>{profile.name}</Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Series Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionScroll}
            >
              {(['standard', 'daily', 'anime'] as const).map((type) => (
                <Pressable
                  key={type}
                  style={({ pressed }) => [
                    styles.optionButton,
                    seriesType === type && styles.optionButtonActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSeriesType(type)}
                >
                  {seriesType === type ? (
                    <LinearGradient colors={SONARR_GRADIENT} style={styles.optionGradient}>
                      <Text style={styles.optionTextActive}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.optionText}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Root Folder</Text>
            {rootFolders.map((folder) => (
              <Pressable
                key={folder.id}
                style={({ pressed }) => [
                  styles.folderOption,
                  selectedFolder === folder.path && styles.folderOptionActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setSelectedFolder(folder.path)}
              >
                <View style={styles.folderInfo}>
                  <Ionicons
                    name={selectedFolder === folder.path ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedFolder === folder.path ? SONARR_BLUE : colors.text.tertiary}
                  />
                  <Text style={styles.folderPath} numberOfLines={1}>{folder.path}</Text>
                </View>
                <Text style={styles.folderSpace}>{formatBytes(folder.freeSpace)} free</Text>
              </Pressable>
            ))}

            <Pressable
              style={({ pressed }) => [styles.searchToggle, pressed && { opacity: 0.8 }]}
              onPress={() => setSearchForMissing(!searchForMissing)}
            >
              <Ionicons
                name={searchForMissing ? 'checkbox' : 'square-outline'}
                size={24}
                color={SONARR_BLUE}
              />
              <Text style={styles.searchToggleText}>Search for missing episodes</Text>
            </Pressable>
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.addSeriesButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={() => onAdd({
              qualityProfileId: selectedQuality,
              rootFolderPath: selectedFolder,
              searchForMissingEpisodes: searchForMissing,
              seriesType,
            })}
            disabled={isAdding}
          >
            <LinearGradient colors={SONARR_GRADIENT} style={styles.addSeriesGradient}>
              {isAdding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={22} color="#fff" />
                  <Text style={styles.addSeriesButtonText}>Add Series</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: spacing[2],
  },
  modalScroll: {
    padding: spacing[4],
  },
  seriesPreview: {
    flexDirection: 'row',
    marginBottom: spacing[6],
    gap: spacing[4],
  },
  previewPoster: {
    width: 100,
    height: 150,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface.default,
  },
  noPoster: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  previewTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  previewYear: {
    color: colors.text.secondary,
    fontSize: 15,
    marginTop: spacing[1],
  },
  previewNetwork: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginTop: spacing[1],
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing[3],
    marginTop: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionScroll: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  optionButton: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface.default,
    overflow: 'hidden',
  },
  optionButtonActive: {
    backgroundColor: 'transparent',
  },
  optionGradient: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  optionText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  optionTextActive: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  folderOption: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[2],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  folderOptionActive: {
    borderColor: SONARR_BLUE,
    backgroundColor: 'rgba(53, 197, 244, 0.1)',
  },
  folderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  folderPath: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  folderSpace: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: spacing[2],
    marginLeft: spacing[8],
  },
  searchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
  },
  searchToggleText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  addSeriesButton: {
    margin: spacing[4],
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  addSeriesGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  addSeriesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
