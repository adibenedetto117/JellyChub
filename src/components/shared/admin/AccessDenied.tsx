import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import { colors } from '@/theme';

interface AccessDeniedProps {
  accentColor: string;
}

export function AccessDenied({ accentColor }: AccessDeniedProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['top']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
          Access Denied
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          Administrator privileges required.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: accentColor,
            marginTop: 24,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
