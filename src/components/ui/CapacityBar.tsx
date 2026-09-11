/**
 * The Pressure / Vitality capacity bar used by the SCR-10 status strip and
 * SCR-12's sub-stat grid.
 *
 * Raw numbers are deliberately hidden here — they live behind "See the
 * numbers" on SCR-12. State is never conveyed by colour alone, so the bar is
 * always paired with a text label by its caller.
 */

import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, radius, useMotion } from '@/theme';

export interface CapacityBarProps {
  /** 0–100. */
  value: number;
  fill: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function CapacityBar({ value, fill, height = 8, style }: CapacityBarProps) {
  const motion = useMotion();
  const pct = useSharedValue(0);

  useEffect(() => {
    pct.value = withTiming(Math.min(100, Math.max(0, value)) / 100, motion.t('base'));
  }, [value, motion.reduced]);

  const barStyle = useAnimatedStyle(() => ({ width: `${pct.value * 100}%` }));

  return (
    <View
      style={[
        {
          height,
          borderRadius: radius.full,
          backgroundColor: colors.muted,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[{ height: '100%', borderRadius: radius.full, backgroundColor: fill }, barStyle]}
      />
    </View>
  );
}
