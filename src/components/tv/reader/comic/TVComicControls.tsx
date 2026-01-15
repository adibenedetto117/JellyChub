import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import type { PageMode, FitMode, ReadDirection } from '@/hooks';

interface TVComicControlsProps {
  itemName?: string;
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  showControls: boolean;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  pageMode: PageMode;
  setPageMode: (mode: PageMode) => void;
  fitMode: FitMode;
  setFitMode: (mode: FitMode) => void;
  readDirection: ReadDirection;
  setReadDirection: (direction: ReadDirection) => void;
  handleClose: () => void;
  isTablet: boolean;
  accentColor: string;
  controlsStyle: any;
  insets: { top: number; bottom: number };
}

export function TVComicControls({
  itemName,
  currentPage,
  totalPages,
  progressPercent,
  showControls,
  showSettings,
  setShowSettings,
  pageMode,
  setPageMode,
  fitMode,
  setFitMode,
  readDirection,
  setReadDirection,
  handleClose,
  isTablet,
  accentColor,
  controlsStyle,
  insets,
}: TVComicControlsProps) {
  return (
    <Animated.View
      style={[styles.controlsOverlay, controlsStyle]}
      pointerEvents={showControls ? 'auto' : 'none'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={handleClose} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={32} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {itemName ?? 'Loading...'}
        </Text>
        <Pressable onPress={() => setShowSettings(!showSettings)} style={styles.headerBtn}>
          <Ionicons name="settings-outline" size={28} color="#fff" />
        </Pressable>
      </View>

      {showSettings && (
        <View style={[styles.settingsPanel, { top: insets.top + 80 }]}>
          <Text style={styles.settingsTitle}>Reader Settings</Text>

          <Text style={styles.settingsLabel}>Page Mode</Text>
          <View style={styles.settingsRow}>
            {(['single', 'double', 'webtoon'] as PageMode[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setPageMode(mode)}
                style={({ pressed }) => [
                  styles.settingsOption,
                  pageMode === mode && { backgroundColor: accentColor },
                  mode === 'double' && !isTablet && styles.settingsOptionDisabled,
                  pressed && { opacity: 0.7 },
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
                style={({ pressed }) => [
                  styles.settingsOption,
                  fitMode === key && { backgroundColor: accentColor },
                  pressed && { opacity: 0.7 },
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
              style={({ pressed }) => [
                styles.settingsOption,
                { flex: 1 },
                readDirection === 'ltr' && { backgroundColor: accentColor },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.settingsOptionText}>Left to Right</Text>
            </Pressable>
            <Pressable
              onPress={() => setReadDirection('rtl')}
              style={({ pressed }) => [
                styles.settingsOption,
                { flex: 1 },
                readDirection === 'rtl' && { backgroundColor: accentColor },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.settingsOptionText}>Right to Left</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.remoteHints}>
          <View style={styles.remoteHint}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
            <Text style={styles.remoteHintText}>Previous</Text>
          </View>
          <View style={styles.pageInfoContainer}>
            <Text style={styles.pageInfo}>
              {currentPage + 1} / {totalPages}
            </Text>
            <Text style={styles.pageInfoHint}>Press Select for menu</Text>
          </View>
          <View style={styles.remoteHint}>
            <Text style={styles.remoteHintText}>Next</Text>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
          </View>
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
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  headerBtn: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 16,
  },
  settingsPanel: {
    position: 'absolute',
    right: 48,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: 400,
    zIndex: 20,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 24,
  },
  settingsLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 12,
    marginTop: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  settingsOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  settingsOptionText: {
    fontSize: 16,
    color: '#fff',
  },
  settingsOptionDisabled: {
    opacity: 0.4,
  },
  footer: {
    paddingHorizontal: 48,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  remoteHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  remoteHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remoteHintText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  pageInfoContainer: {
    alignItems: 'center',
  },
  pageInfo: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  pageInfoHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
