import { ReactNode } from 'react';
import { Platform } from 'react-native';

interface Props {
  children: ReactNode;
}

export function CastProvider({ children }: Props) {
  if (Platform.OS === 'android') {
    try {
      const { CastContext } = require('react-native-google-cast');
      return <CastContext.Provider>{children}</CastContext.Provider>;
    } catch {
      return <>{children}</>;
    }
  }

  return <>{children}</>;
}
