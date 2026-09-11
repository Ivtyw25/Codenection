/**
 * Pip — spatial, shape and elevation tokens.
 * From `spec-doc/pip-design-spec.md` §1.3.
 */

import type { ViewStyle } from 'react-native';

/** 8pt grid with a 4pt half-step. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;

/** Default screen side padding, card internal padding. */
export const SCREEN_PADDING = space[4]; // 16
/** Section vertical gap. */
export const SECTION_GAP = space[5]; // 24

/**
 * Corner radius. The soft/cozy direction lives largely here —
 * nothing interactive is below `md`.
 */
export const radius = {
  /** Dividers only. */
  sharp: 0,
  /** Chips, small inputs, badges. */
  sm: 8,
  /** Buttons, list rows, input fields. */
  md: 14,
  /** Cards, sheet top corners. */
  lg: 22,
  /** Pip habitat container, hero cards. */
  xl: 28,
  /** Pills, avatar, FAB, streak dots. */
  full: 999,
} as const;

/**
 * Elevation. Warm-tinted (`rgba(61,44,36,…)`), never neutral grey —
 * grey shadows read cold and templated.
 *
 * iOS reads shadow*; Android reads elevation. Both are provided so a single
 * token gives the same visual weight on each platform.
 */
const SHADOW_COLOR = '#3D2C24';

export const elevation = {
  /** none */
  0: {} as ViewStyle,
  /** 0 1px 2px rgba(61,44,36,0.06) — chips, resting rows. */
  1: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  /** 0 2px 8px rgba(61,44,36,0.08) — cards. */
  2: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  } as ViewStyle,
  /** 0 6px 20px rgba(61,44,36,0.10) — bottom sheets, FAB. */
  3: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  } as ViewStyle,
  /** 0 12px 32px rgba(61,44,36,0.14) — Critical overlay, dialogs. */
  4: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 32,
    elevation: 16,
  } as ViewStyle,
} as const;

/**
 * Accessibility floor: every interactive element is at least 44×44pt.
 * Referenced directly by primitives rather than re-deriving it per component.
 */
export const MIN_TAP_TARGET = 44;

/** Bottom tab bar height, excluding the safe-area inset (§3.1). */
export const TAB_BAR_HEIGHT = 56;
/** Standard screen header height. */
export const HEADER_HEIGHT = 56;
/** Primary button / input field height. */
export const CONTROL_HEIGHT = 52;
/** Centre Capture FAB diameter, raised 12px above the bar. */
export const FAB_SIZE = 56;
export const FAB_LIFT = 12;
