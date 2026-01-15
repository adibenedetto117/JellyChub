import { View, Text, StyleSheet } from 'react-native';

interface TVMusicPlayerQueueProps {
  hintText?: string;
}

export function TVMusicPlayerQueue({ hintText }: TVMusicPlayerQueueProps) {
  const displayText = hintText || 'OK = Play/Pause • Left/Right = Skip • Up = Favorite • Down = Repeat';

  return (
    <View style={styles.container}>
      <Text style={styles.hintText}>{displayText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
});
