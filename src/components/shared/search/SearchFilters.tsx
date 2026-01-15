import { useState, useCallback } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';
import { colors } from '@/theme';
import type { SearchMediaType } from '@/api';

export type SearchFilterValue = 'all' | SearchMediaType;

export interface FilterOption {
  value: SearchFilterValue;
  label: string;
  icon: string;
}

export const DEFAULT_FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All', icon: 'apps-outline' },
  { value: 'Movie', label: 'Movies', icon: 'film-outline' },
  { value: 'Series', label: 'TV Shows', icon: 'tv-outline' },
  { value: 'TvChannel', label: 'Channels', icon: 'radio-outline' },
  { value: 'Program', label: 'Programs', icon: 'calendar-outline' },
  { value: 'Audio', label: 'Songs', icon: 'musical-notes-outline' },
  { value: 'MusicAlbum', label: 'Albums', icon: 'disc-outline' },
  { value: 'MusicArtist', label: 'Artists', icon: 'person-outline' },
  { value: 'Book', label: 'Books', icon: 'book-outline' },
  { value: 'AudioBook', label: 'Audiobooks', icon: 'headset-outline' },
];

export interface SearchFiltersProps {
  activeFilter: SearchFilterValue;
  onFilterChange: (filter: SearchFilterValue) => void;
  filterOptions?: FilterOption[];
}

export function SearchFilters({
  activeFilter,
  onFilterChange,
  filterOptions = DEFAULT_FILTER_OPTIONS,
}: SearchFiltersProps) {
  const { t } = useTranslation();
  const accentColor = useSettingsStore((s) => s.accentColor);
  const [modalVisible, setModalVisible] = useState(false);

  const activeFilterOption = filterOptions.find(f => f.value === activeFilter) || filterOptions[0];

  const handleFilterSelect = useCallback((filter: SearchFilterValue) => {
    onFilterChange(filter);
    setModalVisible(false);
  }, [onFilterChange]);

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={[styles.filterDropdown, { borderColor: accentColor + '40' }]}
      >
        <View style={styles.filterDropdownLeft}>
          <Ionicons
            name={activeFilterOption.icon as any}
            size={18}
            color={accentColor}
          />
          <Text style={styles.filterDropdownText}>
            {activeFilterOption.label}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.5)" />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('search.filterBy')}</Text>
            {filterOptions.map((filter) => (
              <Pressable
                key={filter.value}
                onPress={() => handleFilterSelect(filter.value)}
                style={[
                  styles.modalOption,
                  activeFilter === filter.value && { backgroundColor: accentColor + '15' },
                ]}
              >
                <View style={styles.modalOptionLeft}>
                  <Ionicons
                    name={filter.icon as any}
                    size={22}
                    color={activeFilter === filter.value ? accentColor : 'rgba(255,255,255,0.6)'}
                  />
                  <Text
                    style={[
                      styles.modalOptionText,
                      activeFilter === filter.value && { color: accentColor },
                    ]}
                  >
                    {filter.label}
                  </Text>
                </View>
                {activeFilter === filter.value && (
                  <Ionicons name="checkmark" size={22} color={accentColor} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  filterDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterDropdownText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    paddingVertical: 8,
  },
  modalTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
});
