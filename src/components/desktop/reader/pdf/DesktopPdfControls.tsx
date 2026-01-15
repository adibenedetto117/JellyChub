import { View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DesktopPdfControlsProps {
  itemName?: string;
  currentPage: number;
  totalPages: number;
  pageInput: string;
  onPageInputChange: (value: string) => void;
  onPageInputSubmit: () => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  searchResults: number[];
  currentSearchIndex: number;
  onPrevSearchResult: () => void;
  onNextSearchResult: () => void;
  isSearching: boolean;
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  handleClose: () => void;
  handleDownload: () => void;
  downloaded?: boolean;
  isDownloading: boolean;
  accentColor: string;
  searchInputRef: React.RefObject<TextInput>;
  zoomLevels: number[];
}

export function DesktopPdfControls({
  itemName,
  currentPage,
  totalPages,
  pageInput,
  onPageInputChange,
  onPageInputSubmit,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  searchResults,
  currentSearchIndex,
  onPrevSearchResult,
  onNextSearchResult,
  isSearching,
  showSidebar,
  setShowSidebar,
  onPrevPage,
  onNextPage,
  handleClose,
  handleDownload,
  downloaded,
  isDownloading,
  accentColor,
  searchInputRef,
  zoomLevels,
}: DesktopPdfControlsProps) {
  return (
    <View style={styles.toolbar}>
      <View style={styles.toolbarLeft}>
        <Pressable onPress={handleClose} style={styles.toolbarButton}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Pressable
          onPress={() => setShowSidebar(!showSidebar)}
          style={[styles.toolbarButton, showSidebar && styles.toolbarButtonActive]}
        >
          <Ionicons name="menu" size={20} color="#fff" />
        </Pressable>
        <View style={styles.toolbarDivider} />
        <Text style={styles.toolbarTitle} numberOfLines={1}>
          {itemName ?? 'PDF'}
        </Text>
      </View>

      <View style={styles.toolbarCenter}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#888" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
          {searchResults.length > 0 && (
            <View style={styles.searchResultsNav}>
              <Text style={styles.searchResultsText}>
                {currentSearchIndex + 1}/{searchResults.length}
              </Text>
              <Pressable onPress={onPrevSearchResult} style={styles.searchNavButton}>
                <Ionicons name="chevron-up" size={16} color="#fff" />
              </Pressable>
              <Pressable onPress={onNextSearchResult} style={styles.searchNavButton}>
                <Ionicons name="chevron-down" size={16} color="#fff" />
              </Pressable>
            </View>
          )}
          {isSearching && (
            <ActivityIndicator size="small" color={accentColor} style={styles.searchSpinner} />
          )}
        </View>
      </View>

      <View style={styles.toolbarRight}>
        <View style={styles.pageNavContainer}>
          <Pressable
            onPress={onPrevPage}
            disabled={currentPage <= 1}
            style={[styles.pageNavButton, currentPage <= 1 && styles.pageNavButtonDisabled]}
          >
            <Ionicons name="chevron-back" size={18} color={currentPage <= 1 ? '#555' : '#fff'} />
          </Pressable>
          <View style={styles.pageInputContainer}>
            <TextInput
              style={styles.pageInput}
              value={pageInput}
              onChangeText={onPageInputChange}
              onSubmitEditing={onPageInputSubmit}
              onBlur={onPageInputSubmit}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <Text style={styles.pageTotal}>/ {totalPages || '...'}</Text>
          </View>
          <Pressable
            onPress={onNextPage}
            disabled={currentPage >= totalPages}
            style={[styles.pageNavButton, currentPage >= totalPages && styles.pageNavButtonDisabled]}
          >
            <Ionicons name="chevron-forward" size={18} color={currentPage >= totalPages ? '#555' : '#fff'} />
          </Pressable>
        </View>

        <View style={styles.toolbarDivider} />

        <View style={styles.zoomControls}>
          <Pressable
            onPress={onZoomOut}
            disabled={zoomLevel <= zoomLevels[0]}
            style={[styles.zoomButton, zoomLevel <= zoomLevels[0] && styles.zoomButtonDisabled]}
          >
            <Ionicons name="remove" size={18} color={zoomLevel <= zoomLevels[0] ? '#555' : '#fff'} />
          </Pressable>
          <Pressable onPress={onZoomReset} style={styles.zoomPercentButton}>
            <Text style={styles.zoomPercent}>{Math.round(zoomLevel * 100)}%</Text>
          </Pressable>
          <Pressable
            onPress={onZoomIn}
            disabled={zoomLevel >= zoomLevels[zoomLevels.length - 1]}
            style={[styles.zoomButton, zoomLevel >= zoomLevels[zoomLevels.length - 1] && styles.zoomButtonDisabled]}
          >
            <Ionicons name="add" size={18} color={zoomLevel >= zoomLevels[zoomLevels.length - 1] ? '#555' : '#fff'} />
          </Pressable>
        </View>

        <View style={styles.toolbarDivider} />

        <Pressable
          onPress={handleDownload}
          disabled={!!downloaded || isDownloading}
          style={styles.toolbarButton}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : downloaded ? (
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          ) : (
            <Ionicons name="download-outline" size={20} color="#fff" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toolbarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'center',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  toolbarButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  toolbarDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
  },
  toolbarTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 8,
    maxWidth: 200,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 32,
    minWidth: 250,
    maxWidth: 400,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    padding: 0,
  } as any,
  searchResultsNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 2,
  },
  searchResultsText: {
    fontSize: 12,
    color: '#888',
    marginRight: 4,
  },
  searchNavButton: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  pageNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageNavButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pageNavButtonDisabled: {
    opacity: 0.5,
  },
  pageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageInput: {
    width: 50,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    padding: 0,
  } as any,
  pageTotal: {
    fontSize: 13,
    color: '#888',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  zoomButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  zoomButtonDisabled: {
    opacity: 0.5,
  },
  zoomPercentButton: {
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomPercent: {
    fontSize: 12,
    color: '#fff',
    minWidth: 45,
    textAlign: 'center',
  },
});
