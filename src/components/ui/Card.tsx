/**
 * Card — `--card` fill, `--radius-lg`, `--elev-2`, 16px pad.
 * When tappable: pressed scales to 0.99 and drops to `--elev-1` (Appendix).
 */

import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, elevation, radius, space, useMotion } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** Internal padding. Defaults to `--space-4` (16). */
  padding?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Card({
  children,
  onPress,
  padding = space[4],
  style,
  accessibilityLabel,
  accessibilityHint,
}: CardProps) {
  const motion = useMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.01 }],
  }));

  const baseStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding,
    },
    elevation[2],
    style,
  ];

  if (!onPress) return <View style={baseStyle}>{children}</View>;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, motion.t('fast'));
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, motion.t('fast'));
      }}
      style={[baseStyle, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
