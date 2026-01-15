import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tvConstants } from '@/utils/platform';
import { TVFocusableButton } from '@/components/tv';

interface TVVideoPlayerHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onFocusChange?: (button: string) => void;
}

export function TVVideoPlayerHeader({
  title,
  subtitle,
  onClose,
  onFocusChange,
}: TVVideoPlayerHeaderProps) {
  return (
    <>
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.gradient}
      />
      <View style={styles.container}>
        <TVFocusableButton
          icon="close"
          onPress={onClose}
          size="medium"
          onFocus={() => onFocusChange?.('close')}
          accessibilityLabel="Close player"
        />
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tvConstants.controlBarPadding,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 24,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    marginTop: 4,
  },
});
