import { Text, StyleSheet } from 'react-native';
import { memo } from 'react';

interface ListHeaderProps {
  currentCount: number;
  totalCount: number;
  itemLabel: string;
}

export const ListHeader = memo(function ListHeader({
  currentCount,
  totalCount,
  itemLabel,
}: ListHeaderProps) {
  return (
    <Text style={styles.header}>
      {currentCount} of {totalCount} {itemLabel}
    </Text>
  );
});

const styles = StyleSheet.create({
  header: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
});
