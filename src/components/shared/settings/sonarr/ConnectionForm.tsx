import { memo } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors } from '@/theme';
import { DEFAULT_PORT, SONARR_BLUE, SONARR_GRADIENT } from './constants';
import { styles } from './styles';

interface ConnectionFormProps {
  protocol: 'http' | 'https';
  host: string;
  port: string;
  apiKey: string;
  isTesting: boolean;
  isLoading: boolean;
  onProtocolChange: (protocol: 'http' | 'https') => void;
  onHostChange: (host: string) => void;
  onPortChange: (port: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  onTest: () => void;
  onConnect: () => void;
}

export const ConnectionForm = memo(function ConnectionForm({
  protocol,
  host,
  port,
  apiKey,
  isTesting,
  isLoading,
  onProtocolChange,
  onHostChange,
  onPortChange,
  onApiKeyChange,
  onTest,
  onConnect,
}: ConnectionFormProps) {
  return (
    <>
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <Text style={styles.label}>Server Address</Text>
        <View style={styles.urlRow}>
          <View style={styles.protocolPicker}>
            <Pressable
              style={[styles.protocolOption, protocol === 'http' && styles.protocolOptionActive]}
              onPress={() => onProtocolChange('http')}
            >
              <Text style={[styles.protocolOptionText, protocol === 'http' && styles.protocolOptionTextActive]}>http</Text>
            </Pressable>
            <Pressable
              style={[styles.protocolOption, protocol === 'https' && styles.protocolOptionActive]}
              onPress={() => onProtocolChange('https')}
            >
              <Text style={[styles.protocolOptionText, protocol === 'https' && styles.protocolOptionTextActive]}>https</Text>
            </Pressable>
          </View>
          <TextInput
            style={[styles.input, styles.hostInput]}
            placeholder="192.168.1.100 or hostname"
            placeholderTextColor={colors.text.muted}
            value={host}
            onChangeText={onHostChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TextInput
            style={[styles.input, styles.portInput]}
            placeholder={DEFAULT_PORT}
            placeholderTextColor={colors.text.muted}
            value={port}
            onChangeText={onPortChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(150).springify()}>
        <Text style={styles.label}>API Key</Text>
        <View style={styles.apiKeyContainer}>
          <Ionicons name="key-outline" size={18} color={colors.text.muted} style={styles.apiKeyIcon} />
          <TextInput
            style={styles.apiKeyInput}
            placeholder="Enter your Sonarr API key"
            placeholderTextColor={colors.text.muted}
            value={apiKey}
            onChangeText={onApiKeyChange}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>
        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} />
          <Text style={styles.hint}>
            Settings &gt; General &gt; Security &gt; API Key
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.testUrlButton, { opacity: pressed ? 0.8 : 1, borderColor: SONARR_BLUE }]}
          onPress={onTest}
          disabled={isTesting}
        >
          {isTesting ? (
            <ActivityIndicator color={SONARR_BLUE} size="small" />
          ) : (
            <>
              <Ionicons name="flash-outline" size={18} color={SONARR_BLUE} />
              <Text style={[styles.testUrlButtonText, { color: SONARR_BLUE }]}>Test</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.connectButton, { opacity: pressed ? 0.9 : 1 }]}
          onPress={onConnect}
          disabled={isLoading}
        >
          <LinearGradient colors={SONARR_GRADIENT} style={styles.connectGradient}>
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="link" size={18} color="#fff" />
                <Text style={styles.connectButtonText}>Connect</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </>
  );
});
