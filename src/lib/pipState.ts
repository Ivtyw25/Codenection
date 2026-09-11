/**
 * Pure derivation of Pip's visual state from the two scores.
 *
 * This is PRESENTATION logic, not the scoring engine — it decides which visual
 * to render given scores that are handed to it. `MascotState` is derived and
 * never stored independently (`pip-product-spec.md` §5.1).
 *
 * ── A note on the two specs ──────────────────────────────────────────────────
 * `pip-product-spec.md` §5.1 lists two Critical triggers; the standalone
 * `pip-gamification-design.md` §1.2 lists three, adding
 * `Vitality <= 10 regardless of Pressure`. That third trigger exists
 * specifically to catch "a student with a light task list but genuinely
 * depleted reserves, which the Pressure-only threshold used to miss entirely".
 * The gamification doc is the standalone authority on states, so the union of
 * all three is implemented here.
 */

import type { CapacityState, CriticalCause, PipStateName, SubStat } from '@/types';
import { SUB_STATS } from '@/types';

export interface DerivedPipState {
  state: PipStateName;
  /** Only meaningful when `state === 'critical'`. Frames SCR-30's copy. */
  criticalCause: CriticalCause | null;
  /** Drives the visual flourish within the base state, and which nudge fires. */
  lowestSubStat: SubStat;
}

/**
 * Evaluated in this exact order — the ordering is load-bearing, since the
 * conditions overlap.
 */
export function derivePipState(capacity: CapacityState): DerivedPipState {
  const { pressure, vitality } = capacity;

  const lowestSubStat = SUB_STATS.reduce<SubStat>(
    (lowest, key) =>
      capacity.subStats[key] < capacity.subStats[lowest] ? key : lowest,
    SUB_STATS[0],
  );

  let state: PipStateName;
  let criticalCause: CriticalCause | null = null;

  if (pressure >= 90 || (pressure >= 70 && vitality <= 15) || vitality <= 10) {
    state = 'critical';
    // "About to pop" only when Pressure itself is maxed. Every other route
    // into Critical is a depletion story, so it gets the rest framing.
    criticalCause = pressure >= 90 ? 'pressure' : 'vitality';
  } else if (vitality <= 30 && pressure >= 60) {
    state = 'depleted';
  } else if (vitality <= 30) {
    state = 'wilting';
  } else if (pressure >= 60) {
    state = 'strained';
  } else {
    state = 'balanced';
  }

  return { state, criticalCause, lowestSubStat };
}

/** Plain-language explanation shown under the state name on SCR-12. */
export const STATE_EXPLANATION: Record<PipStateName, string> = {
  balanced: "Steady — you're carrying this well right now.",
  strained: "Puffed up — you're carrying a lot right now.",
  wilting: "Shrunken — not much on, but your reserves are low.",
  depleted: "Puffed and sagging — a heavy load on an empty tank.",
  critical: "Maxed out — let's set something down together.",
};

/**
 * Recovery nudge copy, keyed to the lowest sub-stat.
 * "Given my Vitality score has dropped and a specific sub-input is lowest,
 *  the suggestion matches that specific input."
 */
export const NUDGE_BY_SUBSTAT: Record<
  SubStat,
  { title: string; body: string; action: string }
> = {
  rest: {
    title: "You've been running low on rest.",
    body: 'A 20-minute window before your next block would take the edge off. Nothing formal — just stop.',
    action: 'Log a rest window',
  },
  physical: {
    title: "You haven't moved much in a while.",
    body: 'A short walk counts. Round the block, no destination needed.',
    action: 'Log a walk',
  },
  mood: {
    title: "Your mood's been dipping this week.",
    body: 'A couple of minutes of slow breathing is a small thing that reliably helps.',
    action: 'Start a 2-minute break',
  },
  connection: {
    title: "It's been a quiet stretch socially.",
    body: 'Message one person you like. Low effort, no plans required.',
    action: 'Log a catch-up',
  },
};
