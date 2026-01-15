import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface TVLiveTvControlsProps {
  controlsStyle: { opacity: number; pointerEvents: 'auto' | 'none' };
  children?: React.ReactNode;
  bottomContent?: React.ReactNode;
}

export function TVLiveTvControls({
  controlsStyle,
  children,
  bottomContent,
}: TVLiveTvControlsProps) {
  const { t } = useTranslation();

  return (
    <Animated.View style={[styles.controlsContainer, controlsStyle]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.5)', 'transparent']}
        style={styles.topGradient}
      >
        <View style={styles.topControls}>{children}</View>
      </LinearGradient>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
        style={styles.bottomGradient}
      >
        <View style={styles.bottomControls}>
          {bottomContent}
          <View style={styles.remoteHints}>
            <Text style={styles.hintText}>
              Up/Down = Change Channel | Left = Channel List | Long Up = Favorite
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topGradient: {
    paddingBottom: 60,
    paddingTop: 40,
    paddingHorizontal: 60,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 60,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  remoteHints: {
    alignItems: 'flex-end',
  },
  hintText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
});
