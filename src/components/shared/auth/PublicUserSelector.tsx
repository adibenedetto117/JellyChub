import { Text, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { JellyfinUser } from '@/types/jellyfin';
import { UserAvatar } from './UserAvatar';

interface PublicUserSelectorProps {
  users: JellyfinUser[];
  selectedUsername: string;
  onSelectUser: (user: JellyfinUser) => void;
  animationDelay?: number;
}

export function PublicUserSelector({
  users,
  selectedUsername,
  onSelectUser,
  animationDelay = 200,
}: PublicUserSelectorProps) {
  const { t } = useTranslation();

  if (users.length === 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)} className="mb-6">
      <Text className="text-text-secondary text-sm font-medium uppercase tracking-wider mb-3">
        {t('auth.selectUser')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-1"
        contentContainerClassName="px-1"
      >
        {users.map((user) => (
          <UserAvatar
            key={user.Id}
            user={user}
            isSelected={selectedUsername === user.Name}
            onPress={() => onSelectUser(user)}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}
