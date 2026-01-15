import { View, Text, StyleSheet } from 'react-native';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.container} accessible={true} accessibilityRole="none">
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    marginHorizontal: 16,
  },
  title: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  content: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
});
