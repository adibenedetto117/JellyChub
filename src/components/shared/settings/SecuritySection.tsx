import { useState, useCallback, useEffect } from 'react';
import { View, Text, Switch, Alert, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { useSecurityStore, type AutoLockTimeout } from '@/stores/securityStore';
import { haptics } from '@/utils';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';
import { PickerModal } from './PickerModal';
import { PinLock } from '@/components/shared/security';

interface SecuritySectionProps {
  accentColor: string;
}

const AUTO_LOCK_OPTIONS: { label: string; value: AutoLockTimeout }[] = [
  { label: 'Immediately', value: 'immediate' },
  { label: '1 minute', value: '1min' },
  { label: '5 minutes', value: '5min' },
  { label: '15 minutes', value: '15min' },
  { label: '30 minutes', value: '30min' },
  { label: 'Never', value: 'never' },
];

function getAutoLockLabel(value: AutoLockTimeout): string {
  return AUTO_LOCK_OPTIONS.find((o) => o.value === value)?.label ?? '5 minutes';
}

export function SecuritySection({ accentColor }: SecuritySectionProps) {
  const { t } = useTranslation();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [showAutoLockPicker, setShowAutoLockPicker] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const {
    settings: securitySettings,
    setSettings: setSecuritySettings,
    removePin,
    biometricType,
    checkBiometricAvailability,
  } = useSecurityStore();

  useEffect(() => {
    checkBiometricAvailability().then(({ available }) => {
      setBiometricAvailable(available);
    });
  }, [checkBiometricAvailability]);

  const handlePinSetupComplete = useCallback((pin: string) => {
    setSetupPin(pin);
    setShowPinSetup(false);
    setShowPinConfirm(true);
  }, []);

  const handlePinConfirmComplete = useCallback(() => {
    setShowPinConfirm(false);
    setSetupPin('');
    Alert.alert('Success', 'PIN has been set successfully.');
  }, []);

  const handleDisablePin = useCallback(() => {
    Alert.alert(
      'Disable PIN Lock',
      'Are you sure you want to disable PIN lock?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: () => {
            removePin();
          },
        },
      ]
    );
  }, [removePin]);

  const getBiometricLabel = () => {
    if (biometricType === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
    }
    return 'Fingerprint';
  };

  return (
    <>
      <SettingsSection title={t('settings.security')}>
        <SettingsRow
          title={t('settings.appLock')}
          subtitle={securitySettings.pinEnabled ? t('settings.pinEnabled') : t('settings.notConfigured')}
          onPress={() => {
            if (securitySettings.pinEnabled) {
              handleDisablePin();
            } else {
              setShowPinSetup(true);
            }
          }}
          rightElement={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{'>'}</Text>}
        />
        {securitySettings.pinEnabled && biometricAvailable && (
          <SettingsRow
            title={getBiometricLabel()}
            subtitle={`Use ${getBiometricLabel()} to unlock`}
            rightElement={
              <Switch
                value={securitySettings.biometricEnabled}
                onValueChange={(value) => {
                  haptics.medium();
                  setSecuritySettings({ biometricEnabled: value });
                }}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
              />
            }
          />
        )}
        {securitySettings.pinEnabled && (
          <SettingsRow
            title="Auto-Lock"
            subtitle={getAutoLockLabel(securitySettings.autoLockTimeout)}
            onPress={() => setShowAutoLockPicker(true)}
            rightElement={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{'>'}</Text>}
          />
        )}
        <SettingsRow
          title={t('settings.hideInAppSwitcher')}
          subtitle={t('settings.hideInAppSwitcher')}
          rightElement={
            <Switch
              value={securitySettings.hideInAppSwitcher}
              onValueChange={(value) => {
                haptics.medium();
                setSecuritySettings({ hideInAppSwitcher: value });
              }}
              trackColor={{ false: '#3a3a3a', true: accentColor }}
            />
          }
        />
      </SettingsSection>

      {showPinSetup && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
          <PinLock
            mode="setup"
            onSuccess={(enteredPin) => {
              if (enteredPin) handlePinSetupComplete(enteredPin);
            }}
            onCancel={() => setShowPinSetup(false)}
          />
        </View>
      )}

      {showPinConfirm && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
          <PinLock
            mode="confirm"
            setupPin={setupPin}
            onSuccess={handlePinConfirmComplete}
            onCancel={() => {
              setShowPinConfirm(false);
              setSetupPin('');
            }}
          />
        </View>
      )}

      {showAutoLockPicker && (
        <PickerModal
          title="Auto-Lock"
          options={AUTO_LOCK_OPTIONS}
          selectedValue={securitySettings.autoLockTimeout}
          onSelect={(value) => setSecuritySettings({ autoLockTimeout: value })}
          onClose={() => setShowAutoLockPicker(false)}
          accentColor={accentColor}
        />
      )}
    </>
  );
}
