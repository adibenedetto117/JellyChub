import { useState } from 'react';
import { Text, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import { haptics } from '@/utils';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';
import { AccentColorPicker } from './AccentColorPicker';
import { PickerModal } from './PickerModal';
import { SUPPORTED_LANGUAGES, changeLanguage, i18n } from '@/i18n';

interface AppearanceSectionProps {
  showHideMediaToggle: boolean;
}

export function AppearanceSection({ showHideMediaToggle }: AppearanceSectionProps) {
  const { t } = useTranslation();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const {
    accentColor,
    reduceMotion,
    hapticsEnabled,
    hideMedia,
    language,
    setAccentColor,
    setReduceMotion,
    setHapticsEnabled,
    setHideMedia,
  } = useSettingsStore();

  return (
    <>
      <SettingsSection title={t('settings.language')}>
        <SettingsRow
          title={t('settings.appLanguage')}
          subtitle={SUPPORTED_LANGUAGES.find(l => l.code === (language || i18n.language))?.nativeName || 'English'}
          onPress={() => setShowLanguagePicker(true)}
          rightElement={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{'>'}</Text>}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.appearance')}>
        <AccentColorPicker selectedColor={accentColor} onSelect={setAccentColor} />
        <SettingsRow
          title={t('settings.reduceMotion')}
          subtitle={t('settings.reduceMotionDesc')}
          rightElement={
            <Switch
              value={reduceMotion}
              onValueChange={(value) => {
                haptics.medium();
                setReduceMotion(value);
              }}
              trackColor={{ false: '#3a3a3a', true: accentColor }}
            />
          }
        />
        <SettingsRow
          title={t('settings.hapticFeedback')}
          subtitle={t('settings.hapticFeedback')}
          rightElement={
            <Switch
              value={hapticsEnabled}
              onValueChange={(value) => {
                haptics.medium();
                setHapticsEnabled(value);
              }}
              trackColor={{ false: '#3a3a3a', true: accentColor }}
            />
          }
        />
        {(showHideMediaToggle || hideMedia) && (
          <SettingsRow
            title="Hide Media Info"
            rightElement={
              <Switch
                value={hideMedia}
                onValueChange={(value) => {
                  haptics.medium();
                  setHideMedia(value);
                }}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
              />
            }
          />
        )}
      </SettingsSection>

      {showLanguagePicker && (
        <PickerModal
          title="App Language"
          options={SUPPORTED_LANGUAGES.map(lang => ({
            label: lang.nativeName,
            value: lang.code,
            subtitle: lang.name,
          }))}
          selectedValue={language || i18n.language}
          onSelect={(code) => changeLanguage(code)}
          onClose={() => setShowLanguagePicker(false)}
          accentColor={accentColor}
        />
      )}
    </>
  );
}
