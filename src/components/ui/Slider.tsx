/**
 * Slider — used by the per-domain baseline (SCR-05), the whole-person baseline
 * (SCR-06) and the daily check-in (SCR-22).
 *
 * Track `--muted`, filled `--brand-primary`, thumb 28px `--radius-full` white
 * with `--elev-2`, and a live value pill above the thumb.
 *
 * Gesture handling is local and presentational — dragging updates the value and
 * nothing else. Built on Gesture Handler so the drag runs on the UI thread.
 */

import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { brand, colors, elevation, radius, space } from '@/theme';
import { Txt } from './Txt';

const THUMB = 28;
const TRACK_HEIGHT = 8;

export interface SliderProps {
  /** 0–1. */
  value: number;
  onChange: (v: number) => void;
  /** Rendered in the pill above the thumb. */
  formatValue?: (v: number) => string;
  /** Replaces the solid fill — used for the drain↔fulfilment gradient track. */
  gradient?: readonly [string, string, ...string[]];
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Slider({
  value,
  onChange,
  formatValue,
  gradient,
  leading,
  trailing,
  style,
  accessibilityLabel,
}: SliderProps) {
  const [width, setWidth] = useState(0);
  const active = useSharedValue(0);
  const pos = useSharedValue(value);

  // Keep the shared value in step with controlled updates from the parent.
  // This MUST be an effect — writing to `.value` during render is a Reanimated
  // error, since render can run on a thread that doesn't own the value.
  useEffect(() => {
    pos.value = value;
  }, [value]);

  const commit = (v: number) => onChange(Math.min(1, Math.max(0, v)));

  const pan = Gesture.Pan()
    .onBegin((e) => {
      active.value = withTiming(1, { duration: 120 });
      if (width > 0) runOnJS(commit)(e.x / width);
    })
    .onUpdate((e) => {
      if (width > 0) runOnJS(commit)(e.x / width);
    })
    .onFinalize(() => {
      active.value = withTiming(0, { duration: 160 });
    });

  const thumbStyle = useAnimatedStyle(() => ({
    left: pos.value * Math.max(0, width - THUMB),
    transform: [{ scale: 1 + active.value * 0.08 }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    left: pos.value * Math.max(0, width - THUMB),
    opacity: formatValue ? 1 : 0,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: pos.value * width,
  }));

  return (
    <View style={style}>
      {formatValue ? (
        <View style={{ height: 26 }}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: THUMB * 2.6,
                marginLeft: -(THUMB * 2.6 - THUMB) / 2,
                alignItems: 'center',
              },
              pillStyle,
            ]}
          >
            <View
              style={{
                backgroundColor: brand.primarySoft,
                borderRadius: radius.full,
                paddingHorizontal: space[2],
                paddingVertical: 3,
              }}
            >
              <Txt variant="caption" color={colors.action}>
                {formatValue(value)}
              </Txt>
            </View>
          </Animated.View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        {leading}
        <GestureDetector gesture={pan}>
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={accessibilityLabel}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            style={{ flex: 1, height: THUMB, justifyContent: 'center' }}
          >
            {/* Track */}
            <View
              style={{
                height: TRACK_HEIGHT,
                borderRadius: radius.full,
                backgroundColor: colors.muted,
                overflow: 'hidden',
              }}
            >
              {gradient ? (
                <LinearGradient
                  colors={gradient}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1 }}
                />
              ) : (
                <Animated.View
                  style={[
                    { height: '100%', backgroundColor: brand.primary, borderRadius: radius.full },
                    fillStyle,
                  ]}
                />
              )}
            </View>

            {/* Thumb */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: THUMB,
                  height: THUMB,
                  borderRadius: radius.full,
                  backgroundColor: colors.card,
                },
                elevation[2],
                thumbStyle,
              ]}
            />
          </View>
        </GestureDetector>
        {trailing}
      </View>
    </View>
  );
}
