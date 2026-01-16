import { useState, useCallback, useEffect } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { tvConstants } from '@/utils/platform';

const TV_ACCENT_GOLD = '#D4A84B';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function TVJellyseerrSearchInput({
  value,
  onChangeText,
  placeholder = 'Search movies and TV shows...',
  autoFocus = false,
  onFocus,
  onBlur,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const borderOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0.05);

  useEffect(() => {
    if (isFocused) {
      borderOpacity.value = withTiming(1, { duration: tvConstants.focusDuration });
      bgOpacity.value = withTiming(0.1, { duration: tvConstants.focusDuration });
    } else {
      borderOpacity.value = withTiming(0, { duration: tvConstants.focusDuration });
      bgOpacity.value = withTiming(0.05, { duration: tvConstants.focusDuration });
    }
  }, [isFocused, borderOpacity, bgOpacity]);

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(255,255,255,${bgOpacity.value})`,
  }));

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  const handleClear = useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  return (
    <AnimatedView style={[styles.container, bgStyle]}>
      <Ionicons
        name="search"
        size={24}
        color={isFocused ? TV_ACCENT_GOLD : 'rgba(255,255,255,0.4)'}
        style={styles.searchIcon}
      />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.3)"
        style={styles.input}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoFocus={autoFocus}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {value.length > 0 && (
        <Pressable onPress={handleClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.4)" />
        </Pressable>
      )}

      <Animated.View style={[styles.focusBorder, borderStyle]} />
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 20,
    height: 64,
    overflow: 'hidden',
  },
  searchIcon: {
    marginRight: 16,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: '400',
    height: '100%',
  },
  clearButton: {
    padding: 8,
  },
  focusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: TV_ACCENT_GOLD,
  },
});
