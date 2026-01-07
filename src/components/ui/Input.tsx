import { View, TextInput, Text, TextInputProps } from 'react-native';
import { memo, useState } from 'react';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = memo(function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  ...props
}: Props) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-text-secondary text-sm mb-2">{label}</Text>
      )}

      <View
        className={`
          flex-row items-center
          bg-background-secondary rounded-xl
          ${isFocused ? 'border border-accent' : 'border border-transparent'}
          ${error ? 'border border-error' : ''}
        `}
      >
        {leftIcon && <View className="pl-4">{leftIcon}</View>}

        <TextInput
          {...props}
          className={`
            flex-1 text-white px-4 py-3
            ${leftIcon ? 'pl-2' : ''}
            ${rightIcon ? 'pr-2' : ''}
          `}
          placeholderTextColor="rgba(255,255,255,0.3)"
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
        />

        {rightIcon && <View className="pr-4">{rightIcon}</View>}
      </View>

      {error && (
        <Text className="text-error text-xs mt-1">{error}</Text>
      )}
    </View>
  );
});
