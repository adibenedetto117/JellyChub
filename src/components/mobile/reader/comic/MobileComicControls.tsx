import { View, Text, Pressable, ScrollView, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import type { PageMode, FitMode, PageAnimation, ReadDirection } from '@/hooks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MobileComicControlsProps {
  itemName?: string;
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  showControls: boolean;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  setShowThumbnails: (show: boolean) => void;
  pageMode: PageMode;
  setPageMode: (mode: PageMode) => void;
  fitMode: FitMode;
  setFitMode: (mode: FitMode) => void;
  pageAnimation: PageAnimation;
  setPageAnimation: (animation: PageAnimation) => void;
  readDirection: ReadDirection;
  setReadDirection: (direction: ReadDirection) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  handleClose: () => void;
  handleDownload: () => void;
  downloaded?: boolean;
  isDownloading: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  accentColor: string;
  controlsStyle: any;
  insets: { top: number; bottom: number };
}

export function MobileComicControls({
  itemName,
  currentPage,
  totalPages,
  progressPercent,
  showControls,
  showSettings,
  setShowSettings,
  setShowThumbnails,
  pageMode,
  setPageMode,
  fitMode,
  setFitMode,
  pageAnimation,
  setPageAnimation,
  readDirection,
  setReadDirection,
  handlePrevPage,
  handleNextPage,
  handleClose,
  handleDownload,
  downloaded,
  isDownloading,
  isTablet,
  isLandscape,
  accentColor,
  controlsStyle,
  insets,
}: MobileComicControlsProps) {
  return (
    <Animated.View
      style={[styles.controlsOverlay, controlsStyle]}
      pointerEvents={showControls ? 'auto' : 'none'}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={handleClose} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {itemName ?? 'Loading...'}
        </Text>
        <Pressable onPress={() => setShowSettings(!showSettings)} style={styles.headerBtn}>
          <Ionicons name="settings-outline" size={22} color="#fff" />
        </Pressable>
        <Pressable
          onPress={handleDownload}
          disabled={!!downloaded || isDownloading}
          style={styles.headerBtn}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : downloaded ? (
            <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
          ) : (
            <Ionicons name="download-outline" size={22} color="#fff" />
          )}
        </Pressable>
      </View>

      {showSettings && (
        <ScrollView
          style={[styles.settingsPanel, { top: insets.top + 56, maxHeight: SCREEN_HEIGHT * 0.7 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.settingsTitle}>Reader Settings</Text>

          <Text style={styles.settingsLabel}>Page Mode</Text>
          <View style={styles.settingsRow}>
            {(['single', 'double', 'webtoon'] as PageMode[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setPageMode(mode)}
                style={[
                  styles.settingsOption,
                  pageMode === mode && { backgroundColor: accentColor },
                  mode === 'double' && !isTablet && styles.settingsOptionDisabled,
                ]}
                disabled={mode === 'double' && !isTablet}
              >
                <Text style={[
                  styles.settingsOptionText,
                  mode === 'double' && !isTablet && { color: '#666' },
                ]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          {pageMode === 'double' && !isLandscape && (
            <Text style={styles.settingsHint}>Rotate to landscape for double page view</Text>
          )}

          <Text style={styles.settingsLabel}>Fit Mode</Text>
          <View style={styles.settingsRow}>
            {([
              { key: 'contain', label: 'Fit Screen' },
              { key: 'width', label: 'Fit Width' },
              { key: 'height', label: 'Fit Height' },
              { key: 'cover', label: 'Fill' },
            ] as { key: FitMode; label: string }[]).map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() => setFitMode(key)}
                style={[
                  styles.settingsOption,
                  fitMode === key && { backgroundColor: accentColor },
                ]}
              >
                <Text style={styles.settingsOptionText}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.settingsLabel}>Page Animation</Text>
          <View style={styles.settingsRow}>
            {([
              { key: 'slide', label: 'Slide' },
              { key: 'fade', label: 'Fade' },
              { key: 'none', label: 'None' },
            ] as { key: PageAnimation; label: string }[]).map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() => setPageAnimation(key)}
                style={[
                  styles.settingsOption,
                  pageAnimation === key && { backgroundColor: accentColor },
                ]}
              >
                <Text style={styles.settingsOptionText}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.settingsLabel}>Read Direction</Text>
          <View style={styles.settingsRow}>
            <Pressable
              onPress={() => setReadDirection('ltr')}
              style={[
                styles.settingsOption,
                { flex: 1 },
                readDirection === 'ltr' && { backgroundColor: accentColor },
              ]}
            >
              <Text style={styles.settingsOptionText}>Left to Right</Text>
            </Pressable>
            <Pressable
              onPress={() => setReadDirection('rtl')}
              style={[
                styles.settingsOption,
                { flex: 1 },
                readDirection === 'rtl' && { backgroundColor: accentColor },
              ]}
            >
              <Text style={styles.settingsOptionText}>Right to Left</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.footerRow}>
          <Pressable
            onPress={handlePrevPage}
            disabled={currentPage === 0}
            style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
          >
            <Ionicons
              name={readDirection === 'rtl' ? 'chevron-forward' : 'chevron-back'}
              size={24}
              color={currentPage === 0 ? '#666' : '#fff'}
            />
          </Pressable>
          <Pressable onPress={() => setShowThumbnails(true)} style={styles.pageInfoBtn}>
            <Text style={styles.pageInfo}>
              {currentPage + 1} / {totalPages}
            </Text>
            <Ionicons name="grid-outline" size={16} color="#fff" style={{ marginLeft: 6 }} />
          </Pressable>
          <Pressable
            onPress={handleNextPage}
            disabled={currentPage === totalPages - 1}
            style={[styles.navButton, currentPage === totalPages - 1 && styles.navButtonDisabled]}
          >
            <Ionicons
              name={readDirection === 'rtl' ? 'chevron-back' : 'chevron-forward'}
              size={24}
              color={currentPage === totalPages - 1 ? '#666' : '#fff'}
            />
          </Pressable>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 4,
  },
  settingsPanel: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    width: 260,
    zIndex: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  settingsLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
    marginTop: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  settingsOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  settingsOptionText: {
    fontSize: 14,
    color: '#fff',
  },
  settingsOptionDisabled: {
    opacity: 0.4,
  },
  settingsHint: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 12,
  },
  pageInfo: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    minWidth: 80,
    textAlign: 'center',
  },
  pageInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
