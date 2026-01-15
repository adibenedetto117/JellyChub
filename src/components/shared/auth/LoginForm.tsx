import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

interface LoginFormProps {
  username: string;
  password: string;
  showPassword: boolean;
  isLoading: boolean;
  error: string | null;
  onUsernameChange: (text: string) => void;
  onPasswordChange: (text: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
  animationDelay?: number;
}

export function LoginForm({
  username,
  password,
  showPassword,
  isLoading,
  error,
  onUsernameChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  animationDelay = 300,
}: LoginFormProps) {
  const { t } = useTranslation();

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(400)}
      className="bg-surface rounded-2xl p-5 border border-white/5"
    >
      <View className="mb-4">
        <Text className="text-text-tertiary text-xs uppercase tracking-wider mb-2">
          {t('auth.username')}
        </Text>
        <TextInput
          className="bg-background-secondary text-white px-4 py-3.5 rounded-xl text-base"
          placeholder={t('auth.enterUsername')}
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={username}
          onChangeText={onUsernameChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View className="mb-4">
        <Text className="text-text-tertiary text-xs uppercase tracking-wider mb-2">
          {t('auth.password')}
        </Text>
        <View className="flex-row items-center bg-background-secondary rounded-xl">
          <TextInput
            className="flex-1 text-white px-4 py-3.5 text-base"
            placeholder={t('auth.enterPassword')}
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={password}
            onChangeText={onPasswordChange}
            secureTextEntry={!showPassword}
          />
          <Pressable
            className="px-4 py-3.5"
            onPress={onTogglePassword}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
          >
            <Text className="text-text-tertiary text-sm">
              {showPassword ? t('auth.hide') : t('auth.show')}
            </Text>
          </Pressable>
        </View>
      </View>

      {error && (
        <View className="bg-error/10 rounded-xl px-4 py-3 mb-4">
          <Text className="text-error text-sm">{error}</Text>
        </View>
      )}

      <Pressable
        className={`py-3.5 rounded-xl items-center ${
          isLoading ? 'bg-accent/70' : 'bg-accent'
        }`}
        onPress={onSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <View className="flex-row items-center">
            <ActivityIndicator color="white" size="small" />
            <Text className="text-white font-semibold ml-2">{t('auth.signingIn')}</Text>
          </View>
        ) : (
          <Text className="text-white font-semibold text-base">{t('auth.signIn')}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
