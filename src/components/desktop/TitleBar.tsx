/**
 * Desktop Title Bar Component
 *
 * Custom title bar for Electron desktop app with window controls.
 * Only rendered when running in Electron environment.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDesktop } from '@/hooks/useDesktop';
import { isDesktop, isMacOS, desktopConstants } from '@/utils/platform';

interface TitleBarProps {
  title?: string;
  showControls?: boolean;
  transparent?: boolean;
}

export function TitleBar({ title = 'JellyChub', showControls = true, transparent = false }: TitleBarProps) {
  const { minimize, maximize, close, isMaximized, isElectron } = useDesktop();

  // Only render on desktop (Electron)
  if (!isDesktop || !isElectron) {
    return null;
  }

  // macOS uses native traffic lights, so we only show the title
  if (isMacOS) {
    return (
      <View style={[styles.container, styles.macContainer, transparent && styles.transparent]}>
        {/* Drag region placeholder for macOS traffic lights */}
        <View style={styles.macTrafficLightsSpace} />
        <Text style={styles.title}>{title}</Text>
        <View style={styles.macTrafficLightsSpace} />
      </View>
    );
  }

  // Windows/Linux with custom controls
  return (
    <View style={[styles.container, transparent && styles.transparent]}>
      {/* App title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Window controls */}
      {showControls && (
        <View style={styles.controls}>
          <Pressable
            onPress={minimize}
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
          >
            <Ionicons name="remove" size={16} color="#fff" />
          </Pressable>

          <Pressable
            onPress={maximize}
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
          >
            <Ionicons name={isMaximized ? 'contract' : 'expand'} size={14} color="#fff" />
          </Pressable>

          <Pressable
            onPress={close}
            style={({ pressed }) => [styles.controlButton, styles.closeButton, pressed && styles.closeButtonPressed]}
          >
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: desktopConstants.titleBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    // Enable window dragging
    // @ts-ignore - Web-specific property
    WebkitAppRegion: 'drag',
    zIndex: 1000,
  },
  transparent: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  macContainer: {
    justifyContent: 'center',
  },
  macTrafficLightsSpace: {
    width: 80, // Space for traffic light buttons
  },
  titleContainer: {
    flex: 1,
    paddingLeft: 16,
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    height: '100%',
    // Disable dragging on buttons
    // @ts-ignore - Web-specific property
    WebkitAppRegion: 'no-drag',
  },
  controlButton: {
    width: 46,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  controlButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {},
  closeButtonPressed: {
    backgroundColor: '#e81123',
  },
});

export default TitleBar;
