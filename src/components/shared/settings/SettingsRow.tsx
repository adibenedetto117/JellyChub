import { View, Text, Pressable, Switch, StyleSheet } from 'react-native';

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

export function SettingsRow({ title, subtitle, onPress, rightElement }: SettingsRowProps) {
  const hasSwitch = rightElement && typeof rightElement === 'object' && 'type' in rightElement && rightElement.type === Switch;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.container}
      accessible={true}
      accessibilityRole={hasSwitch ? 'none' : onPress ? 'button' : 'text'}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={onPress && !hasSwitch ? `Opens ${title}` : undefined}
    >
      <View style={styles.content} accessible={false} importantForAccessibility="no-hide-descendants">
        <Text style={styles.title}>{title}</Text>
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
      {rightElement}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 2,
  },
});
