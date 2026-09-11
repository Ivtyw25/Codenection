/**
 * Examon design system — typography.
 *
 * Teardown finding #4: "Re-anchor h1/h2/h3 to one scale — fixes h2-larger-than-h1
 * across 16 routes." The source site had 24 distinct font sizes, with `h1`
 * rendering at 62px, 43.2px AND 20.92px on different routes. This file is that
 * single scale: one step per role, no fractional sizes, nothing inherited.
 *
 * Face: Inter. `neueLeiden` is the site's self-hosted workhorse and is not
 * redistributable, so the system's OTHER shipped face — Inter, already graded
 * `system` in the teardown — carries the whole scale.
 *
 * Weights are limited to 400/500/600/700. The teardown found only these four of
 * the seven shipped weights are ever used; dropping 100/200/300 is "free bytes".
 * Times New Roman (1,301 elements) and Instrument Serif (1) were graded
 * `artifact` — a missing-font fallback bug, not a choice — and are discarded.
 */
import { Platform, type TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
} as const;

type TypeToken = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'>;

/**
 * Mobile scale. Every `lineHeight` exceeds its `fontSize` — the teardown caught
 * a 44px size on a 26.4px line-height, "leading tighter than the cap height;
 * that line will visibly collide". That class of bug cannot occur here.
 */
export const type = {
  /** 40/46 700 — hero numerals, reveal moments. */
  display: { fontFamily: fontFamily.bold, fontSize: 40, lineHeight: 46, letterSpacing: -0.8 },
  /** 32/38 700 — screen title. */
  h1: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  /** 26/32 600 — section header. */
  h2: { fontFamily: fontFamily.semibold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  /** 20/26 600 — card title. */
  h3: { fontFamily: fontFamily.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  /** 17/24 600 — list-row title, sub-label. */
  h4: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 24 },
  /** 16/24 400 — default body. */
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  /** 14/20 400 — secondary body, helper text. */
  bodySm: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  /** 14/20 500 — button label. Matches the site's own 14px / w500 button. */
  label: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20 },
  /** 12/16 500 — badges, chips, metadata. */
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  /** 14/20 500 mono — numeric readouts, tabular values. */
  mono: { fontFamily: fontFamily.mono, fontSize: 14, lineHeight: 20 },
} as const satisfies Record<string, TypeToken>;

export type TypeName = keyof typeof type;
