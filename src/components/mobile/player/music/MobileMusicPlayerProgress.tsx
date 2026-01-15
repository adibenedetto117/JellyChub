import { View, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector, GestureType } from 'react-native-gesture-handler';
import { formatPlayerTime } from '@/utils';

interface MobileMusicPlayerProgressProps {
  progressValue: number;
  isSeeking: boolean;
  accentColor: string;
  seekGesture: GestureType;
  getDisplayPosition: () => number;
  duration: number;
}

export function MobileMusicPlayerProgress({
  progressValue,
  isSeeking,
  accentColor,
  seekGesture,
  getDisplayPosition,
  duration,
}: MobileMusicPlayerProgressProps) {
  return (
    <View style={{ marginBottom: 24 }}>
      <GestureDetector gesture={seekGesture}>
        <Animated.View style={{ height: 36, justifyContent: 'center' }}>
          <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
            <View
              style={{ height: '100%', borderRadius: 2, backgroundColor: accentColor, width: `${progressValue * 100}%` }}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              left: `${progressValue * 100}%`,
              top: 8,
              marginLeft: -10,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: isSeeking ? '#fff' : accentColor,
              borderWidth: 2,
              borderColor: 'rgba(0,0,0,0.3)',
            }}
          />
        </Animated.View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500' }}>
          {formatPlayerTime(getDisplayPosition())}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500' }}>
          {formatPlayerTime(duration)}
        </Text>
      </View>
    </View>
  );
}
