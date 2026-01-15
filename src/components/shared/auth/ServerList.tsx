import { Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { ServerInfo } from '@/api';
import { ServerCard } from './ServerCard';

interface Server {
  id: string;
  name: string;
  url: string;
  customHeaders?: Record<string, string>;
}

interface ServerConnectionStatus {
  isOnline: boolean;
  serverInfo: ServerInfo | null;
  isChecking: boolean;
}

interface ServerListProps {
  servers: Server[];
  connectionStatus: Record<string, ServerConnectionStatus | undefined>;
  onSelectServer: (id: string) => void;
  onRemoveServer: (id: string) => void;
  animationDelay?: number;
}

export function ServerList({
  servers,
  connectionStatus,
  onSelectServer,
  onRemoveServer,
  animationDelay = 200,
}: ServerListProps) {
  const { t } = useTranslation();

  if (servers.length === 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)} className="mb-6">
      <Text className="text-text-secondary text-sm font-medium uppercase tracking-wider mb-3">
        {t('auth.savedServers')}
      </Text>
      {servers.map((server, index) => (
        <ServerCard
          key={server.id}
          server={server}
          status={connectionStatus[server.id]}
          onSelect={() => onSelectServer(server.id)}
          onRemove={() => onRemoveServer(server.id)}
          index={index}
        />
      ))}
    </Animated.View>
  );
}
