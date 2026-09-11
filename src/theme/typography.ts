/**
 * Pip — typography tokens.
 * From `spec-doc/pip-design-spec.md` §1.2.
 *
 * One rounded humanist sans (Nunito) across the whole product, plus a platform
 * mono for raw numeric readouts. Pip is the personality; the type stays quiet.
 */

import { Platform, type TextStyle } from 'react-native';

/**
 * Nunito weights 400/600/700/800, loaded via `@expo-google-fonts/nunito`.
 * These string keys must match the keys passed to `useFonts` in app/_layout.tsx.
 */
export const fontFamily = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
  /**
   * Numeric / mono. The spec explicitly does NOT use Nunito Sans here — raw
   * score readouts use the platform mono at Body-SM size.
   */
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) as string,
} as const;

type TypeToken = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'
>;

/** Mobile type scale. px = pt at 1×. */
export const type = {
  /** 28/34 800 — screen title on hero screens, Pip name reveal. */
  h1: { fontFamily: fontFamily.extrabold, fontSize: 28, lineHeight: 34 },
  /** 22/28 700 — section headers, sheet titles. */
  h2: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 28 },
  /** 18/24 700 — card titles, domain names. */
  h3: { fontFamily: fontFamily.bold, fontSize: 18, lineHeight: 24 },
  /** 16/22 600 — sub-labels, list-row titles. */
  h4: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22 },
  /** 17/26 400 — primary reading text, onboarding prompts. */
  bodyLg: { fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 26 },
  /** 15/22 400 — default body, list secondary text. */
  bodyMd: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  /** 13/18 400 — metadata, helper text, timestamps. */
  bodySm: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  /** 11/14 600 — chip labels, badges. Sentence case, NEVER all-caps. */
  caption: { fontFamily: fontFamily.semibold, fontSize: 11, lineHeight: 14 },
  /** 15/20 500 mono — raw score readouts. */
  numMd: { fontFamily: fontFamily.mono, fontSize: 15, lineHeight: 20 },
} as const satisfies Record<string, TypeToken>;

export type TypeName = keyof typeof type;

/**
 * Line-length target: ≤60 characters for Body-LG onboarding copy.
 * At 390pt wide with 16px side padding the text column is 358px, which lands
 * comfortably inside that. Kept here so layout code can reference it.
 */
export const CONTENT_WIDTH = 358;
export const BASE_VIEWPORT_WIDTH = 390;
