import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface SectionHeaderProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onSeeAll?: () => void;
  accentColor?: string;
}

export const SectionHeader = memo(function SectionHeader({
  title,
  icon,
  onSeeAll,
  accentColor,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {icon && accentColor && (
          <Ionicons name={icon} size={20} color={accentColor} style={styles.icon} />
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      )}
    </View>
  );
});

interface AlphabetSectionHeaderProps {
  title: string;
  accentColor: string;
}

export const AlphabetSectionHeader = memo(function AlphabetSectionHeader({
  title,
  accentColor,
}: AlphabetSectionHeaderProps) {
  return (
    <View style={styles.alphabetContainer}>
      <Text style={[styles.alphabetTitle, { color: accentColor }]}>{title}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 24,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAll: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  alphabetContainer: {
    backgroundColor: colors.background.primary,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  alphabetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
