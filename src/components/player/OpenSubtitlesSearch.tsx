import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';
import {
  openSubtitlesService,
  type OpenSubtitlesSearchResult,
} from '@/services';

const SUBTITLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
];

interface Props {
  onClose: () => void;
  onSelectSubtitle: (cues: Array<{ start: number; end: number; text: string }>) => void;
  initialQuery?: string;
  initialYear?: number;
  type?: 'movie' | 'episode';
  seasonNumber?: number;
  episodeNumber?: number;
  tmdbId?: number;
  imdbId?: string;
}

export function OpenSubtitlesSearch({
  onClose,
  onSelectSubtitle,
  initialQuery = '',
  initialYear,
  type,
  seasonNumber,
  episodeNumber,
  tmdbId,
  imdbId,
}: Props) {
  const { accentColor } = useSettingsStore();
  const [query, setQuery] = useState(initialQuery);
  const [year, setYear] = useState(initialYear?.toString() || '');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [results, setResults] = useState<OpenSubtitlesSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim() && !tmdbId && !imdbId) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      const response = await openSubtitlesService.searchSubtitles({
        query: query.trim() || undefined,
        tmdbId,
        imdbId,
        year: year ? parseInt(year, 10) : undefined,
        languages: [selectedLanguage],
        type,
        seasonNumber,
        episodeNumber,
        machineTranslated: 'exclude',
        aiTranslated: 'exclude',
      });

      setResults(response.data);
      if (response.data.length === 0) {
        setError('No subtitles found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search subtitles');
    } finally {
      setIsSearching(false);
    }
  }, [query, year, selectedLanguage, tmdbId, imdbId, type, seasonNumber, episodeNumber]);

  const handleDownload = useCallback(async (result: OpenSubtitlesSearchResult) => {
    const fileId = result.attributes.files[0]?.file_id;
    if (!fileId) {
      setError('No subtitle file available');
      return;
    }

    setIsDownloading(true);
    setDownloadingId(result.id);
    setError(null);

    try {
      const localPath = await openSubtitlesService.downloadSubtitle(fileId);
      const content = await openSubtitlesService.loadSubtitleContent(localPath);
      const cues = openSubtitlesService.parseSubtitleCues(content);

      if (cues.length === 0) {
        setError('Failed to parse subtitle file');
        return;
      }

      onSelectSubtitle(cues);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to download subtitle');
    } finally {
      setIsDownloading(false);
      setDownloadingId(null);
    }
  }, [onSelectSubtitle, onClose]);

  const getLanguageName = (code: string) => {
    return SUBTITLE_LANGUAGES.find((l) => l.code === code)?.name || code.toUpperCase();
  };

  const formatDownloadCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modal}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="search" size={18} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Search Subtitles</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.searchForm}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Movie or TV show name"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.searchInput}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />

          <View style={styles.searchRow}>
            <TextInput
              value={year}
              onChangeText={setYear}
              placeholder="Year"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={[styles.searchInput, styles.yearInput]}
              keyboardType="number-pad"
              maxLength={4}
            />

            <Pressable
              style={styles.languageButton}
              onPress={() => setShowLanguagePicker(true)}
            >
              <Text style={styles.languageText}>{getLanguageName(selectedLanguage)}</Text>
              <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          <Pressable
            style={[styles.searchButton, { backgroundColor: accentColor }]}
            onPress={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
          {results.map((result) => {
            const isCurrentDownloading = downloadingId === result.id;
            const attrs = result.attributes;

            return (
              <Pressable
                key={result.id}
                style={styles.resultItem}
                onPress={() => handleDownload(result)}
                disabled={isDownloading}
              >
                <View style={styles.resultInfo}>
                  <Text style={styles.resultRelease} numberOfLines={2}>
                    {attrs.release || attrs.feature_details?.title || 'Unknown'}
                  </Text>
                  <View style={styles.resultMeta}>
                    <Text style={styles.resultMetaText}>
                      {getLanguageName(attrs.language)}
                    </Text>
                    <Text style={styles.resultMetaDot}>-</Text>
                    <Text style={styles.resultMetaText}>
                      {formatDownloadCount(attrs.download_count)} downloads
                    </Text>
                    {attrs.hearing_impaired && (
                      <>
                        <Text style={styles.resultMetaDot}>-</Text>
                        <Text style={[styles.resultMetaText, { color: accentColor }]}>HI</Text>
                      </>
                    )}
                    {attrs.from_trusted && (
                      <>
                        <Text style={styles.resultMetaDot}>-</Text>
                        <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
                      </>
                    )}
                  </View>
                </View>
                <View style={styles.resultAction}>
                  {isCurrentDownloading ? (
                    <ActivityIndicator color={accentColor} size="small" />
                  ) : (
                    <Ionicons name="download-outline" size={20} color="rgba(255,255,255,0.6)" />
                  )}
                </View>
              </Pressable>
            );
          })}

          {results.length === 0 && !isSearching && !error && (
            <View style={styles.emptyState}>
              <Ionicons name="chatbox-outline" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>Search for subtitles above</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by OpenSubtitles.com</Text>
        </View>
      </View>

      {showLanguagePicker && (
        <View style={styles.pickerOverlay}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setShowLanguagePicker(false)} />
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Language</Text>
              <Pressable onPress={() => setShowLanguagePicker(false)} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>
            <ScrollView style={styles.pickerList}>
              {SUBTITLE_LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  style={[
                    styles.pickerItem,
                    selectedLanguage === lang.code && { backgroundColor: accentColor + '30' },
                  ]}
                  onPress={() => {
                    setSelectedLanguage(lang.code);
                    setShowLanguagePicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{lang.name}</Text>
                  {selectedLanguage === lang.code && (
                    <Ionicons name="checkmark" size={18} color={accentColor} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  modal: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    width: '90%',
    maxWidth: 450,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchForm: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  yearInput: {
    flex: 1,
    marginBottom: 0,
  },
  languageButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  languageText: {
    color: '#fff',
    fontSize: 15,
  },
  searchButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  resultInfo: {
    flex: 1,
    marginRight: 12,
  },
  resultRelease: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  resultMetaText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  resultMetaDot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginHorizontal: 6,
  },
  resultAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 12,
  },
  footer: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  pickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerModal: {
    backgroundColor: '#2c2c2e',
    borderRadius: 16,
    width: '80%',
    maxWidth: 300,
    maxHeight: '60%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  pickerItemText: {
    color: '#fff',
    fontSize: 15,
  },
});
