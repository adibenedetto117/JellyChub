import { View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';

interface JellyfinAuthProps {
  currentUserName: string | undefined;
  activeServerUrl: string | undefined;
  jellyfinPassword: string;
  accentColor: string;
  onJellyfinPasswordChange: (value: string) => void;
}

export function JellyfinAuth({
  currentUserName,
  activeServerUrl,
  jellyfinPassword,
  accentColor,
  onJellyfinPasswordChange,
}: JellyfinAuthProps) {
  return (
    <>
      <View style={styles.jellyfinInfo}>
        <Ionicons name="information-circle-outline" size={20} color={accentColor} />
        <View style={{ flex: 1 }}>
          <Text style={styles.jellyfinInfoText}>
            Will authenticate as: {currentUserName ?? 'Not logged in'}
          </Text>
          <Text style={[styles.jellyfinInfoText, { fontSize: 11, marginTop: 4, opacity: 0.7 }]}>
            Jellyfin server: {activeServerUrl ?? 'Not connected'}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>Jellyfin Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your Jellyfin password"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={jellyfinPassword}
        onChangeText={onJellyfinPasswordChange}
        secureTextEntry
      />
      <Text style={styles.hint}>
        Jellyseerr requires your Jellyfin password to authenticate. Your password is not stored.
      </Text>
    </>
  );
}
