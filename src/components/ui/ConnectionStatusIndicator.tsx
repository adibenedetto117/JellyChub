import { memo, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useConnectionStore,
  selectIsDisconnected,
  selectIsRetrying,
} from '@/stores/connectionStore';
import { useAuthStore, selectActiveServer } from '@/stores';
import { jellyfinClient } from '@/api';
import { colors } from '@/theme';

/**
 * ConnectionStatusIndicator
 *
 * Shows a banner when the app can't connect to the Jellyfin server.
 *
 * Key design decisions:
 * - NO periodic health checks - only reacts to actual API call failures
 * - Requires multiple consecutive failures (configured in connectionStore) before showing
 * - Immediately hides when ANY successful API response comes back
 * - Manual retry makes a real API call to test connection
 */
export const ConnectionStatusIndicator = memo(function ConnectionStatusIndicator() {
  const insets = useSafeAreaInsets();
  const isDisconnected = useConnectionStore(selectIsDisconnected);
  const isRetrying = useConnectionStore(selectIsRetrying);
  const { startRetry, reportSuccess, reportFailure } = useConnectionStore();
  const activeServer = useAuthStore(selectActiveServer);

  // Show/hide animation
  const shouldShow = isDisconnected || isRetrying;

  // Animation values - start hidden (off-screen)
  const translateY = useSharedValue(shouldShow ? 0 : -100);
  const opacity = useSharedValue(shouldShow ? 1 : 0);
  const spinRotation = useSharedValue(0);

  useEffect(() => {
    if (shouldShow) {
      opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
    } else {
      opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
      translateY.value = withTiming(-100, { duration: 200, easing: Easing.in(Easing.cubic) });
    }
  }, [shouldShow, translateY, opacity]);

  // Spinning animation for retry button when retrying
  useEffect(() => {
    if (isRetrying) {
      spinRotation.value = withRepeat(
        withTiming(360, { duration: 800, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(spinRotation);
      spinRotation.value = 0;
    }
  }, [isRetrying, spinRotation]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const animatedSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinRotation.value}deg` }],
  }));

  // Handle manual retry - make a real API call to test connection
  const handleRetry = useCallback(async () => {
    if (isRetrying || !activeServer?.url) return;

    // Set retrying state for visual feedback
    startRetry();

    try {
      // Make a lightweight API call to test connection
      // Using system/info/public as it doesn't require auth
      const response = await jellyfinClient.api.get('/System/Info/Public', {
        timeout: 10000, // 10 second timeout for manual retry
      });

      if (response.status === 200) {
        reportSuccess();
      } else {
        reportFailure();
      }
    } catch {
      reportFailure();
    }
  }, [isRetrying, activeServer?.url, startRetry, reportSuccess, reportFailure]);

  // Don't render if no server is configured
  if (!activeServer?.url) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top > 0 ? insets.top : 8 },
        animatedContainerStyle,
      ]}
      pointerEvents={shouldShow ? 'auto' : 'none'}
    >
      <Pressable
        style={({ pressed }) => [
          styles.banner,
          pressed && styles.bannerPressed,
        ]}
        onPress={handleRetry}
        disabled={isRetrying}
        accessibilityRole="button"
        accessibilityLabel={isRetrying ? 'Reconnecting...' : 'Connection lost. Tap to retry.'}
        accessibilityHint="Attempts to reconnect to the Jellyfin server"
      >
        <View style={styles.iconContainer}>
          <Ionicons name="wifi" size={16} color={colors.status.warning} />
          <View style={styles.iconBadge}>
            <Ionicons name="close" size={8} color="#fff" />
          </View>
        </View>
        <Text style={styles.text}>
          {isRetrying ? 'Reconnecting...' : "Can't connect to server"}
        </Text>
        <Animated.View style={[styles.retryButton, animatedSpinStyle]}>
          <Ionicons
            name="refresh"
            size={14}
            color={isRetrying ? colors.status.warning : 'rgba(255,255,255,0.7)'}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
  },
  bannerPressed: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  iconContainer: {
    position: 'relative',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.status.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.status.warning,
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 0,
  },
  retryButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    flexShrink: 0,
  },
});
