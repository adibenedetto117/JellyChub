import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthMethod } from './constants';
import { styles } from './styles';

interface AuthMethodSelectorProps {
  authMethod: AuthMethod;
  accentColor: string;
  onAuthMethodChange: (method: AuthMethod) => void;
}

interface AuthMethodButtonProps {
  method: AuthMethod;
  label: string;
  icon: string;
  currentMethod: AuthMethod;
  accentColor: string;
  onPress: (method: AuthMethod) => void;
}

function AuthMethodButton({ method, label, icon, currentMethod, accentColor, onPress }: AuthMethodButtonProps) {
  const isSelected = currentMethod === method;

  return (
    <Pressable
      onPress={() => onPress(method)}
      style={[
        styles.authMethodButton,
        isSelected && { backgroundColor: accentColor + '20', borderColor: accentColor },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={isSelected ? accentColor : 'rgba(255,255,255,0.5)'}
      />
      <Text style={[styles.authMethodText, isSelected && { color: accentColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AuthMethodSelector({ authMethod, accentColor, onAuthMethodChange }: AuthMethodSelectorProps) {
  return (
    <>
      <Text style={styles.label}>Authentication Method</Text>
      <View style={styles.authMethodRow}>
        <AuthMethodButton
          method="apikey"
          label="API Key"
          icon="key-outline"
          currentMethod={authMethod}
          accentColor={accentColor}
          onPress={onAuthMethodChange}
        />
        <AuthMethodButton
          method="jellyfin"
          label="Jellyfin"
          icon="link-outline"
          currentMethod={authMethod}
          accentColor={accentColor}
          onPress={onAuthMethodChange}
        />
        <AuthMethodButton
          method="local"
          label="Password"
          icon="lock-closed-outline"
          currentMethod={authMethod}
          accentColor={accentColor}
          onPress={onAuthMethodChange}
        />
      </View>
    </>
  );
}
