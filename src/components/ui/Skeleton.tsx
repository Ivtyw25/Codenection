import React, { useEffect } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SHIMMER_DURATION, radius, space, useMotion, useScheme, type RadiusName } from '@/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: RadiusName;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width, height = 16, radius: radiusProp = 'md', style }: SkeletonProps) {
  const scheme = useScheme();
  const motion = useMotion();
  
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (motion.idleEnabled && !motion.reduced) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: SHIMMER_DURATION / 2 }),
          withTiming(0.5, { duration: SHIMMER_DURATION / 2 })
        ),
        -1,
        true
      );
    } else {
      opacity.value = 0.8;
    }
  }, [motion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const baseStyle = {
    width,
    height,
    backgroundColor: scheme.border,
    borderRadius: radius[radiusProp],
  };

  if (motion.reduced || !motion.idleEnabled) {
    return <View style={[baseStyle, style]} />;
  }

  return <Animated.View style={[baseStyle, animatedStyle, style]} />;
}

export function SkeletonRows({ rows = 3, gap = 12 }: { rows?: number; gap?: number }) {
  const defaultGap = gap === 12 ? space[3] : gap;
  return (
    <View style={{ gap: defaultGap }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} width={i === rows - 1 ? '70%' : '100%'} />
      ))}
    </View>
  );
}
