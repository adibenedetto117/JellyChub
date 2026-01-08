import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { isTV } from '@/utils/platform';

// TVEventHandler is only available on TV platforms and not in standard RN types
// We declare the interface ourselves for type safety
interface TVEventHandlerType {
  enable: (
    component: any,
    callback: (component: any, event: { eventType: string; eventKeyAction?: number }) => void
  ) => void;
  disable: () => void;
}

// Try to get TVEventHandler - it may not exist on non-TV platforms
let TVEventHandlerClass: (new () => TVEventHandlerType) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  if (RN.TVEventHandler) {
    TVEventHandlerClass = RN.TVEventHandler;
  }
} catch {
  // TVEventHandler not available on this platform
}

/**
 * TV Remote event types supported by React Native
 */
export type TVRemoteEventType =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'select'
  | 'playPause'
  | 'rewind'
  | 'fastForward'
  | 'menu'
  | 'longUp'
  | 'longDown'
  | 'longLeft'
  | 'longRight'
  | 'longSelect';

export interface TVRemoteHandlerOptions {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void;
  onPlayPause?: () => void;
  onRewind?: () => void;
  onFastForward?: () => void;
  onMenu?: () => void;
  onLongUp?: () => void;
  onLongDown?: () => void;
  onLongLeft?: () => void;
  onLongRight?: () => void;
  onLongSelect?: () => void;
  /** Called for any key press */
  onAnyKey?: (eventType: TVRemoteEventType) => void;
  /** Only process events when enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for handling TV remote D-pad and button events.
 * Only activates on TV platforms (Android TV, Apple TV, Fire TV).
 *
 * @example
 * ```tsx
 * useTVRemoteHandler({
 *   onSelect: handlePlayPause,
 *   onLeft: () => seekBack(10),
 *   onRight: () => seekForward(10),
 *   onUp: () => volumeUp(),
 *   onDown: () => volumeDown(),
 *   enabled: showControls,
 * });
 * ```
 */
export function useTVRemoteHandler(options: TVRemoteHandlerOptions) {
  const {
    onUp,
    onDown,
    onLeft,
    onRight,
    onSelect,
    onPlayPause,
    onRewind,
    onFastForward,
    onMenu,
    onLongUp,
    onLongDown,
    onLongLeft,
    onLongRight,
    onLongSelect,
    onAnyKey,
    enabled = true,
  } = options;

  // Store handlers in refs to avoid recreating the event handler
  const handlersRef = useRef({
    onUp,
    onDown,
    onLeft,
    onRight,
    onSelect,
    onPlayPause,
    onRewind,
    onFastForward,
    onMenu,
    onLongUp,
    onLongDown,
    onLongLeft,
    onLongRight,
    onLongSelect,
    onAnyKey,
  });

  // Update refs when handlers change
  useEffect(() => {
    handlersRef.current = {
      onUp,
      onDown,
      onLeft,
      onRight,
      onSelect,
      onPlayPause,
      onRewind,
      onFastForward,
      onMenu,
      onLongUp,
      onLongDown,
      onLongLeft,
      onLongRight,
      onLongSelect,
      onAnyKey,
    };
  }, [
    onUp,
    onDown,
    onLeft,
    onRight,
    onSelect,
    onPlayPause,
    onRewind,
    onFastForward,
    onMenu,
    onLongUp,
    onLongDown,
    onLongLeft,
    onLongRight,
    onLongSelect,
    onAnyKey,
  ]);

  useEffect(() => {
    // Only set up handler on TV platforms
    const HandlerClass = TVEventHandlerClass;
    if (!isTV || !enabled || !HandlerClass) return;

    // Create TV event handler instance
    const tvEventHandler = new HandlerClass();

    const handleTVEvent = (
      _component: any,
      evt: { eventType: string; eventKeyAction?: number }
    ) => {
      // Only handle key down events (eventKeyAction === 0)
      // to prevent double-firing on key up
      if (evt.eventKeyAction !== undefined && evt.eventKeyAction !== 0) {
        return;
      }

      const eventType = evt.eventType as TVRemoteEventType;
      const handlers = handlersRef.current;

      // Call the generic handler for any key
      handlers.onAnyKey?.(eventType);

      // Route to specific handlers
      switch (eventType) {
        case 'up':
          handlers.onUp?.();
          break;
        case 'down':
          handlers.onDown?.();
          break;
        case 'left':
          handlers.onLeft?.();
          break;
        case 'right':
          handlers.onRight?.();
          break;
        case 'select':
          handlers.onSelect?.();
          break;
        case 'playPause':
          // Fall through to select if no specific handler
          if (handlers.onPlayPause) {
            handlers.onPlayPause();
          } else {
            handlers.onSelect?.();
          }
          break;
        case 'rewind':
          handlers.onRewind?.();
          break;
        case 'fastForward':
          handlers.onFastForward?.();
          break;
        case 'menu':
          handlers.onMenu?.();
          break;
        case 'longUp':
          handlers.onLongUp?.();
          break;
        case 'longDown':
          handlers.onLongDown?.();
          break;
        case 'longLeft':
          handlers.onLongLeft?.();
          break;
        case 'longRight':
          handlers.onLongRight?.();
          break;
        case 'longSelect':
          handlers.onLongSelect?.();
          break;
      }
    };

    // Enable the event handler
    tvEventHandler.enable(null, handleTVEvent);

    // Cleanup on unmount
    return () => {
      tvEventHandler.disable();
    };
  }, [enabled]);
}

/**
 * Simpler hook that just reports if running on TV.
 * Useful for conditional rendering.
 */
export function useIsTV(): boolean {
  return isTV;
}
