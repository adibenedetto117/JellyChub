import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { authorizeQuickConnect, isQuickConnectEnabled } from '@/api';

const CODE_LENGTH = 6;

interface QuickConnectAuthorizeModalProps {
  visible: boolean;
  accentColor: string;
  onClose: () => void;
}

export function QuickConnectAuthorizeModal({
  visible,
  accentColor,
  onClose,
}: QuickConnectAuthorizeModalProps) {
  const [code, setCode] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!visible) return null;

  const handleAuthorize = async () => {
    if (code.length !== CODE_LENGTH) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setIsAuthorizing(true);
    setError(null);

    try {
      const enabled = await isQuickConnectEnabled();
      if (!enabled) {
        setError('Quick Connect is not enabled on this server');
        setIsAuthorizing(false);
        return;
      }

      await authorizeQuickConnect(code);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch {
      setError('Invalid code or authorization failed');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleKeyPress = (digit: string) => {
    if (code.length < CODE_LENGTH) {
      const newCode = code + digit;
      setCode(newCode);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setCode(code.slice(0, -1));
    setError(null);
  };

  const digits = code.split('');
  const emptySlots = Array(CODE_LENGTH - digits.length).fill('');

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Authorize Device</Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>X</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          {success ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>Device Authorized</Text>
              <Text style={styles.successHint}>The other device can now sign in</Text>
            </View>
          ) : (
            <>
              <Text style={styles.description}>
                Enter the 6-digit code from the other device
              </Text>

              <View style={styles.codeBoxes}>
                {[...digits, ...emptySlots].map((digit, index) => (
                  <View
                    key={index}
                    style={[
                      styles.codeBox,
                      index === digits.length && styles.codeBoxActive,
                      { borderColor: index === digits.length ? accentColor : 'rgba(255,255,255,0.2)' },
                    ]}
                  >
                    <Text style={styles.codeDigit}>{digit}</Text>
                  </View>
                ))}
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.numpad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <Pressable
                    key={num}
                    style={styles.numpadButton}
                    onPress={() => handleKeyPress(String(num))}
                    disabled={isAuthorizing || code.length >= CODE_LENGTH}
                  >
                    <Text style={styles.numpadText}>{num}</Text>
                  </Pressable>
                ))}
                <View style={styles.numpadButton} />
                <Pressable
                  style={styles.numpadButton}
                  onPress={() => handleKeyPress('0')}
                  disabled={isAuthorizing || code.length >= CODE_LENGTH}
                >
                  <Text style={styles.numpadText}>0</Text>
                </Pressable>
                <Pressable
                  style={styles.numpadButton}
                  onPress={handleBackspace}
                  disabled={isAuthorizing || code.length === 0}
                >
                  <Text style={styles.numpadText}>←</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleAuthorize}
                style={[
                  styles.authorizeButton,
                  { backgroundColor: code.length === CODE_LENGTH ? accentColor : 'rgba(255,255,255,0.1)' },
                  isAuthorizing && styles.authorizeButtonDisabled,
                ]}
                disabled={isAuthorizing || code.length !== CODE_LENGTH}
              >
                {isAuthorizing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.authorizeText, code.length !== CODE_LENGTH && styles.authorizeTextDisabled]}>
                    Authorize
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    width: '90%',
    maxWidth: 360,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeText: {
    color: '#fff',
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  description: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  codeBoxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  codeBox: {
    width: 44,
    height: 52,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  codeDigit: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
  },
  numpadButton: {
    width: '30%',
    aspectRatio: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  numpadText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '500',
  },
  authorizeButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  authorizeButtonDisabled: {
    opacity: 0.7,
  },
  authorizeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  authorizeTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successText: {
    color: '#4ade80',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  successHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
});
