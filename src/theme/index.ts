/**
 * Pip design system — single entry point.
 *
 * Components import from `@/theme`, never from the individual token files and
 * never with raw hex. See `spec-doc/pip-design-spec.md` Phase 1.
 */

export { colors, brand, neutral, semantic, pipState, mascot } from './colors';
export type { Colors, SemanticName, PipStateName } from './colors';

export { type, fontFamily, CONTENT_WIDTH, BASE_VIEWPORT_WIDTH } from './typography';
export type { TypeName } from './typography';

export {
  space,
  radius,
  elevation,
  SCREEN_PADDING,
  SECTION_GAP,
  MIN_TAP_TARGET,
  TAB_BAR_HEIGHT,
  HEADER_HEIGHT,
  CONTROL_HEIGHT,
  FAB_SIZE,
  FAB_LIFT,
} from './layout';

export {
  duration,
  easing,
  timing,
  useMotion,
  SHIMMER_DURATION,
  TOAST_DURATION,
  TOAST_RISE,
} from './motion';
export type { MotionName } from './motion';
