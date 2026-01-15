import { View } from 'react-native';
import { AuthMethod } from './constants';
import { styles } from './styles';
import { ServerAddressInput } from './ServerAddressInput';
import { AuthMethodSelector } from './AuthMethodSelector';
import { ApiKeyAuth } from './ApiKeyAuth';
import { JellyfinAuth } from './JellyfinAuth';
import { LocalAuth } from './LocalAuth';
import { ConnectionButtons } from './ConnectionButtons';

interface ConnectionFormProps {
  protocol: 'http' | 'https';
  host: string;
  port: string;
  authMethod: AuthMethod;
  apiKey: string;
  username: string;
  password: string;
  jellyfinPassword: string;
  accentColor: string;
  isTesting: boolean;
  isLoading: boolean;
  currentUserName: string | undefined;
  activeServerUrl: string | undefined;
  onProtocolChange: (protocol: 'http' | 'https') => void;
  onHostChange: (host: string) => void;
  onPortChange: (port: string) => void;
  onAuthMethodChange: (method: AuthMethod) => void;
  onApiKeyChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onJellyfinPasswordChange: (value: string) => void;
  onTest: () => void;
  onConnect: () => void;
}

export function ConnectionForm({
  protocol,
  host,
  port,
  authMethod,
  apiKey,
  username,
  password,
  jellyfinPassword,
  accentColor,
  isTesting,
  isLoading,
  currentUserName,
  activeServerUrl,
  onProtocolChange,
  onHostChange,
  onPortChange,
  onAuthMethodChange,
  onApiKeyChange,
  onUsernameChange,
  onPasswordChange,
  onJellyfinPasswordChange,
  onTest,
  onConnect,
}: ConnectionFormProps) {
  return (
    <View style={styles.content}>
      <ServerAddressInput
        protocol={protocol}
        host={host}
        port={port}
        accentColor={accentColor}
        onProtocolChange={onProtocolChange}
        onHostChange={onHostChange}
        onPortChange={onPortChange}
      />

      <AuthMethodSelector
        authMethod={authMethod}
        accentColor={accentColor}
        onAuthMethodChange={onAuthMethodChange}
      />

      {authMethod === 'apikey' && (
        <ApiKeyAuth
          apiKey={apiKey}
          onApiKeyChange={onApiKeyChange}
        />
      )}

      {authMethod === 'jellyfin' && (
        <JellyfinAuth
          currentUserName={currentUserName}
          activeServerUrl={activeServerUrl}
          jellyfinPassword={jellyfinPassword}
          accentColor={accentColor}
          onJellyfinPasswordChange={onJellyfinPasswordChange}
        />
      )}

      {authMethod === 'local' && (
        <LocalAuth
          username={username}
          password={password}
          onUsernameChange={onUsernameChange}
          onPasswordChange={onPasswordChange}
        />
      )}

      <ConnectionButtons
        accentColor={accentColor}
        isTesting={isTesting}
        isLoading={isLoading}
        onTest={onTest}
        onConnect={onConnect}
      />
    </View>
  );
}
