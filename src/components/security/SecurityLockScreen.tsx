import { useEffect, useRef, useCallback } from 'react';
import { View, AppState, AppStateStatus, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSecurityStore } from '@/stores/securityStore';
import { colors } from '@/theme';
import { PinLock } from './PinLock';

interface SecurityLockScreenProps {
  children: React.ReactNode;
}

export function SecurityLockScreen({ children }: SecurityLockScreenProps) {
  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef<number | null>(null);

  const {
    isLocked,
    settings,
    checkAutoLock,
    lock,
    unlock,
    updateLastActiveTime,
    checkBiometricAvailability,
  } = useSecurityStore();

  useEffect(() => {
    checkBiometricAvailability();
  }, [checkBiometricAvailability]);

  useEffect(() => {
    if (settings.pinEnabled) {
      checkAutoLock();
    }
  }, [settings.pinEnabled, checkAutoLock]);

  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      if (!settings.pinEnabled) {
        appState.current = nextAppState;
        return;
      }

      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        backgroundTime.current = Date.now();
        updateLastActiveTime();

        if (settings.autoLockTimeout === 'immediate') {
          lock();
        }
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (backgroundTime.current) {
          checkAutoLock();
          backgroundTime.current = null;
        }
      }

      appState.current = nextAppState;
    },
    [settings.pinEnabled, settings.autoLockTimeout, lock, checkAutoLock, updateLastActiveTime]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  const handleUnlock = useCallback(() => {
    unlock();
  }, [unlock]);

  const showBlur = settings.hideInAppSwitcher && appState.current !== 'active';

  return (
    <View style={{ flex: 1 }}>
      {children}

      {isLocked && settings.pinEnabled && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background.primary,
            zIndex: 9999,
          }}
        >
          <PinLock mode="unlock" onSuccess={handleUnlock} />
        </View>
      )}

      {showBlur && !isLocked && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9998,
          }}
        >
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={100}
              tint="dark"
              style={{ flex: 1 }}
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: colors.background.primary }} />
          )}
        </View>
      )}
    </View>
  );
}
