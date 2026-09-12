import React, { forwardRef, useEffect, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
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

  const inert = disabled || loading;
  const borderColor = stateBorder(state);

  return (
    <AnimatedPressable
      ref={ref}
      accessibilityState={{ disabled: inert, selected, busy: loading }}
      disabled={inert}
      onPress={onPress}
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
