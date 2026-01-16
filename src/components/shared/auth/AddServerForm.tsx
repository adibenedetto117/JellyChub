import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

interface CustomHeader {
  id: string;
  name: string;
  value: string;
}

interface AddServerFormProps {
  protocol: 'http' | 'https';
  host: string;
  port: string;
  isValidating: boolean;
  error: string | null;
  showAdvanced: boolean;
  customHeaders: CustomHeader[];
  hasExistingServers: boolean;
  onProtocolChange: (protocol: 'http' | 'https') => void;
  onHostChange: (text: string) => void;
  onPortChange: (text: string) => void;
  onToggleAdvanced: () => void;
  onAddHeader: () => void;
  onUpdateHeader: (id: string, field: 'name' | 'value', value: string) => void;
  onRemoveHeader: (id: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function AddServerForm({
  protocol,
  host,
  port,
  isValidating,
  error,
  showAdvanced,
  customHeaders,
  hasExistingServers,
  onProtocolChange,
  onHostChange,
  onPortChange,
  onToggleAdvanced,
  onAddHeader,
  onUpdateHeader,
  onRemoveHeader,
  onSubmit,
  onCancel,
}: AddServerFormProps) {
  const { t } = useTranslation();

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      className="bg-surface rounded-2xl p-5 border border-white/5"
    >
      <Text className="text-white text-lg font-semibold mb-4">{t('auth.addServer')}</Text>

      <View className="mb-4">
        <Text className="text-text-tertiary text-xs uppercase tracking-wider mb-2">
          {t('auth.serverUrl')}
        </Text>

        <View className="flex-row gap-2 items-center">
          <View className="bg-background-secondary rounded-xl overflow-hidden">
            <Pressable
              className={`px-3 py-3 ${protocol === 'https' ? 'bg-accent' : ''}`}
              onPress={() => onProtocolChange('https')}
            >
              <Text className={`text-xs font-medium ${protocol === 'https' ? 'text-white' : 'text-white/50'}`}>
                https://
              </Text>
            </Pressable>
            <Pressable
              className={`px-3 py-3 ${protocol === 'http' ? 'bg-accent' : ''}`}
              onPress={() => onProtocolChange('http')}
            >
              <Text className={`text-xs font-medium ${protocol === 'http' ? 'text-white' : 'text-white/50'}`}>
                http://
              </Text>
            </Pressable>
          </View>

          <TextInput
            className="flex-1 bg-background-secondary text-white px-4 py-3.5 rounded-xl text-base"
            placeholder="jellyfin.example.com"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={host}
            onChangeText={onHostChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            autoFocus={!hasExistingServers}
          />

          <TextInput
            className="w-16 bg-background-secondary text-white px-3 py-3.5 rounded-xl text-base text-center"
            placeholder="8096"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={port}
            onChangeText={onPortChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Pressable
        className="flex-row items-center mb-4"
        onPress={onToggleAdvanced}
      >
        <Text className="text-text-secondary text-sm">{showAdvanced ? '[-]' : '[+]'}</Text>
        <Text className="text-text-secondary text-sm ml-2">
          {t('auth.advanced', 'Advanced')}
        </Text>
      </Pressable>

      {showAdvanced && (
        <View className="mb-4 bg-background-secondary rounded-xl p-4">
          <Text className="text-text-tertiary text-xs uppercase tracking-wider mb-2">
            {t('auth.customHeaders', 'Custom HTTP Headers')}
          </Text>
          <Text className="text-text-muted text-xs mb-3">
            {t('auth.customHeadersDesc', 'Add custom HTTP headers to requests')}
          </Text>

          {customHeaders.map((header) => (
            <View key={header.id} className="flex-row items-center mb-2">
              <TextInput
                className="flex-1 bg-surface text-white px-3 py-2.5 rounded-lg text-sm mr-2"
                placeholder={t('auth.headerName', 'Header name')}
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={header.name}
                onChangeText={(text) => onUpdateHeader(header.id, 'name', text)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                className="flex-1 bg-surface text-white px-3 py-2.5 rounded-lg text-sm mr-2"
                placeholder={t('auth.headerValue', 'Value')}
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={header.value}
                onChangeText={(text) => onUpdateHeader(header.id, 'value', text)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                className="p-2"
                onPress={() => onRemoveHeader(header.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className="text-error text-base">x</Text>
              </Pressable>
            </View>
          ))}

          <Pressable
            className="flex-row items-center justify-center py-2 mt-1"
            onPress={onAddHeader}
          >
            <Text className="text-accent text-sm mr-1">+</Text>
            <Text className="text-accent text-sm">{t('auth.addHeader', 'Add Header')}</Text>
          </Pressable>
        </View>
      )}

      {error && (
        <View className="bg-error/10 rounded-xl px-4 py-3 mb-4">
          <Text className="text-error text-sm">{error}</Text>
        </View>
      )}

      <Pressable
        className={`py-3.5 rounded-xl items-center ${
          isValidating ? 'bg-accent/70' : 'bg-accent'
        }`}
        onPress={onSubmit}
        disabled={isValidating}
      >
        {isValidating ? (
          <View className="flex-row items-center">
            <ActivityIndicator color="white" size="small" />
            <Text className="text-white font-semibold ml-2">{t('auth.connecting')}</Text>
          </View>
        ) : (
          <Text className="text-white font-semibold text-base">{t('auth.connect')}</Text>
        )}
      </Pressable>

      {hasExistingServers && (
        <Pressable className="py-3 mt-2 items-center" onPress={onCancel}>
          <Text className="text-text-secondary">{t('common.cancel')}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}
