import { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors } from '@/theme';
import { useLiveTvStore } from '@/stores';

interface ChannelGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectGroup: (groupName: string) => void;
  channelId?: string;
  accentColor: string;
}

export const ChannelGroupModal = memo(function ChannelGroupModal({
  visible,
  onClose,
  onSelectGroup,
  channelId,
  accentColor,
}: ChannelGroupModalProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const groupNames = useLiveTvStore((s) => s.getGroupNames());
  const createGroup = useLiveTvStore((s) => s.createGroup);
  const deleteGroup = useLiveTvStore((s) => s.deleteGroup);
  const getChannelsInGroup = useLiveTvStore((s) => s.getChannelsInGroup);

  const handleCreateGroup = useCallback(() => {
    const trimmedName = newGroupName.trim();
    if (!trimmedName) return;

    if (groupNames.includes(trimmedName)) {
      Alert.alert('Group Exists', 'A group with this name already exists.');
      return;
    }

    createGroup(trimmedName);
    setNewGroupName('');
    setIsCreating(false);
  }, [newGroupName, groupNames, createGroup]);

  const handleDeleteGroup = useCallback(
    (groupName: string) => {
      Alert.alert(
        'Delete Group',
        `Are you sure you want to delete "${groupName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteGroup(groupName),
          },
        ]
      );
    },
    [deleteGroup]
  );

  const handleSelectGroup = useCallback(
    (groupName: string) => {
      onSelectGroup(groupName);
      onClose();
    },
    [onSelectGroup, onClose]
  );

  const renderGroup = useCallback(
    ({ item: groupName }: { item: string }) => {
      const channelCount = getChannelsInGroup(groupName).length;
      const isChannelInGroup = channelId
        ? getChannelsInGroup(groupName).includes(channelId)
        : false;

      return (
        <Pressable
          onPress={() => handleSelectGroup(groupName)}
          style={styles.groupItem}
        >
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{groupName}</Text>
            <Text style={styles.groupCount}>
              {channelCount} channel{channelCount !== 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.groupActions}>
            {isChannelInGroup && (
              <Ionicons name="checkmark-circle" size={20} color={accentColor} />
            )}
            <Pressable
              onPress={() => handleDeleteGroup(groupName)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={18} color={colors.status.error} />
            </Pressable>
          </View>
        </Pressable>
      );
    },
    [getChannelsInGroup, channelId, handleSelectGroup, handleDeleteGroup, accentColor]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={80} tint="dark" style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
      </BlurView>

      <View style={styles.container}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Channel Groups</Text>
          <Pressable onPress={onClose} style={styles.closeIconButton}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>
        </View>

        {isCreating ? (
          <View style={styles.createForm}>
            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Group name"
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              autoFocus
              onSubmitEditing={handleCreateGroup}
            />
            <View style={styles.createActions}>
              <Pressable
                onPress={() => {
                  setIsCreating(false);
                  setNewGroupName('');
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateGroup}
                style={[styles.saveButton, { backgroundColor: accentColor }]}
              >
                <Text style={styles.saveButtonText}>Create</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setIsCreating(true)}
            style={[styles.addButton, { borderColor: accentColor }]}
          >
            <Ionicons name="add" size={20} color={accentColor} />
            <Text style={[styles.addButtonText, { color: accentColor }]}>
              Create New Group
            </Text>
          </Pressable>
        )}

        <FlatList
          data={groupNames}
          renderItem={renderGroup}
          keyExtractor={(item) => item}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No groups created yet</Text>
              <Text style={styles.emptySubtext}>
                Create groups to organize your channels
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropPressable: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
  },
  closeIconButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  createForm: {
    padding: 16,
    gap: 12,
  },
  input: {
    backgroundColor: colors.surface.elevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 16,
  },
  createActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface.elevated,
  },
  cancelButtonText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  groupCount: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 2,
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginTop: 4,
  },
});
