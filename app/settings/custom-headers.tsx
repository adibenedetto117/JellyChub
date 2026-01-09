import { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore } from '@/stores';
import { colors } from '@/theme';

interface HeaderItemProps {
  name: string;
  value: string;
  onEdit: () => void;
  onDelete: () => void;
  accentColor: string;
}

function HeaderItem({ name, value, onEdit, onDelete, accentColor }: HeaderItemProps) {
  return (
    <View style={styles.headerItem}>
      <View style={styles.headerContent}>
        <Text style={styles.headerName}>{name}</Text>
        <Text style={styles.headerValue} numberOfLines={1}>{value}</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          onPress={onEdit}
          style={[styles.actionButton, { backgroundColor: accentColor + '20' }]}
        >
          <Ionicons name="pencil-outline" size={16} color={accentColor} />
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={[styles.actionButton, { backgroundColor: 'rgba(239,68,68,0.15)' }]}
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
}

export default function CustomHeadersScreen() {
  const { accentColor } = useSettingsStore();
  const {
    servers,
    activeServerId,
    addCustomHeader,
    removeCustomHeader,
    setCustomHeaders,
  } = useAuthStore();

  const activeServer = servers.find((s) => s.id === activeServerId);
  const customHeaders = activeServer?.customHeaders ?? {};
  const headerEntries = Object.entries(customHeaders);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [headerName, setHeaderName] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  const handleAddHeader = useCallback(() => {
    const trimmedName = headerName.trim();
    const trimmedValue = headerValue.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Header name is required');
      return;
    }

    if (!trimmedValue) {
      Alert.alert('Error', 'Header value is required');
      return;
    }

    // Check for duplicate header names (case-insensitive)
    const existingHeaders = Object.keys(customHeaders);
    const isDuplicate = existingHeaders.some(
      (h) => h.toLowerCase() === trimmedName.toLowerCase() && h !== editingHeader
    );

    if (isDuplicate) {
      Alert.alert('Error', 'A header with this name already exists');
      return;
    }

    if (editingHeader) {
      // If editing, remove old header first if name changed
      if (editingHeader !== trimmedName) {
        const newHeaders = { ...customHeaders };
        delete newHeaders[editingHeader];
        newHeaders[trimmedName] = trimmedValue;
        setCustomHeaders(newHeaders);
      } else {
        addCustomHeader(trimmedName, trimmedValue);
      }
    } else {
      addCustomHeader(trimmedName, trimmedValue);
    }

    setShowAddModal(false);
    setEditingHeader(null);
    setHeaderName('');
    setHeaderValue('');
  }, [headerName, headerValue, customHeaders, editingHeader, addCustomHeader, setCustomHeaders]);

  const handleEditHeader = useCallback((name: string) => {
    setEditingHeader(name);
    setHeaderName(name);
    setHeaderValue(customHeaders[name] ?? '');
    setShowAddModal(true);
  }, [customHeaders]);

  const handleDeleteHeader = useCallback((name: string) => {
    Alert.alert(
      'Delete Header',
      `Are you sure you want to delete the "${name}" header?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeCustomHeader(name),
        },
      ]
    );
  }, [removeCustomHeader]);

  const handleCancelModal = useCallback(() => {
    setShowAddModal(false);
    setEditingHeader(null);
    setHeaderName('');
    setHeaderValue('');
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Custom Headers',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: '#fff',
          headerBackTitle: 'Settings',
        }}
      />

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Headers list */}
          {headerEntries.length > 0 ? (
            <View style={styles.headersList}>
              {headerEntries.map(([name, value]) => (
                <HeaderItem
                  key={name}
                  name={name}
                  value={value}
                  onEdit={() => handleEditHeader(name)}
                  onDelete={() => handleDeleteHeader(name)}
                  accentColor={accentColor}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No custom headers</Text>
            </View>
          )}

          {/* Add button */}
          <Pressable
            style={[styles.addButton, { backgroundColor: accentColor }]}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Header</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingHeader ? 'Edit Header' : 'Add Header'}
              </Text>
              <Pressable onPress={handleCancelModal} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Header Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Remote-User"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={headerName}
                onChangeText={setHeaderName}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.inputLabel}>Header Value</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., myusername"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={headerValue}
                onChangeText={setHeaderValue}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={handleCancelModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveButton, { backgroundColor: accentColor }]}
                  onPress={handleAddHeader}
                >
                  <Text style={styles.saveButtonText}>
                    {editingHeader ? 'Save' : 'Add'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headersList: {
    marginBottom: 16,
  },
  headerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  headerValue: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 24,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 16,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
