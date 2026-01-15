import { View, ScrollView, StyleSheet } from 'react-native';
import { memo, ReactNode } from 'react';

interface TabsContainerProps {
  children: ReactNode;
}

export const TabsContainer = memo(function TabsContainer({ children }: TabsContainerProps) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
