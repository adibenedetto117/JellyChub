import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { SharedValue } from 'react-native-reanimated';

interface MobileLiveTvControlsProps {
  controlsStyle: { opacity: number; pointerEvents: 'auto' | 'none' };
  accentColor: string;
  isOrientationLocked: boolean;
  isFavorite: boolean;
  showChannelList: boolean;
  insets: { top: number; bottom: number; left: number; right: number };
  onBack: () => void;
  onToggleOrientationLock: () => void;
  onToggleFavorite: () => void;
  onToggleChannelList: () => void;
  onPrevChannel: () => void;
  onNextChannel: () => void;
  children?: React.ReactNode;
}

export function MobileLiveTvControls({
  controlsStyle,
  accentColor,
  isOrientationLocked,
  isFavorite,
  showChannelList,
  insets,
  onBack,
  onToggleOrientationLock,
  onToggleFavorite,
  onToggleChannelList,
  onPrevChannel,
  onNextChannel,
  children,
}: MobileLiveTvControlsProps) {
  return (
    <Animated.View style={[styles.controlsContainer, controlsStyle]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.5)', 'transparent']}
        style={styles.topGradient}
      >
        <View
          style={[
            styles.topControls,
            {
              paddingTop: Math.max(insets.top, 16) + 8,
              paddingLeft: Math.max(insets.left, 24),
              paddingRight: Math.max(insets.right, 24),
            },
          ]}
        >
          <Pressable onPress={onBack} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </Pressable>

          {children}

          <View style={styles.topRightControls}>
            <Pressable
              onPress={onToggleOrientationLock}
              style={styles.controlButton}
              hitSlop={8}
            >
              <Ionicons
                name={isOrientationLocked ? 'lock-closed' : 'lock-open'}
                size={20}
                color={isOrientationLocked ? accentColor : '#fff'}
              />
            </Pressable>
            <Pressable
              onPress={onToggleFavorite}
              style={styles.controlButton}
              hitSlop={8}
            >
              <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={22}
                color={isFavorite ? '#FFD700' : '#fff'}
              />
            </Pressable>
            <Pressable
              onPress={onToggleChannelList}
              style={styles.controlButton}
              hitSlop={8}
            >
              <Ionicons name="list" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
        style={styles.bottomGradient}
      >
        <View
          style={[
            styles.bottomControls,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              paddingLeft: Math.max(insets.left, 24),
              paddingRight: Math.max(insets.right, 24),
            },
          ]}
        >
          <View style={styles.channelNavigation}>
            <Pressable onPress={onPrevChannel} style={styles.navButton}>
              <Ionicons name="chevron-up" size={28} color="#fff" />
            </Pressable>
            <Pressable onPress={onNextChannel} style={styles.navButton}>
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topGradient: {
    paddingBottom: 40,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomGradient: {
    paddingTop: 40,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  channelNavigation: {
    gap: 10,
  },
  navButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
