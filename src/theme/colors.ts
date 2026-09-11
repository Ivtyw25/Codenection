/**
 * Pip — colour tokens.
 * Transcribed verbatim from `spec-doc/pip-design-spec.md` §1.1.
 *
 * Contrast ratios noted in comments are the spec's own verified WCAG 2.1 AA
 * figures. Do not substitute the display shade for the `onFill` shade under
 * normal-weight text — that is exactly the pairing that fails AA.
 */

// ── 1.1.1 Brand ──────────────────────────────────────────────────────────────
export const brand = {
  /** Clay orange — Pip's body colour. Display / large text / non-text ONLY. */
  primary: '#E8734A',
  /** Primary button fill under white text. 5.07:1 on white — AA pass. */
  primaryOnFill: '#BC4A25',
  /** Primary tint — selected chips, washes. */
  primarySoft: '#FBEAE2',

  /** Grounding teal — calm, recovery. Display / large text / non-text ONLY. */
  secondary: '#3B9B8F',
  /** Teal button fill under white text. 5.11:1 on white — AA pass. */
  secondaryOnFill: '#2A7A6F',
  /** Teal tint. */
  secondarySoft: '#E2F2EF',

  /** Warm honey — Sparks, XP, celebration. Non-text / large only. */
  accent: '#FCE79A',
  /** Text/icon on honey. 6.27:1 on accent — AA pass. */
  accentText: '#6B4E00',
} as const;

// ── 1.1.2 Neutral & surface ──────────────────────────────────────────────────
export const neutral = {
  /** App background — warm paper. */
  bg: '#FBF7F2',
  /** Raised surface / grouped section behind cards. */
  surface: '#F5EEE6',
  /** Card / sheet fill. */
  card: '#FFFFFF',
  /** Muted fill — skeletons, inactive chips, slider track. */
  muted: '#F0E8DE',
  /** Hairline border, 1px. */
  border: '#E7DCCF',
  /** Emphasis border / focus-adjacent. */
  borderStrong: '#D8C7B4',

  /** Primary text — 12.4:1 on bg. */
  textPrimary: '#3D2C24',
  /** Secondary text — 5.08:1 on bg. */
  textSecondary: '#7A6659',
  /** Disabled text — 2.35:1. Decorative/non-essential ONLY, never load-bearing. */
  textDisabled: '#B0A196',
} as const;

// ── 1.1.3 Functional / semantic ──────────────────────────────────────────────
export const semantic = {
  success: { fill: '#E4F5EC', text: '#1F6B4A', solid: '#2E8B60' }, // 5.70:1 AA
  warning: { fill: '#FCF0DA', text: '#8A5A0C', solid: '#C9871A' }, // 5.25:1 AA
  destructive: { fill: '#FBE9E9', text: '#9E3535', solid: '#CF4A4A' }, // 5.95:1 AA
  info: { fill: '#E8F0FB', text: '#2A5B96', solid: '#3B7DD8' }, // 6.03:1 AA
} as const;

export type SemanticName = keyof typeof semantic;

// ── 1.1.4 Pip state colours (map onto the semantic ramp) ─────────────────────
export type PipStateName =
  | 'balanced'
  | 'strained'
  | 'wilting'
  | 'depleted'
  | 'critical';

export const pipState = {
  balanced: {
    fill: semantic.success.fill,
    text: semantic.success.text,
    silhouette: semantic.success.solid,
    label: 'Balanced',
  },
  strained: {
    fill: semantic.warning.fill,
    text: semantic.warning.text,
    silhouette: semantic.warning.solid,
    label: 'Strained',
  },
  wilting: {
    fill: semantic.info.fill,
    text: semantic.info.text,
    silhouette: semantic.info.solid,
    label: 'Wilting',
  },
  depleted: {
    fill: semantic.destructive.fill,
    text: semantic.destructive.text,
    silhouette: semantic.destructive.solid,
    label: 'Depleted & overloaded',
  },
  /** Critical is the one solid-fill state — white text on solid red. */
  critical: {
    fill: '#9E3535',
    text: '#FFFFFF',
    silhouette: '#9E3535',
    label: 'Critical',
  },
} as const satisfies Record<
  PipStateName,
  { fill: string; text: string; silhouette: string; label: string }
>;

/**
 * Mascot-only colours.
 *
 * The design spec's palette covers the UI; these two are described in
 * `pip-mascot-identity.md` §1.1 but never given tokens ("cheeks carry a soft
 * warmer blush", "two large simple round eyes with a single soft highlight
 * each"). They live here so the mascot still has no raw hex in its render.
 */
export const mascot = {
  /** Warm blush, laid over the body colour at partial opacity. */
  blush: '#C2452A',
  /** The single specular highlight per eye — the one gloss on a matte body. */
  highlight: '#FFFFFF',
} as const;

// ── 1.1.5 Semantic aliases — use THESE in components, not raw hex ────────────
export const colors = {
  bg: neutral.bg,
  surface: neutral.surface,
  card: neutral.card,
  muted: neutral.muted,
  border: neutral.border,
  borderStrong: neutral.borderStrong,

  text: neutral.textPrimary,
  textSecondary: neutral.textSecondary,
  textDisabled: neutral.textDisabled,

  /** Primary CTAs. */
  action: brand.primaryOnFill,
  /** Secondary CTAs. */
  actionQuiet: brand.secondaryOnFill,
  /** `#BC4A25` @ 40%, drawn with a 2px offset. */
  focusRing: 'rgba(188, 74, 37, 0.4)',

  brand,
  semantic,
  pipState,
  mascot,

  /** Pure white, for text on solid fills. */
  onFill: '#FFFFFF',
  /** Full-screen scrim — SCR-09 coach marks, SCR-30 intervention. */
  scrim: 'rgba(61, 44, 36, 0.55)',
} as const;

export type Colors = typeof colors;
