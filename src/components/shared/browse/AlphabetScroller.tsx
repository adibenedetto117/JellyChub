import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';

export const FULL_ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];

interface AlphabetScrollerProps {
  availableLetters: string[];
  onLetterPress: (letter: string) => void;
  accentColor: string;
}

export const AlphabetScroller = memo(function AlphabetScroller({
  availableLetters,
  onLetterPress,
  accentColor,
}: AlphabetScrollerProps) {
  return (
    <View style={styles.container}>
      {FULL_ALPHABET.map((letter) => {
        const isAvailable = availableLetters.includes(letter);
        return (
          <Pressable
            key={letter}
            onPress={() => isAvailable && onLetterPress(letter)}
            style={styles.letter}
          >
            <Text style={[
              styles.letterText,
              { color: isAvailable ? accentColor : 'rgba(255,255,255,0.2)' }
            ]}>
              {letter}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 24,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  letterText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
