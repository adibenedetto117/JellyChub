import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { colors } from '@/theme';

const JELLYSEERR_PURPLE_DARK = '#4f46e5';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  backdropUrl: string | null;
  topInset: number;
  onBack: () => void;
  onSearch: () => void;
}

export function DetailsBackdrop({ backdropUrl, topInset, onBack, onSearch }: Props) {
  return (
    <View style={styles.container}>
      {backdropUrl ? (
        <CachedImage uri={backdropUrl} style={styles.backdrop} priority="high" />
      ) : (
        <LinearGradient colors={[JELLYSEERR_PURPLE_DARK, colors.background.primary]} style={styles.backdrop} />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(10,10,10,0.4)', 'rgba(10,10,10,0.9)', colors.background.primary]}
        locations={[0, 0.4, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Pressable style={[styles.navButton, { top: topInset + 8, left: 16 }]} onPress={onBack}>
        <View style={styles.navButtonInner}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </View>
      </Pressable>

      <Pressable style={[styles.navButton, { top: topInset + 8, right: 16 }]} onPress={onSearch}>
        <View style={styles.navButtonInner}>
          <Ionicons name="search" size={20} color="#fff" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT * 0.45,
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    zIndex: 10,
  },
  navButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
