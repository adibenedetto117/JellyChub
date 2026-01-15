import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ErrorStateProps {
  message: string;
  details?: string;
  accentColor: string;
  onGoBack: () => void;
  t: (key: string) => string;
}

export function ErrorState({ message, details, accentColor, onGoBack, t }: ErrorStateProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      className="flex-1 bg-background items-center justify-center px-4"
    >
      <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
      <Text className="text-red-400 text-center mt-4">{message}</Text>
      {details && (
        <Text className="text-text-tertiary text-center mt-2">{details}</Text>
      )}
      <Pressable
        onPress={onGoBack}
        className="mt-6 px-6 py-3 rounded-lg"
        style={{ backgroundColor: accentColor }}
      >
        <Text className="text-white font-medium">{t('common.goBack')}</Text>
      </Pressable>
    </Animated.View>
  );
}

interface MissingParamsErrorProps {
  rawType: string | undefined;
  id: string | undefined;
  accentColor: string;
  onGoBack: () => void;
  t: (key: string) => string;
}

export function MissingParamsError({ rawType, id, accentColor, onGoBack, t }: MissingParamsErrorProps) {
  return (
    <ErrorState
      message={t('details.errorLoading')}
      details={`Missing required navigation parameters (type: ${rawType || 'undefined'}, id: ${id || 'undefined'})`}
      accentColor={accentColor}
      onGoBack={onGoBack}
      t={t}
    />
  );
}
