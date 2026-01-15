import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';

interface ConnectionButtonsProps {
  accentColor: string;
  isTesting: boolean;
  isLoading: boolean;
  onTest: () => void;
  onConnect: () => void;
}

export function ConnectionButtons({
  accentColor,
  isTesting,
  isLoading,
  onTest,
  onConnect,
}: ConnectionButtonsProps) {
  return (
    <View style={styles.buttonRow}>
      <Pressable
        style={[styles.testUrlButton, { borderColor: accentColor }]}
        onPress={onTest}
        disabled={isTesting}
      >
        {isTesting ? (
          <ActivityIndicator color={accentColor} size="small" />
        ) : (
          <>
            <Ionicons name="flash-outline" size={18} color={accentColor} />
            <Text style={[styles.testUrlButtonText, { color: accentColor }]}>Test</Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={[styles.connectButton, { backgroundColor: accentColor, flex: 1 }]}
        onPress={onConnect}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.connectButtonText}>Connect</Text>
        )}
      </Pressable>
    </View>
  );
}
