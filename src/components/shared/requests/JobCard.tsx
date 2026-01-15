import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { JELLYSEERR_PURPLE } from './constants';
import type { JellyseerrJob } from '@/types/jellyseerr';

interface JobCardProps {
  job: JellyseerrJob;
  onRun: () => void;
  onCancel: () => void;
  isRunning: boolean;
}

export function JobCard({ job, onRun, onCancel, isRunning }: JobCardProps) {
  const nextRun = new Date(job.nextExecutionTime);
  const isValidDate = !isNaN(nextRun.getTime());
  const nextRunText = isValidDate
    ? nextRun.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    : 'N/A';

  return (
    <View style={styles.jobCard}>
      <View style={styles.jobCardHeader}>
        <View style={[styles.jobCardIcon, { backgroundColor: job.running ? '#22c55e20' : `${JELLYSEERR_PURPLE}20` }]}>
          <Ionicons
            name={job.running ? 'sync' : 'time-outline'}
            size={18}
            color={job.running ? '#22c55e' : JELLYSEERR_PURPLE}
          />
        </View>
        <View style={styles.jobCardContent}>
          <Text style={styles.jobCardTitle}>{job.name}</Text>
          <Text style={styles.jobCardSubtitle}>
            {job.running ? 'Running...' : `Next: ${nextRunText}`}
          </Text>
        </View>
        <Pressable
          onPress={job.running ? onCancel : onRun}
          disabled={isRunning}
          style={[styles.jobCardButton, job.running && styles.jobCardButtonCancel]}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={job.running ? 'stop' : 'play'}
                size={14}
                color="#fff"
              />
              <Text style={styles.jobCardButtonText}>
                {job.running ? 'Stop' : 'Run'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  jobCard: {
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  jobCardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  jobCardSubtitle: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 2,
  },
  jobCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: JELLYSEERR_PURPLE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  jobCardButtonCancel: {
    backgroundColor: '#ef4444',
  },
  jobCardButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
