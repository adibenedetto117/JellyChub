import { useState } from 'react';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';

interface AboutSectionProps {
  onHideMediaToggleUnlocked: () => void;
}

export function AboutSection({ onHideMediaToggleUnlocked }: AboutSectionProps) {
  const [tapCount, setTapCount] = useState(0);

  const handleVersionTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 7) {
      onHideMediaToggleUnlocked();
      setTapCount(0);
    }
  };

  return (
    <SettingsSection title="About">
      <SettingsRow
        title="Version"
        subtitle="1.0.0"
        onPress={handleVersionTap}
      />
      <SettingsRow title="Build" subtitle="1" />
    </SettingsSection>
  );
}
