import { View, Text, Pressable, Alert } from 'react-native';
import { colors } from '@/theme';
import type { UsersTabProps } from './types';
import { formatRelativeTime, getHiddenUserName } from './utils';

export function UsersTab({ users, accentColor, onEnable, onDisable, onEdit, onCreateUser, currentUserId, hideMedia }: UsersTabProps) {
  const handleToggleUser = (user: typeof users[0], displayName: string) => {
    if (user.Id === currentUserId) {
      Alert.alert('Error', 'You cannot disable yourself');
      return;
    }
    if (user.Policy.IsDisabled) {
      Alert.alert('Enable User', `Enable ${displayName}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Enable', onPress: () => onEnable(user.Id) },
      ]);
    } else {
      Alert.alert('Disable User', `Disable ${displayName}? They will not be able to log in.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: () => onDisable(user.Id) },
      ]);
    }
  };

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Pressable
        onPress={onCreateUser}
        style={{
          backgroundColor: accentColor,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>+ Create New User</Text>
      </Pressable>

      {users.map((user, index) => {
        const displayName = hideMedia ? getHiddenUserName(index) : user.Name;
        return (
          <View key={user.Id} style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={{ color: '#fff', fontWeight: '500', fontSize: 14 }}>{displayName}</Text>
                  {user.Policy.IsAdministrator && (
                    <View style={{ backgroundColor: `${accentColor}20`, marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: accentColor, fontSize: 11 }}>Admin</Text>
                    </View>
                  )}
                  {user.Policy.IsDisabled && (
                    <View style={{ backgroundColor: 'rgba(239,68,68,0.2)', marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: '#f87171', fontSize: 11 }}>Disabled</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
                  {user.LastActivityDate ? `Active ${formatRelativeTime(user.LastActivityDate)}` : 'Never active'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.background.primary }}>
              <Pressable
                onPress={() => onEdit(user)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>Edit</Text>
              </Pressable>
              {user.Id !== currentUserId && (
                <Pressable
                  onPress={() => handleToggleUser(user, displayName)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 6,
                    backgroundColor: user.Policy.IsDisabled ? `${accentColor}20` : 'rgba(239,68,68,0.15)',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: user.Policy.IsDisabled ? accentColor : '#f87171', fontSize: 13, fontWeight: '500' }}>
                    {user.Policy.IsDisabled ? 'Enable' : 'Disable'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}

      {users.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)' }}>No users found</Text>
        </View>
      )}
    </View>
  );
}
