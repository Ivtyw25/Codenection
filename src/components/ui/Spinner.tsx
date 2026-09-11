import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useScheme, useMotion } from '@/theme';

export interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 20, color }: SpinnerProps) {
  const scheme = useScheme();
  const motion = useMotion();
  
  const spinColor = color || scheme.primary;
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!motion.reduced) {
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }
  }, [motion, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: Math.max(2, size / 10),
    borderColor: spinColor + '40', // 25% opacity for track
    borderTopColor: spinColor,
  };

  if (motion.reduced) {
    return <View style={[baseStyle, { borderTopColor: spinColor + '40', borderColor: spinColor }]} />;
  }

  return <Animated.View style={[baseStyle, animatedStyle]} />;
}
