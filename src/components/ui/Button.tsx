/**
 * Buttons.
 * States transcribed from `pip-design-spec.md` Appendix — Component state
 * reference: default `--elev-2`; pressed fill −8% L and scale 0.98 over
 * `--motion-fast`; disabled opacity 0.5 with no elevation; loading swaps the
 * label for an 18px spinner and disables the control.
 */

import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { brand, colors, CONTROL_HEIGHT, elevation, MIN_TAP_TARGET, radius, space, useMotion } from '@/theme';
import { darken } from '@/lib/color';
import { Txt } from './Txt';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * `quiet` is a FILLED `--brand-secondary-onFill` button with a white label —
 * distinct from `secondary`, which is the outlined form. SCR-30's single action
 * uses it, so the Critical screen's CTA reads as calm rather than urgent.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'text' | 'destructive';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Stretch to the container width — the default for sticky footer CTAs. */
  full?: boolean;
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  full = true,
  leading,
  disabled,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const motion = useMotion();
  const pressed = useSharedValue(0);

  const isDisabled = Boolean(disabled) || loading;

  // Plain handlers, not useCallback: memoising them bought nothing (Pressable
  // isn't memoised) and writing to a shared value captured by a hook argument
  // trips react-hooks/immutability.
  const handlePressIn: NonNullable<PressableProps['onPressIn']> = (e) => {
    pressed.value = withTiming(1, motion.t('fast'));
    onPressIn?.(e);
  };

  const handlePressOut: NonNullable<PressableProps['onPressOut']> = (e) => {
    pressed.value = withTiming(0, motion.t('fast'));
    onPressOut?.(e);
  };

  const fills: Record<ButtonVariant, { bg: string; pressedBg: string; label: string; border?: string }> = {
    primary: {
      bg: colors.action,
      pressedBg: darken(colors.action, 0.08),
      label: colors.onFill,
    },
    secondary: {
      bg: 'transparent',
      pressedBg: brand.secondarySoft,
      label: colors.actionQuiet,
      border: colors.actionQuiet,
    },
    quiet: {
      bg: colors.actionQuiet,
      pressedBg: darken(colors.actionQuiet, 0.08),
      label: colors.onFill,
    },
    text: {
      bg: 'transparent',
      pressedBg: 'transparent',
      label: colors.actionQuiet,
    },
    destructive: {
      bg: colors.semantic.destructive.solid,
      pressedBg: darken(colors.semantic.destructive.solid, 0.08),
      label: colors.onFill,
    },
  };

  const v = fills[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.02 }],
    backgroundColor: pressed.value > 0.5 ? v.pressedBg : v.bg,
  }));

  const height = variant === 'text' ? MIN_TAP_TARGET : CONTROL_HEIGHT;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          height,
          minHeight: MIN_TAP_TARGET,
          width: full ? '100%' : undefined,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space[2],
          paddingHorizontal: space[4],
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border,
          opacity: isDisabled ? 0.5 : 1,
        },
        (variant === 'primary' || variant === 'quiet') && !isDisabled ? elevation[2] : null,
        animatedStyle,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size={18} color={v.label} />
      ) : (
        <>
          {leading ? <View>{leading}</View> : null}
          <Txt variant="h4" color={v.label}>
            {label}
          </Txt>
        </>
      )}
    </AnimatedPressable>
  );
}
