/**
 * Examon design system — spacing, radius, elevation.
 */
import type { ViewStyle } from 'react-native';

/**
 * ── Spacing ────────────────────────────────────────────────────────────────
 * The teardown measured two different things and only one is a spacing system.
 * The `gap` ramp is the real one: "Flex and grid gap is where intent actually
 * lives, because nothing inherits it. This is a clean 4px-based ramp."
 *
 * The extractor's reported "spacing scale" (1, 46, 71, 105, 277, 290 …) is
 * DISCARDED — those are "measured layout offsets, not tokens … artifacts of
 * where things landed at a 1280px viewport". Likewise its declared 2px base
 * unit, which was a GCD inferred across noisy values rather than a real token.
 */
export const space = {
  /** The single sub-step. */
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  /** Deliberate jump — section rhythm. */
  20: 80,
  24: 96,
  32: 128,
} as const;

/** Screen side padding and card interior. */
export const SCREEN_PADDING = space[4]; // 16
/** Gap between sections. */
export const SECTION_GAP = space[6]; // 24

/**
 * ── Radius ─────────────────────────────────────────────────────────────────
 * "The pill is the signature. 9999px at 583 uses — every button, every avatar.
 *  Paired with 16px for cards (298) and 4px for small chrome (196), that is a
 *  coherent three-tier shape language you could write down in one line."
 *
 * Discarded outliers: 22px (1 use), 50px (1 use), 32px (3 uses), 8px (26 uses,
 * "sitting awkwardly between the 4 and 12 steps"), and 6.4px — a third-party
 * auth widget's 0.4rem, "matching nothing else in the scale".
 */
export const radius = {
  /** Small chrome — tags, inline marks. 196 uses. */
  sm: 4,
  /** Nested surfaces, inputs. 130 uses. */
  md: 12,
  /** Cards, sheets. 298 uses. */
  lg: 16,
  /** The signature. Buttons, avatars, chips. 583 uses. */
  pill: 9999,
} as const;

export type RadiusName = keyof typeof radius;

/**
 * ── Elevation ──────────────────────────────────────────────────────────────
 * Worst-scoring category in the teardown at 50/100 — 31 unique shadows, of
 * which "the remaining 29 are mostly rgba(0,0,0,0) triples — Tailwind's
 * ring/shadow scaffolding emitting fully transparent layers that render nothing
 * but still count as distinct values."
 *
 * Collapsed to the three real levels, exactly as the teardown prescribes
 * ("a sm / md / lg scale would cover every genuine use").
 */
export const elevation = {
  none: {} as ViewStyle,
  /** Resting chrome. */
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  /** Cards. Note the site's card default is shadow:none — lift is opt-in. */
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  } as ViewStyle,
  /** Lifted card / sheet. From the real `0 10px 30px -12px rgba(0,0,0,.55)`. */
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 12,
  } as ViewStyle,
} as const;

export type ElevationName = keyof typeof elevation;

/**
 * The lime focus glow — `0 0 8px 2px rgba(121,235,86,.45)`.
 * "A genuinely nice touch — an accent-colored focus ring that reinforces the
 *  brand instead of falling back to the browser default." Kept verbatim.
 */
export const focusGlow: ViewStyle = {
  shadowColor: '#79eb56',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.45,
  shadowRadius: 8,
  elevation: 6,
};

/** Accessibility floor for every interactive element. */
export const MIN_TAP_TARGET = 44;
/** Standard control height — buttons, inputs. */
export const CONTROL_HEIGHT = 48;
export const TAB_BAR_HEIGHT = 56;
export const HEADER_HEIGHT = 56;
