import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';

export interface DropdownOption<T = number | undefined> {
  value: T;
  label: string;
  subtitle?: string;
}

interface DropdownProps<T> {
  label: string;
  options: DropdownOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  accentColor: string;
}

function ChevronDownIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: size * 0.35, borderRightWidth: size * 0.35, borderTopWidth: size * 0.4,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color
      }} />
    </View>
  );
}

function CheckIcon({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.35, height: size * 0.55, borderRightWidth: 2, borderBottomWidth: 2, borderColor: color, transform: [{ rotate: '45deg' }], marginTop: -size * 0.1 }} />
    </View>
  );
}

export function Dropdown<T>({ label, options, selectedValue, onSelect, accentColor }: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === selectedValue);

  return (
    <>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={styles.dropdownButton}
      >
        <View style={styles.dropdownButtonContent}>
          <Text style={styles.dropdownButtonText} numberOfLines={1}>
            {selectedOption?.label || 'Select...'}
          </Text>
          {selectedOption?.subtitle && (
            <Text style={styles.dropdownButtonSubtext} numberOfLines={1}>
              {selectedOption.subtitle}
            </Text>
          )}
        </View>
        <ChevronDownIcon size={14} color="rgba(255,255,255,0.5)" />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.dropdownOverlay} onPress={() => setIsOpen(false)}>
          <View style={styles.dropdownMenu}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>{label}</Text>
              <Pressable onPress={() => setIsOpen(false)} style={styles.dropdownCloseBtn}>
                <Text style={styles.dropdownCloseBtnText}>Done</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
              {options.map((option, index) => (
                <Pressable
                  key={String(option.value ?? 'none')}
                  onPress={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                  style={[
                    styles.dropdownOption,
                    selectedValue === option.value && { backgroundColor: accentColor + '20' },
                    index === options.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.dropdownOptionContent}>
                    <Text style={styles.dropdownOptionText}>{option.label}</Text>
                    {option.subtitle && (
                      <Text style={styles.dropdownOptionSubtext}>{option.subtitle}</Text>
                    )}
                  </View>
                  {selectedValue === option.value && (
                    <CheckIcon size={18} color={accentColor} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dropdownLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dropdownButtonContent: {
    flex: 1,
    marginRight: 12,
  },
  dropdownButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownButtonSubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    width: '85%',
    maxWidth: 380,
    maxHeight: '70%',
    backgroundColor: '#242424',
    borderRadius: 16,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dropdownHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dropdownCloseBtnText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownScroll: {
    maxHeight: 350,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownOptionContent: {
    flex: 1,
    marginRight: 12,
  },
  dropdownOptionText: {
    color: '#fff',
    fontSize: 15,
  },
  dropdownOptionSubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
});
