import { Text, TextInput } from 'react-native';
import { styles } from './styles';

interface LocalAuthProps {
  username: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}

export function LocalAuth({ username, password, onUsernameChange, onPasswordChange }: LocalAuthProps) {
  return (
    <>
      <Text style={styles.label}>Email or Username</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email or username"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={username}
        onChangeText={onUsernameChange}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your password"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={password}
        onChangeText={onPasswordChange}
        secureTextEntry
      />
    </>
  );
}
