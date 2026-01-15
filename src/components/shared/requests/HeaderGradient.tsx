import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { JELLYSEERR_PURPLE } from './constants';

export function HeaderGradient() {
  return (
    <LinearGradient
      colors={[`${JELLYSEERR_PURPLE}20`, `${JELLYSEERR_PURPLE}05`, 'transparent']}
      style={styles.headerGradient}
    />
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
});
