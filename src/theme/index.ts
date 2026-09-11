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
import { useColorScheme } from 'react-native';

import { light, dark, type Scheme } from './colors';

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

export { duration, easing, timing, useMotion, SHIMMER_DURATION } from './motion';
export type { MotionName } from './motion';

/**
 * Resolves the active colour scheme.
 *
 * The teardown confirms a real dark theme ships — "116 CSS custom properties
 * with paired light/dark values" — so dark is a first-class mode here, not an
 * afterthought. Primary and secondary hold constant across both; only the
 * accent swaps (amber → near-white blush).
 */
export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? dark : light;
}
