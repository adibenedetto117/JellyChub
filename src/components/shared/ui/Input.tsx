import { View, TextInput, Text, TextInputProps, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { memo, useState, forwardRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type InputType = 'text' | 'password' | 'email' | 'search' | 'number' | 'phone' | 'url';
type InputSize = 'small' | 'medium' | 'large';
type InputVariant = 'default' | 'filled' | 'outline';

interface Props extends Omit<TextInputProps, 'secureTextEntry'> {
  label?: string;
  error?: string;
  hint?: string;
  type?: InputType;
  size?: InputSize;
  variant?: InputVariant;
  leftIcon?: React.ReactNode;
  leftIconName?: string;
  rightIcon?: React.ReactNode;
  rightIconName?: string;
  onRightIconPress?: () => void;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  required?: boolean;
}

const keyboardTypes: Record<InputType, TextInputProps['keyboardType']> = {
  text: 'default',
  password: 'default',
  email: 'email-address',
  search: 'default',
  number: 'numeric',
  phone: 'phone-pad',
  url: 'url',
};

const sizeStyles: Record<InputSize, { padding: number; fontSize: number; iconSize: number }> = {
  small: { padding: 8, fontSize: 13, iconSize: 16 },
  medium: { padding: 12, fontSize: 15, iconSize: 18 },
  large: { padding: 16, fontSize: 17, iconSize: 22 },
};

export const Input = memo(forwardRef<TextInput, Props>(function Input({
  label,
  error,
  hint,
  type = 'text',
  size = 'medium',
  variant = 'default',
  leftIcon,
  leftIconName,
  rightIcon,
  rightIconName,
  onRightIconPress,
  disabled = false,
  containerStyle,
  required = false,
  ...props
}, ref) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const isSearch = type === 'search';
  const sizeConfig = sizeStyles[size];

  const getVariantStyle = (): ViewStyle => {
    const base: ViewStyle = {
      backgroundColor: variant === 'filled' ? colors.surface.elevated : colors.surface.default,
      borderWidth: 1,
      borderColor: 'transparent',
    };

    if (error) {
      base.borderColor = colors.status.error;
    } else if (isFocused) {
      base.borderColor = colors.accent.primary;
    } else if (variant === 'outline') {
      base.borderColor = colors.surface.elevated;
    }

    return base;
  };

  const renderLeftIcon = () => {
    if (leftIcon) return leftIcon;
    if (leftIconName) {
      return <Ionicons name={leftIconName as any} size={sizeConfig.iconSize} color={colors.text.secondary} />;
    }
    if (isSearch) {
      return <Ionicons name="search" size={sizeConfig.iconSize} color={colors.text.secondary} />;
    }
    return null;
  };

  const renderRightIcon = () => {
    if (isPassword) {
      return (
        <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
          <Ionicons
            name={showPassword ? 'eye-off' : 'eye'}
            size={sizeConfig.iconSize}
            color={colors.text.secondary}
          />
        </Pressable>
      );
    }
    if (rightIcon) return rightIcon;
    if (rightIconName) {
      const iconElement = (
        <Ionicons name={rightIconName as any} size={sizeConfig.iconSize} color={colors.text.secondary} />
      );
      if (onRightIconPress) {
        return (
          <Pressable onPress={onRightIconPress} hitSlop={8}>
            {iconElement}
          </Pressable>
        );
      }
      return iconElement;
    }
    return null;
  };

  const leftIconElement = renderLeftIcon();
  const rightIconElement = renderRightIcon();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          getVariantStyle(),
          { borderRadius: size === 'small' ? 8 : 12 },
          disabled && styles.disabled,
        ]}
      >
        {leftIconElement && (
          <View style={[styles.iconContainer, { paddingLeft: sizeConfig.padding }]}>
            {leftIconElement}
          </View>
        )}

        <TextInput
          ref={ref}
          {...props}
          editable={!disabled}
          keyboardType={keyboardTypes[type]}
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize={type === 'email' || type === 'url' ? 'none' : props.autoCapitalize}
          autoComplete={type === 'email' ? 'email' : type === 'password' ? 'password' : props.autoComplete}
          style={[
            styles.input,
            {
              fontSize: sizeConfig.fontSize,
              paddingVertical: sizeConfig.padding,
              paddingLeft: leftIconElement ? 8 : sizeConfig.padding,
              paddingRight: rightIconElement ? 8 : sizeConfig.padding,
            },
          ]}
          placeholderTextColor={colors.text.tertiary}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
        />

        {rightIconElement && (
          <View style={[styles.iconContainer, { paddingRight: sizeConfig.padding }]}>
            {rightIconElement}
          </View>
        )}
      </View>

      {(error || hint) && (
        <Text style={[styles.helper, error && styles.errorText]}>
          {error || hint}
        </Text>
      )}
    </View>
  );
}));

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  required: {
    color: colors.status.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: '#fff',
  },
  iconContainer: {
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  helper: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    color: colors.status.error,
  },
});
