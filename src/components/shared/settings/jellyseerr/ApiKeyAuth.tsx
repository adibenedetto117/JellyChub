import { Text, TextInput } from 'react-native';
import { styles } from './styles';

interface ApiKeyAuthProps {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
}

export function ApiKeyAuth({ apiKey, onApiKeyChange }: ApiKeyAuthProps) {
  return (
    <>
      <Text style={styles.label}>API Key</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your Jellyseerr API key"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={apiKey}
        onChangeText={onApiKeyChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.hint}>
        Find your API key in Jellyseerr Settings → General → API Key
      </Text>
    </>
  );
}
