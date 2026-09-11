/**
 * Pip — shared domain types.
 *
 * Frontend stage: these describe the SHAPE of the data the UI renders. No
 * engine, no persistence, no network. The scoring engine described in
 * `pip-product-spec.md` §5 will produce these values later; for now they come
 * from `@/mock`.
 */

import type { PipStateName } from '@/theme';

// ── Scoring ──────────────────────────────────────────────────────────────────

/**
 * The five backbone category tags (`pip-onboarding-and-gtd.md` §A.1).
 * The student never thinks in these terms; the engine always does.
 * mental / time / errands roll up into Pressure; physical / social / rest+mood
 * make up Vitality.
 */
export type CategoryTag = 'mental' | 'time' | 'physical' | 'social' | 'errands';

/** The four named Vitality sub-stats (`pip-gamification-design.md` §1.3). */
export type SubStat = 'rest' | 'physical' | 'mood' | 'connection';

export const SUB_STATS: readonly SubStat[] = ['rest', 'physical', 'mood', 'connection'];

export const SUB_STAT_LABEL: Record<SubStat, string> = {
  rest: 'Rest',
  physical: 'Physical',
  mood: 'Mood',
  connection: 'Connection',
};

/**
 * Critical has two distinct causes, both routed to SCR-30 but framed
 * differently: Pressure-driven calls for offloading, Vitality-driven for rest.
 */
export type CriticalCause = 'pressure' | 'vitality';

export interface CapacityState {
  /** 0–100. Drives Pip's size (inflation). */
  pressure: number;
  /** 0–100 composite. Drives posture, colour saturation, animation speed. */
  vitality: number;
  subStats: Record<SubStat, number>;
  /** Direction over the last 3 days, for the dashboard trend arrow. */
  trend: 'up' | 'down' | 'flat';
  /** Days 1–7: scores are badged "Estimating…" (`§A.9` cold start). */
  isColdStart: boolean;
}

// ── Life domains ─────────────────────────────────────────────────────────────

/**
 * The student's real, named commitments — the surface layer they see and the
 * app talks to them about (`pip-onboarding-and-gtd.md` §A.1).
 */
export interface LifeDomain {
  id: string;
  /** e.g. "Debate Club President", "Varsity Swim Training". */
  name: string;
  /** Backbone tags. A domain can carry several. */
  categories: CategoryTag[];
  /** Rough hours per week (§A.4). */
  hoursPerWeek: number;
  /**
   * −1 = purely draining … +1 = deeply fulfilling (§A.6).
   * A fulfilling domain both costs less Pressure and feeds Vitality.
   */
  fulfillment: number;
  /** Steady vs. spiky. Spiky domains are what forecasting watches hardest. */
  volatility: 'steady' | 'spiky';
  /** Tint used for this domain's chip throughout the UI. */
  tint: string;
}

// ── Tasks ────────────────────────────────────────────────────────────────────

/** Item lifecycle (`pip-onboarding-and-gtd.md` §B.5). */
export type TaskStatus =
  | 'captured'
  | 'ai-proposed'
  | 'active'
  | 'deferred'
  | 'done'
  | 'discarded';

/** GTD contexts — filter to what's actionable right now. */
export type TaskContext = '@library' | '@online' | '@errands' | '@low-energy';

export const TASK_CONTEXTS: readonly TaskContext[] = [
  '@library',
  '@online',
  '@errands',
  '@low-energy',
];

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  /** The Life Domain this belongs to; it inherits that domain's tags. */
  domainId?: string;
  /** Direct category tag when no domain fits (§B.2 step 2). */
  categories?: CategoryTag[];
  context?: TaskContext;
  /** Human-facing due label, e.g. "Today", "Thu". */
  due?: string;
  /** Effort estimate in minutes. */
  effortMinutes?: number;
  /** Flags a later Task-Level Calibration Check (§B.2 step 5). */
  lowConfidenceEstimate?: boolean;
  notes?: string;
  subTasks?: SubTask[];
  /** 2-minute rule — "just do it now" rather than scheduled (§B.2 step 3). */
  trivial?: boolean;
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

// ── Gamification ─────────────────────────────────────────────────────────────

export type TierName = 'hatchling' | 'sprout' | 'companion' | 'guardian' | 'elder';

export interface Tier {
  name: TierName;
  label: string;
  minXp: number;
  maxXp: number | null;
  unlocks: string;
}

/** §1.5 — cumulative XP thresholds. */
export const TIERS: readonly Tier[] = [
  { name: 'hatchling', label: 'Hatchling', minXp: 0, maxXp: 199, unlocks: 'Base Pip skin, starter habitat' },
  { name: 'sprout', label: 'Sprout', minXp: 200, maxXp: 599, unlocks: 'First accessory slot, 2 habitat items' },
  { name: 'companion', label: 'Companion', minXp: 600, maxXp: 1499, unlocks: 'Second accessory slot, ambient habitat effects' },
  { name: 'guardian', label: 'Guardian', minXp: 1500, maxXp: 3499, unlocks: 'Rare cosmetic set, send flares to friends' },
  { name: 'elder', label: 'Elder', minXp: 3500, maxXp: null, unlocks: 'Full customization set, seasonal cosmetics' },
];

export interface Wallet {
  sparks: number;
  xp: number;
  carePoints: number;
  /** Consecutive days without hitting Critical. */
  balanceStreak: number;
  tier: TierName;
}

export interface LedgerEntry {
  id: string;
  /** Never negative — no day at any state ever subtracts XP or Sparks. */
  xp: number;
  sparks: number;
  reason: string;
  when: string;
}

// ── Profile ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  firstName: string;
  pipName: string;
  /** Index into the starter skin swatches chosen at SCR-02. */
  skinIndex: number;
  domains: LifeDomain[];
  wallet: Wallet;
}

// ── Mascot ───────────────────────────────────────────────────────────────────

/**
 * Journey / touchpoint states used on specific screens
 * (`pip-mascot-identity.md` §1.3). These are authored poses, distinct from the
 * five live capacity states which are DERIVED from the scores.
 */
export type PipPose =
  | 'welcome'
  | 'listening'
  | 'thinking'
  | 'celebrating'
  | 'tierUnlock'
  | 'resting'
  | 'empty'
  | 'silhouette';

export type { PipStateName };
