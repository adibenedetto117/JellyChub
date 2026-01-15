import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';

const DESCRIPTION_LINE_LIMIT = 3;

interface CollapsibleDescriptionProps {
  text: string;
  accentColor: string;
  t: (key: string) => string;
}

export function CollapsibleDescription({ text, accentColor, t }: CollapsibleDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);

  return (
    <View className="mt-4">
      <Text
        className="text-text-secondary leading-6"
        numberOfLines={expanded ? undefined : DESCRIPTION_LINE_LIMIT}
        onTextLayout={(e) => {
          if (!expanded && e.nativeEvent.lines.length >= DESCRIPTION_LINE_LIMIT) {
            setNeedsTruncation(true);
          }
        }}
      >
        {text}
      </Text>
      {needsTruncation && (
        <Pressable
          onPress={() => setExpanded(!expanded)}
          className="mt-2"
        >
          <Text style={{ color: accentColor }} className="text-sm font-medium">
            {expanded ? t('details.showLess') : t('details.showMore')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
