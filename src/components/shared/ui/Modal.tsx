import { memo, useEffect, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, Dimensions, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Modal as RNModal } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

type ModalSize = 'small' | 'medium' | 'large' | 'fullscreen';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  footer?: ReactNode;
  contentStyle?: ViewStyle;
  scrollable?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const sizeStyles: Record<ModalSize, ViewStyle> = {
  small: { width: Math.min(320, SCREEN_WIDTH - 48), maxHeight: SCREEN_HEIGHT * 0.5 },
  medium: { width: Math.min(400, SCREEN_WIDTH - 32), maxHeight: SCREEN_HEIGHT * 0.7 },
  large: { width: Math.min(540, SCREEN_WIDTH - 24), maxHeight: SCREEN_HEIGHT * 0.85 },
  fullscreen: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, borderRadius: 0 },
};

export const Modal = memo(function Modal({
  visible,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnBackdrop = true,
  footer,
  contentStyle,
  scrollable = false,
}: ModalProps) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
    } else {
      opacity.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.cubic) });
      scale.value = withTiming(0.95, { duration: 150, easing: Easing.in(Easing.cubic) });
    }
  }, [visible, opacity, scale]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  const isFullscreen = size === 'fullscreen';

  const ContentWrapper = scrollable ? ScrollView : View;
  const contentWrapperProps = scrollable
    ? { showsVerticalScrollIndicator: false, contentContainerStyle: { flexGrow: 1 } }
    : { style: { flex: 1 } };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
        </Animated.View>

        <Animated.View
          style={[
            styles.container,
            sizeStyles[size],
            isFullscreen && { paddingTop: insets.top, paddingBottom: insets.bottom },
            contentAnimStyle,
          ]}
        >
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title ? (
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
              ) : (
                <View />
              )}
              {showCloseButton && (
                <Pressable
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </Pressable>
              )}
            </View>
          )}

          <ContentWrapper {...contentWrapperProps}>
            <View style={[styles.content, contentStyle]}>{children}</View>
          </ContentWrapper>

          {footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
});

interface ModalActionsProps {
  children: ReactNode;
  style?: ViewStyle;
}

export const ModalActions = memo(function ModalActions({ children, style }: ModalActionsProps) {
  return <View style={[styles.actions, style]}>{children}</View>;
});

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    backgroundColor: colors.surface.elevated,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surface.default,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});
