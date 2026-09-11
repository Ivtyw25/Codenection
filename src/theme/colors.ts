/**
 * Examon design system — colour tokens.
 * Derived from the "Examon Design System Teardown" (designlang v12.21.0, 16 routes).
 *
 * The teardown grades every extracted value `system` / `drift` / `artifact`.
 * This file adopts `system` as-is, consolidates `drift`, and DISCARDS `artifact`
 * (measurement noise — computed offsets, transparent scaffolding, browser defaults).
 *
 * Rule: components import from `@/theme`. Never a raw hex in a component.
 */

// ── Brand ───────────────────────────────────────────────────────────────────
// "The forest green appears 2,140 times across 16 routes — unambiguously the
//  system's spine, and its pairing with the lime is the single strongest
//  decision in the whole design."
export const brand = {
  /** Forest green. The spine. 2,140 uses. */
  forest: '#26402b',
  /** Lime. The hero pairing partner. 360 uses. */
  lime: '#79eb56',
  /** Amber. Sparingly — 33 uses. Non-text / large only. */
  amber: '#fdd130',
  /** Brand-tinted green-grey. 52 uses. */
  moss: '#536555',
} as const;

/**
 * Verified pairings from the teardown's own WCAG measurements.
 * These are the two combinations the system is built on — both AAA.
 */
export const pairing = {
  /** #26402b on #79eb56 — 7.47:1, AAA. The hero pairing. */
  forestOnLime: { fg: brand.forest, bg: brand.lime, ratio: 7.47 },
  /** #ffffff on #26402b — 11.35:1, AAA. Primary button. */
  whiteOnForest: { fg: '#ffffff', bg: brand.forest, ratio: 11.35 },
} as const;

// ── Neutral ramp ────────────────────────────────────────────────────────────
// Teardown: "Twelve neutrals for what is functionally a five-step need. Three
// distinct grey families in play at once. Consolidating to one family would
// remove six tokens without any visible change."
//
// Consolidated onto ONE family (Tailwind gray). The bespoke #ebebeb (10,272
// uses) maps to n200 #e5e7eb — a 1.6/255 delta, visually identical, and it
// collapses the largest bespoke token into the shared ramp.
export const n = {
  0: '#ffffff',
  50: '#f9fafb',
  100: '#f3f4f6',
  /** Hairline border. Absorbs bespoke #ebebeb (10,272 uses). */
  200: '#e5e7eb',
  300: '#d1d5db',
  /**
   * ⚠️ NON-TEXT ONLY. 2.54:1 on white — roughly half the AA threshold.
   * The teardown's #1 accessibility finding (16 failing instances).
   * For muted text use `n[500]` instead. Disabled/decorative fills only.
   */
  400: '#9ca3af',
  /** Muted text. 4.83:1 on white — AA. This is the fix for the n400 failures. */
  500: '#6b7280',
  /** Secondary text. 7.0:1 on white — AAA. */
  600: '#4b5563',
  700: '#374151',
  /** Primary text. 17.72:1 on white — AAA. */
  900: '#18181b',
} as const;

// ── Semantic / status ───────────────────────────────────────────────────────
// Note: the teardown flags #16a34a as a FOURTH green — Tailwind green-600,
// "brand-adjacent but not in the system". Discarded. Success derives from the
// brand forest so status stays inside the brand family.
export const status = {
  success: { fg: '#1d6b3f', bg: '#e4f0e6', solid: '#2f7d4f' },
  warning: { fg: '#7a5310', bg: '#f7eed6', solid: '#9a6a12' },
  danger: { fg: '#8f3725', bg: '#f5e3dd', solid: '#a8422c' },
  info: { fg: '#2b5b7d', bg: '#e2ecf2', solid: '#3a7ba3' },
} as const;

export type StatusName = keyof typeof status;

// ── Themes ──────────────────────────────────────────────────────────────────
// Teardown: "A real dark theme ships — 116 CSS custom properties with paired
// light/dark values. Primary and secondary hold constant across both themes;
// only the accent swaps, from amber #fdd130 in light to a near-white blush
// #fef2f2 in dark. Surfaces move to #121718 and #21362d."
/**
 * A resolved colour scheme.
 *
 * Values are typed `string` deliberately. With `as const` each role would carry
 * a singleton literal type (`'#f3f4f6'`), so any component that assigns one
 * role's colour into a variable initialised from another's — the normal shape
 * of a variant switch — would fail to compile for no real reason.
 */
export interface Scheme {
  ground: string;
  surface: string;
  surfaceAlt: string;
  sunk: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;

  border: string;
  borderStrong: string;

  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  accent: string;
  onAccent: string;

  focus: string;
  scrim: string;
}

export const light: Scheme = {
  ground: n[50],
  surface: n[0],
  surfaceAlt: n[100],
  sunk: n[100],

  text: n[900],
  textSecondary: n[600],
  textMuted: n[500],
  /** ⚠️ Never load-bearing text — see n[400]. */
  textDisabled: n[400],

  border: n[200],
  borderStrong: n[300],

  primary: brand.forest,
  /** Text/icon on `primary`. 11.35:1 — AAA. */
  onPrimary: '#ffffff',
  secondary: brand.lime,
  /** Text/icon on `secondary`. 7.47:1 — AAA. */
  onSecondary: brand.forest,
  accent: brand.amber,
  onAccent: n[900],

  /** Accent-coloured focus ring — reinforces brand over the browser default. */
  focus: brand.lime,
  scrim: 'rgba(24, 24, 27, 0.55)',
};

export const dark: Scheme = {
  ground: '#121718',
  surface: '#1a211c',
  surfaceAlt: '#21362d',
  sunk: '#0d1211',

  text: '#e9ebe5',
  textSecondary: '#a8b2a9',
  textMuted: '#768178',
  textDisabled: '#5b655d',

  border: '#2c3630',
  borderStrong: '#3b463e',

  /** Primary holds constant across themes — but lifts for text legibility. */
  primary: brand.forest,
  onPrimary: '#ffffff',
  secondary: brand.lime,
  onSecondary: brand.forest,
  /** The one token that swaps: amber → near-white blush. */
  accent: '#fef2f2',
  onAccent: '#18181b',

  focus: brand.lime,
  scrim: 'rgba(0, 0, 0, 0.66)',
};
