import { View, Text, TextInput, Pressable } from 'react-native';
import { DEFAULT_PORT } from './constants';
import { styles } from './styles';

interface ServerAddressInputProps {
  protocol: 'http' | 'https';
  host: string;
  port: string;
  accentColor: string;
  onProtocolChange: (protocol: 'http' | 'https') => void;
  onHostChange: (host: string) => void;
  onPortChange: (port: string) => void;
}

export function ServerAddressInput({
  protocol,
  host,
  port,
  accentColor,
  onProtocolChange,
  onHostChange,
  onPortChange,
}: ServerAddressInputProps) {
  return (
    <>
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
          placeholder={DEFAULT_PORT}
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={port}
          onChangeText={onPortChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="number-pad"
        />
      </View>
    </>
  );
}
