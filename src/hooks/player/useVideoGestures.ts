import { useCallback, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture, ComposedGesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as Brightness from 'expo-brightness';
import { VolumeManager } from 'react-native-volume-manager';
import * as Haptics from 'expo-haptics';
import {
  GESTURE_ZONE_WIDTH,
  CENTER_DEADZONE_START_RATIO,
  CENTER_DEADZONE_END_RATIO,
} from '@/constants/videoPlayer';

interface UseVideoGesturesOptions {
  isPortrait: boolean;
  currentBrightness: number;
  currentVolume: number;
  onBrightnessChange: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onToggleControls: () => void;
  onDoubleTapSeek: (direction: 'left' | 'right') => void;
  onHorizontalSeekStart: (startX: number) => void;
  onHorizontalSeekUpdate: (translationX: number) => void;
  onHorizontalSeekEnd: () => void;
}

interface UseVideoGesturesReturn {
  gesture: ComposedGesture;
  showBrightnessIndicator: boolean;
  showVolumeIndicator: boolean;
  isHorizontalSeeking: boolean;
  horizontalSeekPosition: number;
  horizontalSeekDelta: number;
  setHorizontalSeekPosition: (position: number) => void;
  setHorizontalSeekDelta: (delta: number) => void;
  showBrightnessIndicatorWithTimeout: () => void;
  showVolumeIndicatorWithTimeout: () => void;
  handleBrightnessChange: (value: number) => Promise<void>;
  handleVolumeChange: (value: number) => Promise<void>;
}

export function useVideoGestures({
  isPortrait,
  currentBrightness,
  currentVolume,
  onBrightnessChange,
  onVolumeChange,
  onToggleControls,
  onDoubleTapSeek,
  onHorizontalSeekStart,
  onHorizontalSeekUpdate,
  onHorizontalSeekEnd,
}: UseVideoGesturesOptions): UseVideoGesturesReturn {
  const { width: screenWidth } = useWindowDimensions();

  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [isHorizontalSeeking, setIsHorizontalSeeking] = useState(false);
  const [horizontalSeekPosition, setHorizontalSeekPosition] = useState(0);
  const [horizontalSeekDelta, setHorizontalSeekDelta] = useState(0);
  const [gestureStartValue, setGestureStartValue] = useState(0);

  const brightnessIndicatorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeIndicatorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureActiveZone = useRef<'left' | 'right' | 'center' | 'deadzone' | null>(null);

  const centerDeadzoneStart = screenWidth * CENTER_DEADZONE_START_RATIO;
  const centerDeadzoneEnd = screenWidth * CENTER_DEADZONE_END_RATIO;

  const showBrightnessIndicatorWithTimeout = useCallback(() => {
    setShowBrightnessIndicator(true);
    if (brightnessIndicatorTimeout.current) {
      clearTimeout(brightnessIndicatorTimeout.current);
    }
    brightnessIndicatorTimeout.current = setTimeout(() => {
      setShowBrightnessIndicator(false);
    }, 1500);
  }, []);

  const showVolumeIndicatorWithTimeout = useCallback(() => {
    setShowVolumeIndicator(true);
    if (volumeIndicatorTimeout.current) {
      clearTimeout(volumeIndicatorTimeout.current);
    }
    volumeIndicatorTimeout.current = setTimeout(() => {
      setShowVolumeIndicator(false);
    }, 1500);
  }, []);

  const handleBrightnessChange = useCallback(async (value: number) => {
    const clampedValue = Math.max(0, Math.min(1, value));
    onBrightnessChange(clampedValue);
    try {
      await Brightness.setBrightnessAsync(clampedValue);
    } catch (e) {
      // Ignore brightness errors
    }
  }, [onBrightnessChange]);

  const handleVolumeChange = useCallback(async (value: number) => {
    const clampedValue = Math.max(0, Math.min(1, value));
    onVolumeChange(clampedValue);
    try {
      await VolumeManager.setVolume(clampedValue, { showUI: false });
    } catch (e) {
      // Ignore volume errors
    }
  }, [onVolumeChange]);

  const handleHorizontalSeekStartInternal = useCallback((startX: number) => {
    setIsHorizontalSeeking(true);
    onHorizontalSeekStart(startX);
  }, [onHorizontalSeekStart]);

  const handleHorizontalSeekEndInternal = useCallback(() => {
    if (isHorizontalSeeking) {
      onHorizontalSeekEnd();
      setIsHorizontalSeeking(false);
      setHorizontalSeekDelta(0);
    }
  }, [isHorizontalSeeking, onHorizontalSeekEnd]);

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onStart((e) => {
      const isInLeftZone = e.x < GESTURE_ZONE_WIDTH;
      const isInRightZone = e.x > screenWidth - GESTURE_ZONE_WIDTH;
      const isInCenterDeadzone = e.x >= centerDeadzoneStart && e.x <= centerDeadzoneEnd;

      if (isInLeftZone && !isPortrait) {
        // Left side controls volume
        gestureActiveZone.current = 'left';
        runOnJS(setGestureStartValue)(currentVolume);
        runOnJS(showVolumeIndicatorWithTimeout)();
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      } else if (isInRightZone && !isPortrait) {
        // Right side controls brightness
        gestureActiveZone.current = 'right';
        runOnJS(setGestureStartValue)(currentBrightness);
        runOnJS(showBrightnessIndicatorWithTimeout)();
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      } else if (isInCenterDeadzone) {
        // Center deadzone - no pan gesture, only taps work here
        gestureActiveZone.current = 'deadzone';
      } else {
        // Areas between edge zones and center deadzone - horizontal seeking
        gestureActiveZone.current = 'center';
        runOnJS(handleHorizontalSeekStartInternal)(e.x);
      }
    })
    .onUpdate((e) => {
      if (gestureActiveZone.current === 'left') {
        // Left side controls volume
        const deltaY = -e.translationY;
        const sensitivity = 0.003;
        const newValue = gestureStartValue + (deltaY * sensitivity);
        runOnJS(handleVolumeChange)(newValue);
        runOnJS(showVolumeIndicatorWithTimeout)();
      } else if (gestureActiveZone.current === 'right') {
        // Right side controls brightness
        const deltaY = -e.translationY;
        const sensitivity = 0.003;
        const newValue = gestureStartValue + (deltaY * sensitivity);
        runOnJS(handleBrightnessChange)(newValue);
        runOnJS(showBrightnessIndicatorWithTimeout)();
      } else if (gestureActiveZone.current === 'center') {
        runOnJS(onHorizontalSeekUpdate)(e.translationX);
      }
      // 'deadzone' does nothing on update
    })
    .onEnd(() => {
      if (gestureActiveZone.current === 'center') {
        runOnJS(handleHorizontalSeekEndInternal)();
      }
      gestureActiveZone.current = null;
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onToggleControls)();
  });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd((event) => {
      if (event.x < screenWidth * 0.35) {
        runOnJS(onDoubleTapSeek)('left');
      } else if (event.x > screenWidth * 0.65) {
        runOnJS(onDoubleTapSeek)('right');
      }
    });

  const gesture = Gesture.Race(
    panGesture,
    Gesture.Exclusive(doubleTapGesture, tapGesture)
  );

  return {
    gesture,
    showBrightnessIndicator,
    showVolumeIndicator,
    isHorizontalSeeking,
    horizontalSeekPosition,
    horizontalSeekDelta,
    setHorizontalSeekPosition,
    setHorizontalSeekDelta,
    showBrightnessIndicatorWithTimeout,
    showVolumeIndicatorWithTimeout,
    handleBrightnessChange,
    handleVolumeChange,
  };
}
