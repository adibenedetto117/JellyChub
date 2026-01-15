import { ReactNode } from 'react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { QueryProvider } from './QueryProvider';
import { TVFocusProvider } from './TVFocusProvider';

interface Props {
  children: ReactNode;
}

export function Providers({ children }: Props) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryProvider>
        <TVFocusProvider>{children}</TVFocusProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}

export { QueryProvider, queryClient } from './QueryProvider';
export { TVFocusProvider, useTVFocus, type FocusArea, type TVFocusState, type TVFocusContextValue } from './TVFocusProvider';
export { SafeAreaView, StableSafeAreaView, useStableInsets } from './StableSafeAreaProvider';
export { CastProvider } from './CastProvider';
