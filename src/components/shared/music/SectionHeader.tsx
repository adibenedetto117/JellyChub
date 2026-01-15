import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
  icon?: string;
}

export const SectionHeader = memo(function SectionHeader({ title, onSeeAll, icon }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {icon && <Ionicons name={icon as any} size={18} color="#fff" style={{ marginRight: 8 }} />}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
});
