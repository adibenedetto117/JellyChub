import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface ConnectionFormProps {
  protocol: 'http' | 'https';
  host: string;
  port: string;
  apiKey: string;
  defaultPort: string;
  accentColor: string;
  isLoading: boolean;
  isTesting: boolean;
  onProtocolChange: (protocol: 'http' | 'https') => void;
  onHostChange: (host: string) => void;
  onPortChange: (port: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  onTestConnection: () => void;
  onConnect: () => void;
}

export function ConnectionForm({
  protocol,
  host,
  port,
  apiKey,
  defaultPort,
  accentColor,
  isLoading,
  isTesting,
  onProtocolChange,
  onHostChange,
  onPortChange,
  onApiKeyChange,
  onTestConnection,
  onConnect,
}: ConnectionFormProps) {
  return (
    <View style={styles.content}>
      <Text style={styles.label}>Server Address</Text>
      <View style={styles.urlRow}>
        <View style={styles.protocolPicker}>
          <Pressable
            style={[styles.protocolOption, protocol === 'http' && { backgroundColor: accentColor }]}
            onPress={() => onProtocolChange('http')}
          >
            <Text style={[styles.protocolOptionText, protocol === 'http' && { color: '#fff' }]}>http://</Text>
          </Pressable>
          <Pressable
            style={[styles.protocolOption, protocol === 'https' && { backgroundColor: accentColor }]}
            onPress={() => onProtocolChange('https')}
          >
            <Text style={[styles.protocolOptionText, protocol === 'https' && { color: '#fff' }]}>https://</Text>
          </Pressable>
        </View>
        <TextInput
          style={[styles.input, styles.hostInput]}
          placeholder="192.168.1.100"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={host}
          onChangeText={onHostChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TextInput
          style={[styles.input, styles.portInput]}
          placeholder={defaultPort}
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={port}
          onChangeText={onPortChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="number-pad"
        />
      </View>

      <Text style={styles.label}>API Key</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your Radarr API key"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={apiKey}
        onChangeText={onApiKeyChange}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Text style={styles.hint}>
        Find your API key in Radarr Settings, General, API Key
      </Text>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.testUrlButton, { borderColor: accentColor }]}
          onPress={onTestConnection}
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
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surface.default,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  testUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  testUrlButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectButton: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  protocolPicker: {
    flexDirection: 'column',
    backgroundColor: colors.surface.default,
    borderRadius: 10,
    overflow: 'hidden',
  },
  protocolOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  protocolOptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  hostInput: {
    flex: 1,
  },
  portInput: {
    width: 70,
    textAlign: 'center',
  },
});
