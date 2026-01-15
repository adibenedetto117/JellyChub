import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { LiveTvProgram } from '@/types/livetv';

interface MobileLiveTvProgramGuideProps {
  currentProgram: LiveTvProgram | null | undefined;
  accentColor: string;
}

export function MobileLiveTvProgramGuide({
  currentProgram,
  accentColor,
}: MobileLiveTvProgramGuideProps) {
  const { t } = useTranslation();

  if (!currentProgram) return null;

  return (
    <View style={styles.programInfo}>
      <View style={[styles.liveBadge, { backgroundColor: accentColor }]}>
        <Text style={styles.liveBadgeText}>{t('player.live')}</Text>
      </View>
      <Text style={styles.programTitle} numberOfLines={1}>
        {currentProgram.Name}
      </Text>
      <Text style={styles.programTime}>
        {new Date(currentProgram.StartDate).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}{' '}
        -{' '}
        {new Date(currentProgram.EndDate).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  programInfo: {
    flex: 1,
    marginRight: 20,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginBottom: 10,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  programTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  programTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
