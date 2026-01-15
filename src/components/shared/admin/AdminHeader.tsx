import { View, Text } from 'react-native';

interface AdminHeaderProps {
  serverName?: string;
}

export function AdminHeader({ serverName }: AdminHeaderProps) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>Admin</Text>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{serverName ?? 'Server'}</Text>
    </View>
  );
}
