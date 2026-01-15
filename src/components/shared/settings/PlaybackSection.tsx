import { useState } from 'react';
import { Text, Switch } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import { haptics } from '@/utils';
import { EQUALIZER_PRESETS, getPresetById, getLanguageName } from '@/constants';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';
import { LanguagePicker } from './LanguagePicker';
import { PickerModal } from './PickerModal';
import { SubtitleSettings } from './SubtitleSettings';

export function PlaybackSection() {
  const { t } = useTranslation();
  const [showSubtitleLanguagePicker, setShowSubtitleLanguagePicker] = useState(false);
  const [showAudioLanguagePicker, setShowAudioLanguagePicker] = useState(false);
  const [showEqualizerPicker, setShowEqualizerPicker] = useState(false);

  const {
    player,
    accentColor,
    equalizerPreset,
    updatePlayerSettings,
    setEqualizerPreset,
  } = useSettingsStore();

  return (
    <>
      <SettingsSection title={t('settings.playback')}>
        <SettingsRow
          title={t('settings.autoPlay')}
          rightElement={
            <Switch
              value={player.autoPlay}
              onValueChange={(value) => {
                haptics.medium();
                updatePlayerSettings({ autoPlay: value });
              }}
              trackColor={{ false: '#3a3a3a', true: accentColor }}
            />
          }
        />
        <SettingsRow
          title="Hardware Acceleration"
          subtitle="Use device GPU for video decoding"
          rightElement={
            <Switch
              value={player.hardwareAcceleration}
              onValueChange={(value) => {
                haptics.medium();
                updatePlayerSettings({ hardwareAcceleration: value });
              }}
              trackColor={{ false: '#3a3a3a', true: accentColor }}
            />
          }
        />
        <SettingsRow
          title="Default Audio Language"
          subtitle={getLanguageName(player.defaultAudioLanguage)}
          onPress={() => setShowAudioLanguagePicker(true)}
          rightElement={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{'>'}</Text>}
        />
        <SettingsRow
          title="Default Subtitle Language"
          subtitle={getLanguageName(player.defaultSubtitleLanguage)}
          onPress={() => setShowSubtitleLanguagePicker(true)}
          rightElement={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{'>'}</Text>}
        />
        <SettingsRow
          title="External Player"
          subtitle="Show button to open video in external apps"
          rightElement={
            <Switch
              value={player.externalPlayerEnabled ?? true}
              onValueChange={(value) => {
                haptics.medium();
                updatePlayerSettings({ externalPlayerEnabled: value });
              }}
              trackColor={{ false: '#3a3a3a', true: accentColor }}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Player Controls">
        <SettingsRow
          title="Customize Controls"
          subtitle="Choose which buttons appear in the video player"
          onPress={() => router.push('/settings/player-controls' as any)}
          rightElement={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{'>'}</Text>}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.audio')}>
        <SettingsRow
          title="Equalizer"
          subtitle={getPresetById(equalizerPreset)?.name ?? 'Flat'}
          onPress={() => setShowEqualizerPicker(true)}
          rightElement={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{'>'}</Text>}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.subtitles')}>
        <SettingsRow
          title="Force Subtitles"
          subtitle="Always enable subtitles when playing"
          rightElement={
            <Switch
              value={player.forceSubtitles}
              onValueChange={(value) => {
                haptics.medium();
                updatePlayerSettings({ forceSubtitles: value });
              }}
              trackColor={{ false: '#3a3a3a', true: accentColor }}
            />
          }
        />
        <SubtitleSettings
          subtitleSize={player.subtitleSize}
          subtitleTextColor={player.subtitleTextColor}
          subtitleBackgroundColor={player.subtitleBackgroundColor}
          subtitleBackgroundOpacity={player.subtitleBackgroundOpacity}
          accentColor={accentColor}
          onSizeChange={(size) => updatePlayerSettings({ subtitleSize: size })}
          onTextColorChange={(color) => updatePlayerSettings({ subtitleTextColor: color })}
          onBackgroundColorChange={(color) => updatePlayerSettings({ subtitleBackgroundColor: color })}
          onOpacityChange={(opacity) => updatePlayerSettings({ subtitleBackgroundOpacity: opacity })}
        />
      </SettingsSection>

      {showSubtitleLanguagePicker && (
        <LanguagePicker
          title="Default Subtitle Language"
          selectedCode={player.defaultSubtitleLanguage}
          onSelect={(code) => updatePlayerSettings({ defaultSubtitleLanguage: code })}
          onClose={() => setShowSubtitleLanguagePicker(false)}
          accentColor={accentColor}
        />
      )}

      {showAudioLanguagePicker && (
        <LanguagePicker
          title="Default Audio Language"
          selectedCode={player.defaultAudioLanguage}
          onSelect={(code) => updatePlayerSettings({ defaultAudioLanguage: code })}
          onClose={() => setShowAudioLanguagePicker(false)}
          accentColor={accentColor}
        />
      )}

      {showEqualizerPicker && (
        <PickerModal
          title="Equalizer Preset"
          options={EQUALIZER_PRESETS.filter(p => p.id !== 'custom').map(preset => ({
            label: preset.name,
            value: preset.id,
            subtitle: preset.bands.slice(0, 5).map(b => b > 0 ? `+${b}` : String(b)).join(', ') + '...',
          }))}
          selectedValue={equalizerPreset}
          onSelect={setEqualizerPreset}
          onClose={() => setShowEqualizerPicker(false)}
          accentColor={accentColor}
        />
      )}
    </>
  );
}
