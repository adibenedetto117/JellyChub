import { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import type { MetadataFormProps } from './types';
import type { BaseItem } from '@/types/jellyfin';

export function MetadataForm({ item, onSave, isPending }: MetadataFormProps) {
  const [name, setName] = useState(item.Name || '');
  const [sortName, setSortName] = useState(item.SortName || '');
  const [overview, setOverview] = useState(item.Overview || '');
  const [year, setYear] = useState(item.ProductionYear?.toString() || '');
  const [rating, setRating] = useState(item.CommunityRating?.toString() || '');
  const [genres, setGenres] = useState((item.Genres || []).join(', '));
  const [tags, setTags] = useState((item.Tags || []).join(', '));

  const hasChanges = useMemo(() => {
    return (
      name !== (item.Name || '') ||
      sortName !== (item.SortName || '') ||
      overview !== (item.Overview || '') ||
      year !== (item.ProductionYear?.toString() || '') ||
      rating !== (item.CommunityRating?.toString() || '') ||
      genres !== (item.Genres || []).join(', ') ||
      tags !== (item.Tags || []).join(', ')
    );
  }, [name, sortName, overview, year, rating, genres, tags, item]);

  const handleSave = useCallback(async () => {
    const updates: Partial<BaseItem> = {};

    if (name !== (item.Name || '')) updates.Name = name;
    if (sortName !== (item.SortName || '')) updates.SortName = sortName || undefined;
    if (overview !== (item.Overview || '')) updates.Overview = overview || undefined;

    const yearNum = parseInt(year, 10);
    if (!isNaN(yearNum) && yearNum !== item.ProductionYear) {
      updates.ProductionYear = yearNum;
    } else if (year === '' && item.ProductionYear) {
      updates.ProductionYear = undefined;
    }

    const ratingNum = parseFloat(rating);
    if (!isNaN(ratingNum) && ratingNum !== item.CommunityRating) {
      updates.CommunityRating = ratingNum;
    } else if (rating === '' && item.CommunityRating) {
      updates.CommunityRating = undefined;
    }

    const genreList = genres.split(',').map(g => g.trim()).filter(Boolean);
    const currentGenres = item.Genres || [];
    if (JSON.stringify(genreList) !== JSON.stringify(currentGenres)) {
      updates.Genres = genreList;
    }

    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    const currentTags = item.Tags || [];
    if (JSON.stringify(tagList) !== JSON.stringify(currentTags)) {
      updates.Tags = tagList;
    }

    if (Object.keys(updates).length > 0) {
      await onSave(updates);
    }
  }, [name, sortName, overview, year, rating, genres, tags, item, onSave]);

  const filePath = item.MediaSources?.[0]?.Path;
  const fileName = filePath ? filePath.split('/').pop() || filePath : null;

  return (
    <View style={styles.container}>
      {fileName && (
        <View style={styles.filePathContainer}>
          <Text style={styles.filePathLabel}>File</Text>
          <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
          <Text style={styles.filePath} numberOfLines={2}>{filePath}</Text>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Title"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Sort Name</Text>
        <TextInput
          style={styles.input}
          value={sortName}
          onChangeText={setSortName}
          placeholder="Sort name (optional)"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Overview</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={overview}
          onChangeText={setOverview}
          placeholder="Description"
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Year</Text>
          <TextInput
            style={styles.input}
            value={year}
            onChangeText={setYear}
            placeholder="2024"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
          <Text style={styles.label}>Rating</Text>
          <TextInput
            style={styles.input}
            value={rating}
            onChangeText={setRating}
            placeholder="0.0"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Genres</Text>
        <TextInput
          style={styles.input}
          value={genres}
          onChangeText={setGenres}
          placeholder="Action, Drama, Comedy"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
        <Text style={styles.hint}>Separate with commas</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Tags</Text>
        <TextInput
          style={styles.input}
          value={tags}
          onChangeText={setTags}
          placeholder="tag1, tag2, tag3"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
        <Text style={styles.hint}>Separate with commas</Text>
      </View>

      <Pressable
        onPress={handleSave}
        disabled={!hasChanges || isPending}
        style={[
          styles.saveButton,
          (!hasChanges || isPending) && styles.saveButtonDisabled,
        ]}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  filePathContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filePathLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fileName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  filePath: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
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
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
});
