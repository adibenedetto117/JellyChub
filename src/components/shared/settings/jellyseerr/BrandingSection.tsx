import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK } from './constants';
import { styles } from './styles';

export function BrandingSection() {
  return (
    <View style={styles.brandingSection}>
      <LinearGradient
        colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
        style={styles.brandingIcon}
      >
        <Ionicons name="film" size={28} color="#fff" />
      </LinearGradient>
      <Text style={styles.brandingTitle}>Jellyseerr</Text>
      <Text style={styles.brandingSubtitle}>
        Request movies and TV shows from your media server
      </Text>
    </View>
  );
}
