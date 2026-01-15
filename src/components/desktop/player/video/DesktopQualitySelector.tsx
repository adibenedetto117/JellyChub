import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type StreamingQuality = 'auto' | 'original' | '1080p' | '720p' | '480p';

interface QualityOption {
  value: StreamingQuality;
  label: string;
  description: string;
}

const QUALITY_OPTIONS: QualityOption[] = [
  { value: 'auto', label: 'Auto', description: 'Adjust based on network' },
  { value: 'original', label: 'Original', description: 'Direct play when possible' },
  { value: '1080p', label: '1080p', description: 'Full HD' },
  { value: '720p', label: '720p', description: 'HD' },
  { value: '480p', label: '480p', description: 'SD - Lower data usage' },
];

interface DesktopQualitySelectorProps {
  visible: boolean;
  onClose: () => void;
  accentColor: string;
  currentQuality: StreamingQuality;
  onSelectQuality: (quality: StreamingQuality) => void;
}

export function DesktopQualitySelector({
  visible,
  onClose,
  accentColor,
  currentQuality,
  onSelectQuality,
}: DesktopQualitySelectorProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.overlay}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Streaming Quality</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {QUALITY_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onSelectQuality(option.value);
                    onClose();
                  }}
                  style={styles.optionRow}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                  {currentQuality === option.value && (
                    <Ionicons name="checkmark" size={24} color={accentColor} />
                  )}
                </Pressable>
              ))}
            </ScrollView>

            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: 320,
  },
  content: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    color: '#fff',
    fontSize: 16,
  },
  optionDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
