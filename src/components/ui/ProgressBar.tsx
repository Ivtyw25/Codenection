import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { radius, status, useMotion, useScheme } from '@/theme';

export interface ProgressBarProps {
  /** 0–100. Values outside the range are clamped. */
  value: number;
  tone?: 'brand' | 'warning' | 'danger' | 'success';
  /** Override the fill colour outright. Takes precedence over `tone`. */
  fill?: string;
  height?: number;
  /** Override the track colour. Defaults to the scheme's alt surface. */
  track?: string;
  style?: ViewStyle;
  /** Announced to screen readers. */
  label?: string;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function ProgressBar({
  value,
  tone = 'brand',
  fill: fillOverride,
  height = 8,
  track,
  style,
  label,
}: ProgressBarProps) {
  const scheme = useScheme();
  const motion = useMotion();

  const fill = fillOverride ?? (tone === 'brand' ? scheme.primary : status[tone].solid);
  const progress = useSharedValue(clamp(value));

  useEffect(() => {
    // `t()` already collapses to a near-instant linear tween under reduced
    // motion, so this needs no branch of its own.
    progress.value = withTiming(clamp(value), motion.t('md'));
  }, [value, motion, progress]);

  const animated = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Progress'}
      accessibilityValue={{ min: 0, max: 100, now: clamp(value) }}
      style={[
        styles.track,
        { height, borderRadius: radius.pill, backgroundColor: track ?? scheme.surfaceAlt },
        style,
      ]}
    >
      <Animated.View
        style={[styles.fill, { backgroundColor: fill, borderRadius: radius.pill }, animated]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
