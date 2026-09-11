/**
 * Skeleton — `--muted` base with a left→right shimmer on a 1.2s loop.
 *
 * "Skeletons are used for ALL list/card/stat loads. Spinners are reserved for
 *  in-button and inline transcription only." (Appendix)
 */

import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, SHIMMER_DURATION, space, useMotion } from '@/theme';
import { alpha } from '@/lib/color';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const motion = useMotion();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (!motion.idleEnabled) return;
    shimmer.value = withRepeat(
      withTiming(1, { duration: SHIMMER_DURATION, easing: Easing.linear }),
      -1,
      false,
    );
  }, [motion.idleEnabled]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-220, 220]) }],
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[
        { width, height, borderRadius, backgroundColor: colors.muted, overflow: 'hidden' },
        style,
      ]}
    >
      {motion.idleEnabled ? (
        <Animated.View style={[{ ...StyleSheetAbsoluteFill, width: 160 }, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', alpha(colors.onFill, 0.55), 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  bottom: 0,
  left: 0,
};

/** A stack of skeleton rows — the shape used by loading list screens. */
export function SkeletonRows({
  count,
  height = 56,
  gap = space[2],
}: {
  count: number;
  height?: number;
  gap?: number;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} borderRadius={radius.md} />
      ))}
    </View>
  );
}
