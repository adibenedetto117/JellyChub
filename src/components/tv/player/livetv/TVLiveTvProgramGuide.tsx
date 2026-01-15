import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { LiveTvProgram } from '@/types/livetv';

interface TVLiveTvProgramGuideProps {
  currentProgram: LiveTvProgram | null | undefined;
  accentColor: string;
}

export function TVLiveTvProgramGuide({
  currentProgram,
  accentColor,
}: TVLiveTvProgramGuideProps) {
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
    marginRight: 40,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 12,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  programTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  programTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
