import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSecurityStore } from '@/stores/securityStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { haptics } from '@/utils';
import { colors } from '@/theme';

const PIN_LENGTH = 4;

interface PinLockProps {
  mode: 'unlock' | 'setup' | 'confirm';
  onSuccess: (pin?: string) => void;
  onCancel?: () => void;
  setupPin?: string;
}

export function PinLock({ mode, onSuccess, onCancel, setupPin }: PinLockProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shakeAnim] = useState(new Animated.Value(0));

  const { settings, verifyPin, savePin, authenticateWithBiometrics, biometricType } =
    useSecurityStore();
  const accentColor = useSettingsStore((state) => state.accentColor);

  const shake = useCallback(() => {
    haptics.error();
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleBiometricAuth = useCallback(async () => {
    if (!settings.biometricEnabled || mode !== 'unlock') return;

    const success = await authenticateWithBiometrics();
    if (success) {
      haptics.success();
      onSuccess();
    }
  }, [settings.biometricEnabled, mode, authenticateWithBiometrics, onSuccess]);

  useEffect(() => {
    if (mode === 'unlock' && settings.biometricEnabled) {
      handleBiometricAuth();
    }
  }, [mode, settings.biometricEnabled, handleBiometricAuth]);

  const handlePinEntry = useCallback(
    async (digit: string) => {
      if (pin.length >= PIN_LENGTH) return;

      haptics.light();
      const newPin = pin + digit;
      setPin(newPin);
      setError('');

      if (newPin.length === PIN_LENGTH) {
        if (mode === 'unlock') {
          const isValid = await verifyPin(newPin);
          if (isValid) {
            haptics.success();
            onSuccess();
          } else {
            shake();
            setError('Incorrect PIN');
            setPin('');
          }
        } else if (mode === 'setup') {
          haptics.success();
          onSuccess(newPin);
        } else if (mode === 'confirm') {
          if (newPin === setupPin) {
            await savePin(newPin);
            haptics.success();
            onSuccess();
          } else {
            shake();
            setError('PINs do not match');
            setPin('');
          }
        }
      }
    },
    [pin, mode, verifyPin, savePin, setupPin, onSuccess, shake]
  );

  const handleDelete = useCallback(() => {
    if (pin.length > 0) {
      haptics.light();
      setPin(pin.slice(0, -1));
      setError('');
    }
  }, [pin]);

  const getTitle = () => {
    switch (mode) {
      case 'unlock':
        return 'Enter PIN';
      case 'setup':
        return 'Create PIN';
      case 'confirm':
        return 'Confirm PIN';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'unlock':
        return 'Enter your PIN to unlock the app';
      case 'setup':
        return 'Create a 4-digit PIN';
      case 'confirm':
        return 'Re-enter your PIN to confirm';
    }
  };

  const getBiometricIcon = () => {
    if (biometricType === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
      return Platform.OS === 'ios' ? 'scan-outline' : 'happy-outline';
    }
    return 'finger-print-outline';
  };

  const renderPinDots = () => {
    return (
      <Animated.View
        style={{ transform: [{ translateX: shakeAnim }] }}
        className="flex-row justify-center gap-4 mb-8"
      >
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <View
            key={index}
            className="w-4 h-4 rounded-full"
            style={{
              backgroundColor: index < pin.length ? accentColor : colors.surface.elevated,
            }}
          />
        ))}
      </Animated.View>
    );
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['bio', '0', 'del'],
    ];

    return (
      <View className="gap-4">
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row justify-center gap-6">
            {row.map((key) => {
              if (key === 'bio') {
                if (mode === 'unlock' && settings.biometricEnabled) {
                  return (
                    <Pressable
                      key={key}
                      onPress={handleBiometricAuth}
                      className="w-20 h-20 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.surface.elevated }}
                    >
                      <Ionicons
                        name={getBiometricIcon()}
                        size={32}
                        color={accentColor}
                      />
                    </Pressable>
                  );
                }
                return <View key={key} className="w-20 h-20" />;
              }

              if (key === 'del') {
                return (
                  <Pressable
                    key={key}
                    onPress={handleDelete}
                    onLongPress={() => {
                      haptics.medium();
                      setPin('');
                    }}
                    className="w-20 h-20 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.surface.elevated }}
                  >
                    <Ionicons name="backspace-outline" size={28} color={colors.text.primary} />
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={key}
                  onPress={() => handlePinEntry(key)}
                  className="w-20 h-20 rounded-full items-center justify-center active:opacity-70"
                  style={{ backgroundColor: colors.surface.elevated }}
                >
                  <Text className="text-white text-3xl font-medium">{key}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 justify-center items-center px-6"
      style={{ backgroundColor: colors.background.primary }}
    >
      {onCancel && (
        <Pressable
          onPress={onCancel}
          className="absolute top-16 left-4 p-2"
        >
          <Text className="text-text-secondary text-base">Cancel</Text>
        </Pressable>
      )}

      <View className="items-center mb-12">
        <View
          className="w-20 h-20 rounded-2xl items-center justify-center mb-6"
          style={{ backgroundColor: accentColor }}
        >
          <Ionicons name="lock-closed" size={40} color="white" />
        </View>
        <Text className="text-white text-2xl font-bold mb-2">{getTitle()}</Text>
        <Text className="text-text-secondary text-base text-center">{getSubtitle()}</Text>
      </View>

      {renderPinDots()}

      {error ? (
        <Text className="text-error text-sm mb-4">{error}</Text>
      ) : (
        <View className="h-6 mb-4" />
      )}

      {renderKeypad()}
    </SafeAreaView>
  );
}
