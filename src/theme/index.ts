/**
 * Examon design system — single entry point.
 *
 * Components import from `@/theme`. Never a raw hex, never a magic number.
 * Every token here traces to the "Examon Design System Teardown", which grades
 * each extracted value `system` / `drift` / `artifact`:
 *
 *   system   → adopted as-is
 *   drift    → consolidated to one value, then adopted
 *   artifact → DISCARDED (measurement noise; "do not ship")
 *
 * Where the teardown is web-specific (container widths, 11 breakpoints, the
 * 1440px shell) it does not transfer to React Native and is intentionally
 * absent — those are viewport artifacts, not design decisions.
 */
export { brand, pairing, status, n, light, dark } from './colors';
export type { Scheme, StatusName } from './colors';

export { type, fontFamily } from './typography';
export type { TypeName } from './typography';

export {
  space,
  radius,
  elevation,
  focusGlow,
  SCREEN_PADDING,
  SECTION_GAP,
  MIN_TAP_TARGET,
  CONTROL_HEIGHT,
  TAB_BAR_HEIGHT,
  HEADER_HEIGHT,
} from './layout';
export type { RadiusName, ElevationName } from './layout';

export {
  duration,
  easing,
  timing,
  useMotion,
  ReduceMotionProvider,
  SHIMMER_DURATION,
} from './motion';
export type { MotionName } from './motion';

export {
  resolveState,
  stateLayer,
  stateShadow,
  stateBorder,
  useInteraction,
} from './states';
export type { InteractionState, StateFlags } from './states';

export { ThemeOverrideProvider, useScheme, useThemePreference } from './ThemeContext';
export type { ThemePreference } from './ThemeContext';
