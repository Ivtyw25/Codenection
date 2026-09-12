/**
 * Examon design system — interaction states.
 *
 * The teardown captured "11 interaction state-changes … across hover, focus and
 * active" on the source site but no state *system*: each component invented its
 * own. This file is that system, so a state means the same thing everywhere.
 *
 * Eight states, in the order they take precedence when more than one is true:
 *
 *   disabled > loading > error > pressed > focused > hovered > selected > default
 *
 * A disabled control is not also hovered; a loading control is not also
 * pressed. `resolveState` enforces that ordering once, centrally, rather than
 * leaving each component to get the priority subtly different.
 */
import { useCallback, useMemo, useState } from 'react';
import type { ViewStyle } from 'react-native';

import { focusGlow } from './layout';
import { status } from './colors';

export type InteractionState =
  | 'default'
  | 'hovered'
  | 'pressed'
  | 'focused'
  | 'selected'
  | 'loading'
  | 'error'
  | 'disabled';

export interface StateFlags {
  hovered?: boolean;
  pressed?: boolean;
  focused?: boolean;
  selected?: boolean;
  loading?: boolean;
  error?: boolean;
  disabled?: boolean;
}

export function resolveState(f: StateFlags): InteractionState {
  if (f.disabled) return 'disabled';
  if (f.loading) return 'loading';
  if (f.error) return 'error';
  if (f.pressed) return 'pressed';
  if (f.focused) return 'focused';
  if (f.hovered) return 'hovered';
  if (f.selected) return 'selected';
  return 'default';
}

/**
 * What each state does to a surface, independent of colour.
 *
 * `overlay` is an alpha tint laid over whatever the component's own background
 * is, so one set of numbers works on the forest header, on a white card and on
 * a lime pill without per-variant hand-tuning.
 */
export const stateLayer: Record<InteractionState, { opacity: number; overlay: string; scale: number }> = {
  default: { opacity: 1, overlay: 'transparent', scale: 1 },
  /** Pointer platforms only — RN Web, macOS, and hovering styluses. */
  hovered: { opacity: 1, overlay: 'rgba(0,0,0,0.05)', scale: 1 },
  /** 100ms micro-feedback, per the motion scale's `xs` step. */
  pressed: { opacity: 1, overlay: 'rgba(0,0,0,0.10)', scale: 0.975 },
  focused: { opacity: 1, overlay: 'transparent', scale: 1 },
  selected: { opacity: 1, overlay: 'transparent', scale: 1 },
  /** Still legible, visibly inert — the control is working, not broken. */
  loading: { opacity: 0.78, overlay: 'transparent', scale: 1 },
  error: { opacity: 1, overlay: 'transparent', scale: 1 },
  /**
   * 0.45 rather than the more common 0.6: on this system's low-contrast
   * neutrals, 0.6 left disabled controls looking merely quiet instead of off.
   */
  disabled: { opacity: 0.45, overlay: 'transparent', scale: 1 },
};

/** The lime focus ring, applied to whichever state earns it. */
export function stateShadow(state: InteractionState): ViewStyle | undefined {
  return state === 'focused' ? focusGlow : undefined;
}

/** Border colour override for the error state; undefined means "keep yours". */
export function stateBorder(state: InteractionState): string | undefined {
  return state === 'error' ? status.danger.solid : undefined;
}

/**
 * Binds the flags a component can't know for itself — pointer and focus — to
 * the handlers that produce them.
 *
 * Returns handlers spreadable onto any `Pressable`. `onHoverIn`/`onHoverOut`
 * are no-ops on touch devices, so the same component is correct on phone and
 * on web without a platform branch.
 */
export function useInteraction(flags: StateFlags = {}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);

  const handlers = useMemo(
    () => ({
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
      onPressIn: () => setPressed(true),
      onPressOut: () => setPressed(false),
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    }),
    [],
  );

  const reset = useCallback(() => {
    setHovered(false);
    setPressed(false);
    setFocused(false);
  }, []);

  const state = resolveState({ ...flags, hovered, pressed, focused });

  return { state, layer: stateLayer[state], handlers, reset, hovered, pressed, focused };
}
