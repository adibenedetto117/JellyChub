import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { appStorage } from './storage';

const PIN_STORAGE_KEY = 'app_security_pin';

export type AutoLockTimeout = 'immediate' | '1min' | '5min' | '15min' | '30min' | 'never';

export interface SecuritySettings {
  pinEnabled: boolean;
  biometricEnabled: boolean;
  autoLockTimeout: AutoLockTimeout;
  hideInAppSwitcher: boolean;
}

interface SecurityState {
  _hasHydrated: boolean;
  isLocked: boolean;
  lastActiveTime: number | null;
  settings: SecuritySettings;
  biometricType: LocalAuthentication.AuthenticationType | null;

  setHasHydrated: (state: boolean) => void;
  setIsLocked: (locked: boolean) => void;
  updateLastActiveTime: () => void;
  setSettings: (settings: Partial<SecuritySettings>) => void;
  setBiometricType: (type: LocalAuthentication.AuthenticationType | null) => void;

  savePin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  hasPin: () => Promise<boolean>;
  removePin: () => Promise<void>;

  checkBiometricAvailability: () => Promise<{
    available: boolean;
    type: LocalAuthentication.AuthenticationType | null;
  }>;
  authenticateWithBiometrics: () => Promise<boolean>;

  checkAutoLock: () => boolean;
  lock: () => void;
  unlock: () => void;
}

const getTimeoutMs = (timeout: AutoLockTimeout): number => {
  switch (timeout) {
    case 'immediate':
      return 0;
    case '1min':
      return 60 * 1000;
    case '5min':
      return 5 * 60 * 1000;
    case '15min':
      return 15 * 60 * 1000;
    case '30min':
      return 30 * 60 * 1000;
    case 'never':
      return Infinity;
    default:
      return 5 * 60 * 1000;
  }
};

const defaultSettings: SecuritySettings = {
  pinEnabled: false,
  biometricEnabled: false,
  autoLockTimeout: '5min',
  hideInAppSwitcher: false,
};

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      isLocked: false,
      lastActiveTime: null,
      settings: defaultSettings,
      biometricType: null,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setIsLocked: (locked) => set({ isLocked: locked }),

      updateLastActiveTime: () => set({ lastActiveTime: Date.now() }),

      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      setBiometricType: (type) => set({ biometricType: type }),

      savePin: async (pin: string) => {
        await SecureStore.setItemAsync(PIN_STORAGE_KEY, pin);
        set((state) => ({
          settings: { ...state.settings, pinEnabled: true },
        }));
      },

      verifyPin: async (pin: string) => {
        const storedPin = await SecureStore.getItemAsync(PIN_STORAGE_KEY);
        return storedPin === pin;
      },

      hasPin: async () => {
        const storedPin = await SecureStore.getItemAsync(PIN_STORAGE_KEY);
        return storedPin !== null;
      },

      removePin: async () => {
        await SecureStore.deleteItemAsync(PIN_STORAGE_KEY);
        set((state) => ({
          settings: { ...state.settings, pinEnabled: false, biometricEnabled: false },
        }));
      },

      checkBiometricAvailability: async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) {
          return { available: false, type: null };
        }

        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!isEnrolled) {
          return { available: false, type: null };
        }

        const supportedTypes =
          await LocalAuthentication.supportedAuthenticationTypesAsync();

        let type: LocalAuthentication.AuthenticationType | null = null;
        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          type = LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION;
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          type = LocalAuthentication.AuthenticationType.FINGERPRINT;
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          type = LocalAuthentication.AuthenticationType.IRIS;
        }

        set({ biometricType: type });
        return { available: type !== null, type };
      },

      authenticateWithBiometrics: async () => {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock JellyChub',
          cancelLabel: 'Use PIN',
          disableDeviceFallback: true,
        });
        return result.success;
      },

      checkAutoLock: () => {
        const state = get();
        const { settings, lastActiveTime, isLocked } = state;

        if (!settings.pinEnabled || isLocked) {
          return false;
        }

        if (settings.autoLockTimeout === 'never') {
          return false;
        }

        if (lastActiveTime === null) {
          return true;
        }

        const timeoutMs = getTimeoutMs(settings.autoLockTimeout);
        const elapsed = Date.now() - lastActiveTime;

        if (elapsed >= timeoutMs) {
          set({ isLocked: true });
          return true;
        }

        return false;
      },

      lock: () => {
        const { settings } = get();
        if (settings.pinEnabled) {
          set({ isLocked: true });
        }
      },

      unlock: () => {
        set({ isLocked: false, lastActiveTime: Date.now() });
      },
    }),
    {
      name: 'security-storage',
      storage: createJSONStorage(() => appStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (state?.settings.pinEnabled) {
          state.setIsLocked(true);
        }
      },
      partialize: (state) => ({
        settings: state.settings,
        lastActiveTime: state.lastActiveTime,
      }),
    }
  )
);

export const selectSecuritySettings = (state: SecurityState) => state.settings;
export const selectIsLocked = (state: SecurityState) => state.isLocked;
export const selectBiometricType = (state: SecurityState) => state.biometricType;
