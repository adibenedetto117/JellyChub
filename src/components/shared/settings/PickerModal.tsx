import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';

interface PickerOption<T> {
  label: string;
  value: T;
  subtitle?: string;
}

interface PickerModalProps<T> {
  title: string;
  options: PickerOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  accentColor: string;
}

export function PickerModal<T>({
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  accentColor,
}: PickerModalProps<T>) {
  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>X</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.list}>
          {options.map((option, index) => (
            <Pressable
              key={index}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
              style={[
                styles.item,
                selectedValue === option.value && { backgroundColor: accentColor + '30' },
              ]}
            >
              <View>
                <Text style={styles.itemText}>{option.label}</Text>
                {option.subtitle && (
                  <Text style={styles.itemSubtitle}>{option.subtitle}</Text>
                )}
              </View>
              {selectedValue === option.value && (
                <View style={[styles.checkmark, { backgroundColor: accentColor }]}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
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
    width: '85%',
    maxHeight: '70%',
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
  list: {
    maxHeight: 400,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemText: {
    color: '#fff',
  },
  itemSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 12,
  },
});
