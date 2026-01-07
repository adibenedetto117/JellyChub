import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchButton } from './SearchButton';

interface HeaderProps {
  title: string;
  showSearch?: boolean;
}

export function Header({ title, showSearch = true }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: insets.top + 8,
        paddingBottom: 12,
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: 28,
          fontWeight: '700',
        }}
      >
        {title}
      </Text>

      {showSearch && <SearchButton />}
    </View>
  );
}
