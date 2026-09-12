/**
 * Examon design system — typography.
 *
 * Face: **Neue Leiden** — the source system's own self-hosted workhorse,
 * "one self-hosted workhorse across 9,277 elements". The teardown graded it
 * `system` and it is now what the app actually ships, in place of the Inter
 * stand-in the first rebuild used.
 *
 * Weights are limited to 400/500/600/700. The site ships seven (100–700) and
 * the teardown found only these four are ever used; dropping 100/200/300 is
 * "free bytes" — 176 KB of faces becomes 176/7×4 ≈ 100 KB here.
 *
 * Teardown finding #4: "Re-anchor h1/h2/h3 to one scale — fixes
 * h2-larger-than-h1 across 16 routes." The source had 24 distinct font sizes
 * with `h1` rendering at 62px, 43.2px AND 20.92px on different routes. This
 * file is that single scale: one step per role, no fractional sizes, nothing
 * inherited.
 */
import { Platform, type TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'NeueLeiden-Regular',
  medium: 'NeueLeiden-Medium',
  semibold: 'NeueLeiden-SemiBold',
  bold: 'NeueLeiden-Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
} as const;

/**
 * Neue Leiden's own vertical metrics, read off the shipped TTF:
 *
 *   unitsPerEm 1000 · ascender 1000 · descender −400 · cap 660 · x-height 507
 *   actual ink extent  −274 … 952  =  1.226 em
 *
 * React Native draws a line box exactly `lineHeight` tall and clips to it on
 * Android, so **every step below keeps lineHeight ≥ 1.23 × fontSize** — the
 * measured ink extent. That is the same class of bug the teardown caught on the
 * source site ("44px on a 26.4px line-height … that line will visibly
 * collide"), except here the floor is set by the face rather than by taste.
 */
const INK_RATIO = 1.226;

type TypeToken = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'>;

export const type = {
  /** 40/50 700 — hero numerals, reveal moments. */
  display: { fontFamily: fontFamily.bold, fontSize: 40, lineHeight: 50, letterSpacing: -0.8 },
  /** 32/41 700 — screen title. */
  h1: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 41, letterSpacing: -0.6 },
  /** 26/34 600 — section header. */
  h2: { fontFamily: fontFamily.semibold, fontSize: 26, lineHeight: 34, letterSpacing: -0.4 },
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

/**
 * Dev-only guard: proves no step can regress below the face's ink extent.
 * Cheap enough to run at import; stripped from release builds by `__DEV__`.
 */
if (__DEV__) {
  for (const [name, t] of Object.entries(type)) {
    if (name === 'mono') continue; // system face, different metrics
    if (t.lineHeight < t.fontSize * INK_RATIO) {
      console.warn(
        `[type] "${name}" is ${t.fontSize}/${t.lineHeight} — below Neue Leiden's ` +
          `${INK_RATIO} ink ratio. Ascenders or descenders will clip on Android.`,
      );
    }
  }
}
