import { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  radarrService,
  sonarrService,
  type RadarrRootFolder,
  type RadarrQualityProfile,
  type SonarrRootFolder,
  type SonarrQualityProfile,
} from '@/api';
import { colors } from '@/theme';
import { RadioOption, CheckboxOption } from './RadioOption';

interface AddToArrModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'movie' | 'tv';
  tmdbId?: number;
  tvdbId?: number;
  title: string;
  year?: number;
}

export function AddToArrModal({
  visible,
  onClose,
  type,
  tmdbId,
  tvdbId,
  title,
  year,
}: AddToArrModalProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const radarrConfigured = radarrService.isConfigured();
  const sonarrConfigured = sonarrService.isConfigured();

  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [rootFolders, setRootFolders] = useState<RadarrRootFolder[] | SonarrRootFolder[]>([]);
  const [qualityProfiles, setQualityProfiles] = useState<RadarrQualityProfile[] | SonarrQualityProfile[]>([]);
  const [selectedRootFolder, setSelectedRootFolder] = useState<string | null>(null);
  const [selectedQualityProfile, setSelectedQualityProfile] = useState<number | null>(null);
  const [searchForMedia, setSearchForMedia] = useState(true);
  const [existingItem, setExistingItem] = useState<any>(null);

  useEffect(() => {
    if (visible) loadOptions();
  }, [visible]);

  const loadOptions = async () => {
    setIsLoading(true);
    setExistingItem(null);
    try {
      if (type === 'movie' && radarrConfigured && tmdbId) {
        const [folders, profiles, existing] = await Promise.all([
          radarrService.getRootFolders(),
          radarrService.getQualityProfiles(),
          radarrService.getMovieByTmdbId(tmdbId),
        ]);
        setRootFolders(folders);
        setQualityProfiles(profiles);
        setExistingItem(existing);
        if (folders.length > 0 && !selectedRootFolder) setSelectedRootFolder(folders[0].path);
        if (profiles.length > 0 && !selectedQualityProfile) setSelectedQualityProfile(profiles[0].id);
      } else if (type === 'tv' && sonarrConfigured && tvdbId) {
        const [folders, profiles, existing] = await Promise.all([
          sonarrService.getRootFolders(),
          sonarrService.getQualityProfiles(),
          sonarrService.getSeriesByTvdbId(tvdbId),
        ]);
        setRootFolders(folders);
        setQualityProfiles(profiles);
        setExistingItem(existing);
        if (folders.length > 0 && !selectedRootFolder) setSelectedRootFolder(folders[0].path);
        if (profiles.length > 0 && !selectedQualityProfile) setSelectedQualityProfile(profiles[0].id);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load options');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedRootFolder || !selectedQualityProfile) {
      Alert.alert('Error', 'Please select a root folder and quality profile');
      return;
    }

    setIsAdding(true);
    try {
      if (type === 'movie' && tmdbId) {
        await radarrService.addMovie({
          tmdbId,
          title,
          qualityProfileId: selectedQualityProfile,
          rootFolderPath: selectedRootFolder,
          monitored: true,
          searchForMovie: searchForMedia,
        });
        Alert.alert('Success', `${title} added to Radarr`, [{ text: 'OK', onPress: onClose }]);
      } else if (type === 'tv' && tvdbId) {
        await sonarrService.addSeries({
          tvdbId,
          title,
          qualityProfileId: selectedQualityProfile,
          rootFolderPath: selectedRootFolder,
          monitored: true,
          searchForMissingEpisodes: searchForMedia,
        });
        Alert.alert('Success', `${title} added to Sonarr`, [{ text: 'OK', onPress: onClose }]);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add media');
    } finally {
      setIsAdding(false);
    }
  };

  if (!visible) return null;

  const isConfigured = type === 'movie' ? radarrConfigured : sonarrConfigured;
  const serviceName = type === 'movie' ? 'Radarr' : 'Sonarr';

  const renderHeader = (headerTitle: string) => (
    <View style={styles.header}>
      <Text style={styles.title}>{headerTitle}</Text>
      <Pressable onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={24} color="#fff" />
      </Pressable>
    </View>
  );

  if (!isConfigured) {
    return (
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {renderHeader(`Add to ${serviceName}`)}
          <View style={styles.content}>
            <Ionicons name="alert-circle-outline" size={48} color="#f59e0b" />
            <Text style={styles.messageText}>{serviceName} is not configured. Go to Settings to connect.</Text>
          </View>
        </View>
      </View>
    );
  }

  if (existingItem) {
    return (
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {renderHeader(`Already in ${serviceName}`)}
          <View style={styles.content}>
            <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
            <Text style={styles.messageText}>{title} is already in your {serviceName} library.</Text>
            {existingItem.hasFile !== undefined && (
              <Text style={styles.statusText}>{existingItem.hasFile ? 'Downloaded' : 'Monitored'}</Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        {renderHeader(`Add to ${serviceName}`)}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentColor} />
          </View>
        ) : (
          <ScrollView style={styles.scrollView}>
            <Text style={styles.mediaTitle}>{title}</Text>
            {year && <Text style={styles.mediaYear}>{year}</Text>}

            <Text style={styles.sectionTitle}>Root Folder</Text>
            {rootFolders.map((folder) => (
              <RadioOption
                key={folder.id}
                label={folder.path}
                selected={selectedRootFolder === folder.path}
                onPress={() => setSelectedRootFolder(folder.path)}
                accentColor={accentColor}
              />
            ))}

            <Text style={styles.sectionTitle}>Quality Profile</Text>
            {qualityProfiles.map((profile) => (
              <RadioOption
                key={profile.id}
                label={profile.name}
                selected={selectedQualityProfile === profile.id}
                onPress={() => setSelectedQualityProfile(profile.id)}
                accentColor={accentColor}
              />
            ))}

            <CheckboxOption
              label={`Search for ${type === 'movie' ? 'movie' : 'episodes'} after adding`}
              checked={searchForMedia}
              onPress={() => setSearchForMedia(!searchForMedia)}
              accentColor={accentColor}
            />

            <Pressable
              style={[styles.addButton, { backgroundColor: accentColor }]}
              onPress={handleAdd}
              disabled={isAdding}
            >
              {isAdding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.addButtonText}>Add to {serviceName}</Text>
              )}
            </Pressable>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  messageText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  statusText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    padding: 16,
  },
  mediaTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mediaYear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  addButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
