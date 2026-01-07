import { ReactNode } from 'react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { QueryProvider } from './QueryProvider';

interface Props {
  children: ReactNode;
}

export function Providers({ children }: Props) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryProvider>{children}</QueryProvider>
    </SafeAreaProvider>
  );
}

export { QueryProvider, queryClient } from './QueryProvider';
