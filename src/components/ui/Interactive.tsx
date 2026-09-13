import React, { forwardRef, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  MIN_TAP_TARGET,
  radius as radii,
  stateBorder,
  stateLayer,
  stateShadow,
  useInteraction,
  useMotion,
  type InteractionState,
  type RadiusName,
  type StateFlags,
} from '@/theme';

export interface InteractiveProps extends Omit<PressableProps, 'style' | 'children' | 'disabled'>, StateFlags {
  children: ReactNode | ((state: InteractionState) => ReactNode);
  style?: StyleProp<ViewStyle>;
  /** Corner rounding of the state overlay. Match the control's own radius. */
  radius?: RadiusName;
  /** Suppress the press scale — right for full-bleed rows, wrong for buttons. */
  noScale?: boolean;
  /** Suppress the tint overlay (a control that recolours itself instead). */
  noOverlay?: boolean;
}

/**
 * The one place a press, hover or focus becomes visible.
 *
 * Every interactive surface in the app routes through here, so the eight states
 * in `theme/states.ts` are applied identically whether the thing being pressed
 * is a button, a chip, a task row or a shop card. Consistency by construction,
 * not by everyone remembering.
 *
 * Three layers stack: an animated scale (100ms — the motion scale's `xs`
 * micro-feedback step), an alpha overlay that works over any background, and
 * the lime focus ring the teardown singled out as worth keeping verbatim.
 */
export const Interactive = forwardRef<View, InteractiveProps>(function Interactive(
  {
    children,
    style,
    radius = 'md',
    noScale,
    noOverlay,
    hovered,
    pressed,
    focused,
    selected,
    loading,
    error,
    disabled,
    onPress,
    hitSlop,
    onLayout,
    ...rest
  },
  ref,
) {
  const motion = useMotion();
  const interaction = useInteraction({ hovered, pressed, focused, selected, loading, error, disabled });
  const { state, layer, handlers } = interaction;

  const scale = useSharedValue(1);
  const target = noScale ? 1 : layer.scale;

  useEffect(() => {
    scale.value = withTiming(target, motion.t('xs'));
  }, [target, motion, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  /*
   * ── The 44px floor, enforced centrally ──────────────────────────────────
   *
   * An audit of this build found a dozen controls under the accessibility
   * floor — a 28px "View all", a 24px Sparks pill, a 28×28 clear button — each
   * one a separate oversight in a separate file. Fixing them one at a time
   * fixes them until the next control is written.
   *
   * So the floor is enforced here instead, where every pressable in the app
   * already passes through. The control measures itself and grows its touch
   * region — NOT its layout box — to cover the deficit, so nothing on screen
   * moves, no density changes, and a visually small affordance stays visually
   * small while becoming reliably hittable.
   *
   * `hitSlop` from the caller always wins: `Checkbox` computes its own from a
   * known box size, and a component that has done the arithmetic deliberately
   * should not have it second-guessed.
   */
  const [autoSlop, setAutoSlop] = useState(0);

  const measure = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      // Only ever grows. A control that briefly measures 0 during layout must
      // not drop the slop it already earned and start flickering.
      const deficit = Math.max(MIN_TAP_TARGET - width, MIN_TAP_TARGET - height, 0);
      const next = Math.ceil(deficit / 2);
      if (next > 0) setAutoSlop((current) => (next > current ? next : current));
      onLayout?.(event);
    },
    [onLayout],
  );

  const inert = disabled || loading;
  const borderColor = stateBorder(state);

  return (
    <AnimatedPressable
      ref={ref}
      accessibilityState={{ disabled: inert, selected, busy: loading }}
      disabled={inert}
      onPress={onPress}
      onLayout={measure}
      hitSlop={hitSlop ?? autoSlop}
      {...handlers}
      {...rest}
      style={[
        { opacity: layer.opacity },
        borderColor ? { borderColor } : null,
        stateShadow(state),
        animated,
        style,
      ]}
    >
      {typeof children === 'function' ? children(state) : children}

      {!noOverlay && layer.overlay !== 'transparent' ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: layer.overlay, borderRadius: radii[radius] },
          ]}
        />
      ) : null}
    </AnimatedPressable>
  );
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Re-exported so components can read a resolved state without the wrapper. */
export { stateLayer };
