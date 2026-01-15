import { useRef, useEffect } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, StyleSheet, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';
import { colors } from '@/theme';

export interface SearchInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
  containerStyle?: 'default' | 'modal';
}

export function SearchInput({
  value,
  onChangeText,
  isLoading = false,
  autoFocus = false,
  showBackButton = false,
  onBackPress,
  containerStyle = 'default',
  placeholder = 'Search...',
  ...textInputProps
}: SearchInputProps) {
  const inputRef = useRef<TextInput>(null);
  const accentColor = useSettingsStore((s) => s.accentColor);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [autoFocus]);

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  if (containerStyle === 'modal') {
    return (
      <View style={styles.modalContainer}>
        {showBackButton && (
          <Pressable onPress={onBackPress} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={accentColor} />
          </Pressable>
        )}
        <View style={styles.modalInputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.modalInput}
            placeholder={placeholder}
            placeholderTextColor="#555"
            value={value}
            onChangeText={onChangeText}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={accentColor}
            {...textInputProps}
          />
          {isLoading && <ActivityIndicator color={accentColor} size="small" />}
          {value.length > 0 && !isLoading && (
            <Pressable onPress={handleClear}>
              <Ionicons name="close-circle" size={18} color="#666" style={styles.clearIcon} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.defaultContainer}>
      <TextInput
        ref={inputRef}
        style={styles.defaultInput}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        {...textInputProps}
      />
      {isLoading && value.length >= 2 && (
        <ActivityIndicator color={accentColor} size="small" />
      )}
      {value.length > 0 && !isLoading && (
        <Pressable onPress={handleClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  defaultContainer: {
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  defaultInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  modalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingRight: 12,
  },
  modalInputWrapper: {
    flex: 1,
    backgroundColor: colors.surface.default,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  modalInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
    fontSize: 16,
  },
  clearIcon: {
    paddingLeft: 8,
  },
});
