import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TVPdfControlsProps {
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  accentColor: string;
  insets: { bottom: number };
}

export function TVPdfControls({
  currentPage,
  totalPages,
  progressPercent,
  accentColor,
  insets,
}: TVPdfControlsProps) {
  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.remoteHints}>
        <View style={styles.remoteHint}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
          <Text style={styles.remoteHintText}>Previous</Text>
        </View>
        <View style={styles.pageInfoContainer}>
          <Text style={styles.pageText}>
            {currentPage} / {totalPages || '...'}
          </Text>
        </View>
        <View style={styles.remoteHint}>
          <Text style={styles.remoteHintText}>Next</Text>
          <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
        </View>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>{progressPercent}%</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 48,
    paddingTop: 16,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  remoteHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  remoteHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remoteHintText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  pageInfoContainer: {
    alignItems: 'center',
  },
  pageText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    width: 60,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginLeft: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
