import { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { searchRemoteMetadata } from '@/api/admin';
import type { RemoteSearchResult } from '@/api/admin';
import type { IdentifyPanelProps } from './types';
import { getSearchTypeFromItem } from './types';

export function IdentifyPanel({ item, onApply, isPending }: IdentifyPanelProps) {
  const [searchName, setSearchName] = useState(item.Name || '');
  const [searchYear, setSearchYear] = useState(item.ProductionYear?.toString() || '');
  const [results, setResults] = useState<RemoteSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<RemoteSearchResult | null>(null);
  const [replaceAll, setReplaceAll] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchName.trim()) return;

    setIsSearching(true);
    setError(null);
    setResults([]);
    setSelectedResult(null);

    try {
      const searchType = getSearchTypeFromItem(item);
      const yearNum = parseInt(searchYear, 10);

      const searchResults = await searchRemoteMetadata(searchType, {
        SearchInfo: {
          Name: searchName.trim(),
          Year: !isNaN(yearNum) ? yearNum : undefined,
        },
        ItemId: item.Id,
      });

      setResults(searchResults);
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchName, searchYear, item]);

  const handleApply = useCallback(async () => {
    if (!selectedResult) return;
    await onApply(selectedResult, replaceAll);
  }, [selectedResult, replaceAll, onApply]);

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Search</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={searchName}
            onChangeText={setSearchName}
            placeholder="Title"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />
          <TextInput
            style={[styles.input, { width: 80, marginLeft: 8 }]}
            value={searchYear}
            onChangeText={setSearchYear}
            placeholder="Year"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="numeric"
          />
        </View>
        <Pressable
          onPress={handleSearch}
          disabled={isSearching || !searchName.trim()}
          style={[styles.searchButton, (isSearching || !searchName.trim()) && styles.buttonDisabled]}
        >
          {isSearching ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={styles.buttonText}>Search</Text>
            </>
          )}
        </Pressable>
      </View>

      {error && (
        <Text style={styles.error}>{error}</Text>
      )}

      {results.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Results</Text>
          <ScrollView style={styles.resultsList} nestedScrollEnabled>
            {results.map((result, index) => (
              <Pressable
                key={`${result.Name}-${result.ProductionYear}-${index}`}
                onPress={() => setSelectedResult(result)}
                style={[
                  styles.resultItem,
                  selectedResult === result && styles.resultItemSelected,
                ]}
              >
                {result.ImageUrl ? (
                  <Image source={{ uri: result.ImageUrl }} style={styles.resultImage} />
                ) : (
                  <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
                    <Ionicons name="image-outline" size={20} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName} numberOfLines={2}>{result.Name}</Text>
                  {result.ProductionYear && (
                    <Text style={styles.resultYear}>{result.ProductionYear}</Text>
                  )}
                  {result.SearchProviderName && (
                    <Text style={styles.resultProvider}>{result.SearchProviderName}</Text>
                  )}
                </View>
                {selectedResult === result && (
                  <Ionicons name="checkmark-circle" size={24} color="#7c3aed" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {selectedResult && (
        <View style={styles.applySection}>
          <Pressable
            onPress={() => setReplaceAll(!replaceAll)}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, replaceAll && styles.checkboxChecked]}>
              {replaceAll && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Replace all existing metadata</Text>
          </Pressable>

          <Pressable
            onPress={handleApply}
            disabled={isPending}
            style={[styles.applyButton, isPending && styles.buttonDisabled]}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Apply Selected</Text>
            )}
          </Pressable>
        </View>
      )}

      {results.length === 0 && !isSearching && !error && (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>Search for metadata from external providers</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  searchSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surface.default,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  error: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 12,
  },
  resultsSection: {
    flex: 1,
    marginBottom: 16,
  },
  resultsList: {
    maxHeight: 250,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.surface.default,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  resultItemSelected: {
    borderColor: '#7c3aed',
  },
  resultImage: {
    width: 45,
    height: 65,
    borderRadius: 4,
    backgroundColor: colors.background.secondary,
  },
  resultImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  resultYear: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 2,
  },
  resultProvider: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  applySection: {
    marginTop: 'auto',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  checkboxLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  applyButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
