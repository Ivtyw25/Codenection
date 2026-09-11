/**
 * Pip — the state & emotion matrix, as parameters.
 *
 * One preset per row of `pip-mascot-identity.md` §1.3. The prose in that doc
 * is the source of truth; the numbers here are its translation into the
 * parameter vector consumed by `Pip.tsx`.
 */

import type { PipPose, PipStateName, SubStat } from '@/types';

export type IdleKind = 'bob' | 'none' | 'tremble' | 'sleep' | 'hop' | 'breathe';
export type NubKind = 'none' | 'wave' | 'chin' | 'up';

export interface PipVisual {
  // ── Body ───────────────────────────────────────────────────────────────────
  widthK: number;
  heightK: number;
  baseK: number;
  topK: number;
  wideAt: number;
  /** Whole-body tilt in degrees. Positive leans right. */
  tilt: number;

  // ── Face ───────────────────────────────────────────────────────────────────
  /** 1 = fully open. At/below ~0.1 the closed arc is cross-faded in. */
  eyeOpen: number;
  eyeDroop: number;
  eyeScale: number;
  /** Bow of the closed-eye arc: > 0 happy upward, < 0 tired downward. */
  eyeBow: number;
  /** Vertical gaze offset. Negative looks up (Thinking). */
  eyeLookY: number;
  /** > 0 smiles, 0 is a tight flat line, < 0 frowns. */
  mouthCurve: number;
  mouthWidth: number;
  /** Renders the small round 'o' instead of the curve. */
  mouthO: boolean;
  blush: number;

  // ── Sprout ─────────────────────────────────────────────────────────────────
  /** 0 = perky and upright, 1 = fully wilted flat. */
  sproutDroop: number;
  /** < 1 shrinks to the single bud of the hatchling / empty states. */
  sproutScale: number;

  // ── Colour ─────────────────────────────────────────────────────────────────
  color: [number, number, number];

  // ── Motion & extras ────────────────────────────────────────────────────────
  idle: IdleKind;
  /** Animation-speed multiplier. Low Vitality slows Pip down. */
  idleSpeed: number;
  nub: NubKind;
  sweat: boolean;
  zzz: boolean;
  /** Faint pulsing outline — Critical only. */
  outline: boolean;
  sparkles: boolean;
  aura: boolean;
  scarf: boolean;
  nest: boolean;
  thoughtDots: boolean;
}

const base: PipVisual = {
  widthK: 1,
  heightK: 1,
  baseK: 0.86,
  topK: 0.72,
  wideAt: 0.2,
  tilt: 0,
  eyeOpen: 1,
  eyeDroop: 0,
  eyeScale: 1,
  eyeBow: 3,
  eyeLookY: 0,
  mouthCurve: 5,
  mouthWidth: 8,
  mouthO: false,
  blush: 0.5,
  sproutDroop: 0,
  sproutScale: 1,
  color: [232, 115, 74], // #E8734A — brand primary; Pip and the brand are one colour
  idle: 'bob',
  idleSpeed: 1,
  nub: 'none',
  sweat: false,
  zzz: false,
  outline: false,
  sparkles: false,
  aura: false,
  scarf: false,
  nest: false,
  thoughtDots: false,
};

// ── The five live capacity states ────────────────────────────────────────────

/**
 * Keyed by state; Critical splits by cause, since a Pressure-driven Critical
 * ("about to pop") and a Vitality-driven one ("running on empty") are visually
 * opposite even though both route to SCR-30.
 */
export const CORE_STATES: Record<
  Exclude<PipStateName, 'critical'> | 'criticalPressure' | 'criticalVitality',
  PipVisual
> = {
  /** Upright plump bean, saturated, sprout perky, relaxed smile, gentle bob. */
  balanced: { ...base },

  /**
   * Puffed ~15% wider, cheeks bulging, eyes squinting with effort, a sweat
   * bead, mouth a tight flat line, sprout pushed outward by the puffing.
   */
  strained: {
    ...base,
    widthK: 1.16,
    heightK: 0.99,
    baseK: 0.88,
    topK: 0.88,
    wideAt: 0.08,
    eyeOpen: 0.42,
    eyeDroop: 0.18,
    mouthCurve: 0,
    mouthWidth: 7,
    blush: 0.78,
    sproutDroop: 0.14,
    color: [233, 103, 60],
    idleSpeed: 1.3,
    sweat: true,
  },

  /**
   * Shrunken ~15% and slumped lower/wider at the base, desaturated toward
   * muted terracotta, half-lidded eyes, sprout drooping, slow "zzz" idle.
   */
  wilting: {
    ...base,
    widthK: 0.94,
    heightK: 0.85,
    baseK: 0.98,
    topK: 0.6,
    wideAt: 0.38,
    eyeOpen: 0.34,
    eyeDroop: 0.82,
    eyeBow: -2,
    mouthCurve: 0,
    mouthWidth: 6,
    blush: 0.26,
    sproutDroop: 0.76,
    color: [196, 145, 122],
    idle: 'sleep',
    idleSpeed: 0.5,
    zzz: true,
  },

  /**
   * Simultaneously puffed at the top and sagging at the base — an unstable,
   * overfilled-yet-drained look. Dull-with-tension colouring, droopy stressed
   * eyes, downturned wobbling mouth, sprout both pushed out and drooping.
   */
  depleted: {
    ...base,
    widthK: 1.12,
    heightK: 0.9,
    baseK: 1.04,
    topK: 0.9,
    wideAt: 0.34,
    eyeOpen: 0.48,
    eyeDroop: 0.72,
    mouthCurve: -5,
    mouthWidth: 8,
    blush: 0.34,
    sproutDroop: 0.62,
    color: [200, 115, 85],
    idleSpeed: 0.6,
  },

  /**
   * Maximally over-inflated and taut, trembling, deep red-orange, wide alarmed
   * eyes, gritted mouth, faint pulsing outline. Never actually bursts.
   */
  criticalPressure: {
    ...base,
    // Round, not boxy: an overfilled balloon tends toward a sphere, so the
    // control handles stay well inside the corners even at max inflation.
    widthK: 1.3,
    heightK: 1.02,
    baseK: 0.8,
    topK: 0.78,
    wideAt: 0.14,
    eyeOpen: 1,
    eyeScale: 1.24,
    mouthCurve: -2,
    mouthWidth: 9,
    blush: 0.62,
    sproutDroop: 0.2,
    color: [210, 68, 37],
    idle: 'tremble',
    idleSpeed: 1,
    outline: true,
  },

  /**
   * Collapsed and puddled into a low soft slump, very pale and washed out,
   * eyes closed, sprout wilted flat, faint pulsing outline. Motionless.
   */
  criticalVitality: {
    ...base,
    widthK: 1.18,
    heightK: 0.6,
    baseK: 1.12,
    topK: 0.5,
    wideAt: 0.55,
    eyeOpen: 0.04,
    eyeDroop: 1,
    eyeBow: -3,
    mouthCurve: 0,
    mouthWidth: 5,
    blush: 0.18,
    sproutDroop: 1,
    color: [224, 191, 174],
    idle: 'none',
    idleSpeed: 0,
    outline: true,
  },
};

// ── Journey / touchpoint poses ───────────────────────────────────────────────

export const POSES: Record<PipPose, PipVisual> = {
  /** Small, curious, tilting to look up, tiny single-bud sprout, waving. */
  welcome: {
    ...base,
    widthK: 0.88,
    heightK: 0.86,
    wideAt: 0.24,
    tilt: 7,
    eyeOpen: 1.1,
    eyeScale: 1.12,
    mouthCurve: 5.5,
    sproutScale: 0.58,
    color: [238, 124, 82],
    nub: 'wave',
    blush: 0.6,
  },

  /** Attentive, leaning forward, one nub touching its chin, bright eyes. */
  listening: {
    ...base,
    tilt: 5,
    eyeOpen: 1.06,
    eyeScale: 1.05,
    mouthCurve: 3,
    nub: 'chin',
  },

  /** Eyes turned up, orbiting dots above the sprout, mouth a small 'o'. */
  thinking: {
    ...base,
    eyeOpen: 1,
    eyeLookY: -1.6,
    mouthO: true,
    idle: 'none',
    thoughtDots: true,
  },

  /** Mid-hop, both nubs up, happy upward-arc eyes, honey sparkle burst. */
  celebrating: {
    ...base,
    heightK: 1.02,
    eyeOpen: 0,
    eyeBow: 4.2,
    mouthCurve: 8,
    mouthWidth: 8.5,
    color: [237, 126, 84],
    idle: 'hop',
    idleSpeed: 1.2,
    nub: 'up',
    sparkles: true,
    blush: 0.68,
  },

  /** Proud upright wearing the new accessory, soft golden aura behind. */
  tierUnlock: {
    ...base,
    eyeOpen: 0.9,
    mouthCurve: 4,
    idle: 'bob',
    idleSpeed: 0.85,
    aura: true,
    scarf: true,
  },

  /** Eyes softly closed, a small floating z, sitting low and content. */
  resting: {
    ...base,
    heightK: 0.88,
    baseK: 1,
    wideAt: 0.4,
    eyeOpen: 0.02,
    eyeBow: -2.2,
    mouthCurve: 1.8,
    mouthWidth: 6,
    sproutDroop: 0.2,
    idle: 'breathe',
    idleSpeed: 0.55,
    zzz: true,
    blush: 0.4,
  },

  /** Neutral-friendly, single sprout bud, a soft dotted nest beneath. */
  empty: {
    ...base,
    eyeOpen: 1,
    mouthCurve: 3,
    sproutScale: 0.6,
    idleSpeed: 0.8,
    nest: true,
    blush: 0.4,
  },

  /** Single-colour, no face detail — the shareable friends view. */
  silhouette: {
    ...base,
    idle: 'none',
    idleSpeed: 0,
    blush: 0,
  },
};

// ── Lowest-sub-stat flourishes ───────────────────────────────────────────────

/**
 * "Whichever sub-stat is currently lowest drives the specific visual flourish
 *  Pip shows within its current base state" (§1.3):
 *  droopy/sleepy for low Rest, sluggish posture for low Physical, duller colour
 *  for low Mood, Pip curled inward for low Connection.
 *
 * These modify the base state rather than replacing it, so a Strained Pip with
 * low Rest still reads as Strained.
 */
export function applySubStatFlourish(v: PipVisual, lowest: SubStat): PipVisual {
  switch (lowest) {
    case 'rest':
      return { ...v, eyeDroop: Math.min(1, v.eyeDroop + 0.35), eyeOpen: v.eyeOpen * 0.82 };
    case 'physical':
      return {
        ...v,
        heightK: v.heightK * 0.95,
        wideAt: Math.min(0.6, v.wideAt + 0.1),
        baseK: v.baseK + 0.06,
        idleSpeed: v.idleSpeed * 0.75,
      };
    case 'mood': {
      // Desaturate toward the body's own luminance — "duller colour".
      const [r, g, b] = v.color;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const mix = 0.34;
      return {
        ...v,
        color: [
          r + (lum - r) * mix,
          g + (lum - g) * mix,
          b + (lum - b) * mix,
        ],
        blush: v.blush * 0.6,
      };
    }
    case 'connection':
      // Curled inward and turned slightly away.
      return { ...v, tilt: v.tilt - 9, widthK: v.widthK * 0.96, eyeLookY: v.eyeLookY + 0.6 };
  }
}
