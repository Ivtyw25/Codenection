/**
 * Examon design system — motion.
 *
 * "A tight, restrained motion system — one of the cleaner foundations."
 * Four durations on a clean 100/200/300/500 ramp and two Material-standard
 * easings, adopted from the teardown as-is. No springs are defined in the
 * source system, so none are invented here.
 */
import { createContext, useContext } from 'react';
import { Easing, useReducedMotion, type WithTimingConfig } from 'react-native-reanimated';

export const duration = {
  /** 100ms — micro-feedback. */
  xs: 100,
  /** 200ms — hover / state change. */
  sm: 200,
  /** 300ms — reveal. */
  md: 300,
  /** 500ms — section transition. */
  lg: 500,
} as const;

export const easing = {
  /** cubic-bezier(.4, 0, .2, 1) — material standard. */
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  /** cubic-bezier(0, 0, .2, 1) — decelerate. */
  out: Easing.bezier(0, 0, 0.2, 1),
} as const;

export const timing = {
  xs: { duration: duration.xs, easing: easing.standard },
  sm: { duration: duration.sm, easing: easing.standard },
  md: { duration: duration.md, easing: easing.out },
  lg: { duration: duration.lg, easing: easing.out },
} as const satisfies Record<string, WithTimingConfig>;

export type MotionName = keyof typeof timing;

/** Substituted for any token when the OS asks for reduced motion. */
const REDUCED: WithTimingConfig = { duration: duration.xs, easing: Easing.linear };

/**
 * In-app opt-in, on top of the OS setting.
 *
 * Like `ThemeOverrideProvider`, it takes its value as a prop rather than
 * reading the store, so the design system stays free of app state. It can only
 * ever reduce motion further — a user who has asked the OS for less motion
 * never gets more of it back from an app preference.
 */
const ReduceMotionCtx = createContext(false);

export function ReduceMotionProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return <ReduceMotionCtx.Provider value={value}>{children}</ReduceMotionCtx.Provider>;
}

/**
 * Motion accessor that respects the OS reduced-motion setting.
 *
 * Reanimated already defaults to `ReduceMotion.System`, so a plain one-shot
 * `withTiming` is skipped for you. This hook exists for the part that does NOT
 * cover: an idle LOOP (a shimmer, a spinner, a breathing glow) must stop
 * existing rather than merely run instantly. Check `idleEnabled` before
 * starting any `withRepeat`.
 */
export function useMotion() {
  const os = useReducedMotion();
  const preference = useContext(ReduceMotionCtx);
  const reduced = os || preference;

  return {
    reduced,
    t: (name: MotionName): WithTimingConfig => (reduced ? REDUCED : timing[name]),
    idleEnabled: !reduced,
  };
}

/** Skeleton shimmer loop duration. */
export const SHIMMER_DURATION = 1200;
