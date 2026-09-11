/**
 * Pip — motion tokens.
 * From `spec-doc/pip-design-spec.md` §1.3 (Motion tokens).
 *
 * `prefers-reduced-motion` is honoured EVERYWHERE Pip animates — it is an
 * accessibility floor in this product, not a nicety. Use `useMotion()` below
 * rather than reaching for the raw tokens, so the reduced-motion substitution
 * happens in one place.
 *
 * ── What Reanimated already does for you ────────────────────────────────────
 * Every Reanimated animation defaults to `ReduceMotion.System`, so a plain
 * `withTiming` / `FadeIn` / `LinearTransition` is ALREADY skipped when the OS
 * setting is on. A screen using only one-shot entrance animations therefore
 * needs nothing extra.
 *
 * What that does NOT cover, and what `useMotion()` is for, is the behavioural
 * substitution the spec asks for: an idle LOOP (Pip's bob, the skeleton
 * shimmer, the breathing orb) must stop existing rather than merely run
 * instantly, and a bounce must become a cross-fade. Check `idleEnabled` before
 * starting any `withRepeat`.
 */

import { Easing, useReducedMotion, type WithTimingConfig } from 'react-native-reanimated';

export const duration = {
  /** 140ms — taps, chip select, toggles. */
  fast: 140,
  /** 240ms — sheets, page transitions. */
  base: 240,
  /** 600ms — Pip state transitions. */
  pip: 600,
  /** 900ms — Spark/XP award, tier unlock. */
  celebrate: 900,
} as const;

export const easing = {
  /** ease-out */
  fast: Easing.out(Easing.ease),
  /** cubic-bezier(0.22, 0.61, 0.36, 1) */
  base: Easing.bezier(0.22, 0.61, 0.36, 1),
  /**
   * cubic-bezier(0.34, 1.56, 0.64, 1) — gentle overshoot.
   * This is the "breath" curve; it is what makes Pip read as a soft body
   * settling rather than a value snapping.
   */
  pip: Easing.bezier(0.34, 1.56, 0.64, 1),
  /** ease-out */
  celebrate: Easing.out(Easing.ease),
} as const;

export const timing = {
  fast: { duration: duration.fast, easing: easing.fast },
  base: { duration: duration.base, easing: easing.base },
  pip: { duration: duration.pip, easing: easing.pip },
  celebrate: { duration: duration.celebrate, easing: easing.celebrate },
} as const satisfies Record<string, WithTimingConfig>;

export type MotionName = keyof typeof timing;

/** A cross-fade standing in for a motion token when reduced motion is on. */
const REDUCED: WithTimingConfig = {
  duration: duration.fast,
  easing: Easing.linear,
};

/**
 * Motion accessor that respects the OS reduced-motion setting.
 *
 * - `t(name)`  → the timing config to hand to `withTiming`.
 * - `reduced`  → true when the user has asked for reduced motion, so callers
 *                can swap a bounce/idle loop for a static state + cross-fade
 *                rather than merely shortening it.
 */
export function useMotion() {
  const reduced = useReducedMotion();

  return {
    reduced,
    t: (name: MotionName): WithTimingConfig => (reduced ? REDUCED : timing[name]),
    /** Idle loops (Pip's bob, skeleton shimmer, breathing orb) stop entirely. */
    idleEnabled: !reduced,
  };
}

/** Skeleton shimmer loop duration (§Appendix — Skeleton). */
export const SHIMMER_DURATION = 1200;
/** Toast auto-dismiss (§Appendix — Toasts). */
export const TOAST_DURATION = 1800;
/** Toast rise distance. */
export const TOAST_RISE = 12;
