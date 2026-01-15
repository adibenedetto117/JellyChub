import { useMemo, useCallback, useRef, useState } from 'react';
import { SectionList, FlatList } from 'react-native';
import type { BaseItem } from '@/types/jellyfin';

export function groupByFirstLetter<T extends BaseItem>(items: T[]): {
  sections: { title: string; data: T[] }[];
  availableLetters: string[];
} {
  const grouped: Record<string, T[]> = {};

  items.forEach((item) => {
    const sortName = (item as any).SortName ?? item.Name ?? '?';
    const firstChar = sortName.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(item);
  });

  const sortedLetters = Object.keys(grouped).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  return {
    sections: sortedLetters.map((letter) => ({
      title: letter,
      data: grouped[letter],
    })),
    availableLetters: sortedLetters,
  };
}

interface UseMediaBrowseOptions<T> {
  items: T[];
  sortBy: string;
  onItemPress: (item: T) => void;
}

export function useMediaBrowse<T extends BaseItem>({
  items,
  sortBy,
  onItemPress,
}: UseMediaBrowseOptions<T>) {
  const sectionListRef = useRef<SectionList>(null);
  const flatListRef = useRef<FlatList>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { sections, availableLetters } = useMemo(() => {
    if (sortBy !== 'SortName') {
      return { sections: [], availableLetters: [] };
    }
    return groupByFirstLetter(items);
  }, [items, sortBy]);

  const filteredItems = useMemo(() => {
    return items.filter((item): item is T => item != null);
  }, [items]);

  const filteredSections = useMemo(() => {
    return sections.map(section => ({
      ...section,
      data: section.data.filter((item): item is T => item != null),
    })).filter(section => section.data.length > 0);
  }, [sections]);

  const scrollToLetter = useCallback((letter: string) => {
    const sectionIndex = sections.findIndex((s) => s.title === letter);
    if (sectionIndex !== -1 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
    }
  }, [sections]);

  const resetScroll = useCallback((isAlphabetical: boolean) => {
    if (isAlphabetical) {
      setTimeout(() => {
        sectionListRef.current?.scrollToLocation({
          sectionIndex: 0,
          itemIndex: 0,
          animated: false,
          viewOffset: 0,
        });
      }, 100);
    } else {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, []);

  const handleItemPress = useCallback((item: T) => {
    onItemPress(item);
  }, [onItemPress]);

  return {
    sectionListRef,
    flatListRef,
    refreshing,
    setRefreshing,
    sections: filteredSections,
    availableLetters,
    filteredItems,
    scrollToLetter,
    resetScroll,
    handleItemPress,
    isAlphabetical: sortBy === 'SortName',
  };
}
