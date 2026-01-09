import { ReactNode, useMemo } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  EdgeInsets,
} from 'react-native-safe-area-context';

type Edge = 'top' | 'right' | 'bottom' | 'left';

// Use initialWindowMetrics as the stable source of truth
// This is available synchronously and doesn't change
const STABLE_INSETS: EdgeInsets = initialWindowMetrics?.insets ?? {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/**
 * Hook to get stable insets that never change after app start.
 * Use this instead of useSafeAreaInsets() to prevent layout shifts.
 */
export function useStableInsets(): EdgeInsets {
  return STABLE_INSETS;
}

interface SafeAreaViewProps {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  className?: string;
}

/**
 * Drop-in replacement for SafeAreaView from react-native-safe-area-context.
 * Uses stable (frozen) insets from initialWindowMetrics to prevent layout shifts.
 */
export function SafeAreaView({ children, edges, style, className }: SafeAreaViewProps) {
  const paddingStyle = useMemo(() => {
    const padding: ViewStyle = {};

    // If no edges specified, apply all edges (default behavior)
    const edgesToApply = edges ?? ['top', 'right', 'bottom', 'left'];

    if (edgesToApply.includes('top')) {
      padding.paddingTop = STABLE_INSETS.top;
    }
    if (edgesToApply.includes('right')) {
      padding.paddingRight = STABLE_INSETS.right;
    }
    if (edgesToApply.includes('bottom')) {
      padding.paddingBottom = STABLE_INSETS.bottom;
    }
    if (edgesToApply.includes('left')) {
      padding.paddingLeft = STABLE_INSETS.left;
    }

    return padding;
  }, [edges]);

  return (
    <View style={[paddingStyle, style]} className={className}>
      {children}
    </View>
  );
}

// Alias for backwards compatibility with any code still using the old name
export { SafeAreaView as StableSafeAreaView };
