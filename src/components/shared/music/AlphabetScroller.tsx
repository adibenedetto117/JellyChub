import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';

const FULL_ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];

interface AlphabetScrollerProps {
  availableLetters: string[];
  onLetterPress: (letter: string) => void;
  accentColor: string;
}

export const AlphabetScroller = memo(function AlphabetScroller({ availableLetters, onLetterPress, accentColor }: AlphabetScrollerProps) {
  return (
    <View style={styles.alphabetContainer}>
      {FULL_ALPHABET.map((letter) => {
        const isAvailable = availableLetters.includes(letter);
        return (
          <Pressable
            key={letter}
            onPress={() => onLetterPress(letter)}
            style={styles.alphabetLetter}
          >
            <Text style={[
              styles.alphabetLetterText,
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

export { FULL_ALPHABET };

const styles = StyleSheet.create({
  alphabetContainer: {
    position: 'absolute',
    right: 2,
    top: 40,
    bottom: 80,
    width: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  alphabetLetter: {
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  alphabetLetterText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
