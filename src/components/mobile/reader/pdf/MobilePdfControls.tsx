import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MobilePdfControlsProps {
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  accentColor: string;
  insets: { bottom: number };
}

export function MobilePdfControls({
  currentPage,
  totalPages,
  progressPercent,
  onPrevPage,
  onNextPage,
  accentColor,
  insets,
}: MobilePdfControlsProps) {
  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>{progressPercent}%</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
        </View>
      </View>
      <View style={styles.pageRow}>
        <Pressable
          onPress={onPrevPage}
          disabled={currentPage <= 1}
          style={[styles.navButton, currentPage <= 1 && styles.navButtonDisabled]}
        >
          <Ionicons name="chevron-back" size={24} color={currentPage <= 1 ? '#666' : '#fff'} />
        </Pressable>
        <Text style={styles.pageText}>
          {currentPage} / {totalPages || '...'}
        </Text>
        <Pressable
          onPress={onNextPage}
          disabled={currentPage >= totalPages}
          style={[styles.navButton, currentPage >= totalPages && styles.navButtonDisabled]}
        >
          <Ionicons name="chevron-forward" size={24} color={currentPage >= totalPages ? '#666' : '#fff'} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
    width: 40,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginLeft: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  pageText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    minWidth: 80,
    textAlign: 'center',
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
});
