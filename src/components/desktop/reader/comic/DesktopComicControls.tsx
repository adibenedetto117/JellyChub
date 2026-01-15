import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReadDirection } from '@/hooks';

type DesktopFitMode = 'width' | 'height' | 'original';

interface DesktopComicControlsProps {
  itemName?: string;
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  showControls: boolean;
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;
  showSettingsMenu: boolean;
  setShowSettingsMenu: (show: boolean) => void;
  desktopFitMode: DesktopFitMode;
  setDesktopFitMode: (mode: DesktopFitMode) => void;
  readDirection: ReadDirection;
  setReadDirection: (direction: ReadDirection) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  handleClose: () => void;
  handleDownload: () => void;
  downloaded?: boolean;
  isDownloading: boolean;
  accentColor: string;
  controlsStyle: any;
}

export function DesktopComicControls({
  itemName,
  currentPage,
  totalPages,
  progressPercent,
  showControls,
  showSidebar,
  setShowSidebar,
  showSettingsMenu,
  setShowSettingsMenu,
  desktopFitMode,
  setDesktopFitMode,
  readDirection,
  setReadDirection,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  handleClose,
  handleDownload,
  downloaded,
  isDownloading,
  accentColor,
  controlsStyle,
}: DesktopComicControlsProps) {
  return (
    <Animated.View style={[styles.controlsOverlay, controlsStyle]} pointerEvents={showControls ? 'auto' : 'none'}>
      <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={styles.topGradient} />

      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{itemName ?? 'Loading...'}</Text>
          <Text style={styles.pageIndicator}>Page {currentPage + 1} of {totalPages}</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShowSidebar(!showSidebar)}
            style={[styles.headerButton, showSidebar && { backgroundColor: accentColor }]}
          >
            <Ionicons name="albums-outline" size={20} color="#fff" />
          </Pressable>

          <Pressable onPress={() => setShowSettingsMenu(!showSettingsMenu)} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </Pressable>

          <Pressable
            onPress={handleDownload}
            disabled={!!downloaded || isDownloading}
            style={styles.headerButton}
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

      {showSettingsMenu && (
        <View style={styles.settingsMenu}>
          <Text style={styles.settingsTitle}>Reader Settings</Text>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsLabel}>Fit Mode</Text>
            <View style={styles.settingsRow}>
              {(['width', 'height', 'original'] as DesktopFitMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setDesktopFitMode(mode)}
                  style={[
                    styles.settingsOption,
                    desktopFitMode === mode && { backgroundColor: accentColor },
                  ]}
                >
                  <Text style={styles.settingsOptionText}>
                    {mode === 'width' ? 'Fit Width' : mode === 'height' ? 'Fit Height' : 'Original'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsLabel}>Reading Direction</Text>
            <View style={styles.settingsRow}>
              <Pressable
                onPress={() => setReadDirection('ltr')}
                style={[
                  styles.settingsOption,
                  { flex: 1 },
                  readDirection === 'ltr' && { backgroundColor: accentColor },
                ]}
              >
                <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginRight: 6 }} />
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
                <Ionicons name="arrow-back" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.settingsOptionText}>Right to Left</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsLabel}>Zoom: {zoomLevel}%</Text>
            <View style={styles.zoomControls}>
              <Pressable onPress={onZoomOut} style={styles.zoomButton}>
                <Ionicons name="remove" size={20} color="#fff" />
              </Pressable>
              <View style={styles.zoomTrack}>
                <View
                  style={[
                    styles.zoomFill,
                    { width: `${((zoomLevel - 25) / 175) * 100}%`, backgroundColor: accentColor },
                  ]}
                />
              </View>
              <Pressable onPress={onZoomIn} style={styles.zoomButton}>
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
              <Pressable onPress={onZoomReset} style={styles.zoomResetButton}>
                <Text style={styles.zoomResetText}>Reset</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.keyboardHints}>
            <Text style={styles.keyboardHintsTitle}>Keyboard Shortcuts</Text>
            <View style={styles.keyboardHintRow}>
              <Text style={styles.keyboardKey}>Arrow Left/Right</Text>
              <Text style={styles.keyboardHintText}>Previous/Next page</Text>
            </View>
            <View style={styles.keyboardHintRow}>
              <Text style={styles.keyboardKey}>Home/End</Text>
              <Text style={styles.keyboardHintText}>First/Last page</Text>
            </View>
            <View style={styles.keyboardHintRow}>
              <Text style={styles.keyboardKey}>S</Text>
              <Text style={styles.keyboardHintText}>Toggle sidebar</Text>
            </View>
            <View style={styles.keyboardHintRow}>
              <Text style={styles.keyboardKey}>F</Text>
              <Text style={styles.keyboardHintText}>Cycle fit mode</Text>
            </View>
            <View style={styles.keyboardHintRow}>
              <Text style={styles.keyboardKey}>R</Text>
              <Text style={styles.keyboardHintText}>Toggle direction</Text>
            </View>
            <View style={styles.keyboardHintRow}>
              <Text style={styles.keyboardKey}>+/-/0</Text>
              <Text style={styles.keyboardHintText}>Zoom in/out/reset</Text>
            </View>
          </View>
        </View>
      )}

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomGradient} />

      <View style={styles.bottomControls}>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]}
          />
        </View>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomInfoText}>
            {readDirection === 'ltr' ? 'LTR' : 'RTL'} | {desktopFitMode === 'width' ? 'Fit Width' : desktopFitMode === 'height' ? 'Fit Height' : 'Original'} | {zoomLevel}%
          </Text>
          <Text style={styles.shortcutsHint}>
            Press S for sidebar | Arrow keys to navigate | F to cycle fit modes
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  pageIndicator: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsMenu: {
    position: 'absolute',
    top: 70,
    right: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: 320,
    maxHeight: 500,
    zIndex: 100,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  settingsSection: {
    marginBottom: 16,
  },
  settingsLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  settingsOptionText: {
    fontSize: 13,
    color: '#fff',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  zoomFill: {
    height: '100%',
    borderRadius: 2,
  },
  zoomResetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  zoomResetText: {
    fontSize: 12,
    color: '#fff',
  },
  keyboardHints: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  keyboardHintsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  keyboardHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  keyboardKey: {
    fontSize: 11,
    color: '#666',
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
    fontFamily: 'monospace',
    minWidth: 90,
    textAlign: 'center',
  },
  keyboardHintText: {
    fontSize: 12,
    color: '#888',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomInfoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  shortcutsHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
});
