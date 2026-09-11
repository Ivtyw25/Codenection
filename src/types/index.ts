/**
 * Domain types, derived from the Figma flows.
 *
 * Sources: SCR "Home", "Today's Manifest", "Task Detail", "Shop",
 * "Pip", SCR-20 Capture Sheet, SCR-21 AI Processing Review.
 */

// ── Pip ─────────────────────────────────────────────────────────────────────

/** The five states shown on the Pip / Home headers. */
export type PipStateName = 'balanced' | 'strained' | 'wilting' | 'depleted' | 'critical';

export interface PipState {
  name: PipStateName;
  label: string;
  /** "Pip feels steady today. Your workloads and vitality are in healthy equilibrium." */
  blurb: string;
}

/**
 * The two headline gauges on Home and Pip.
 * Pressure is inverted — high is bad — which is why it renders amber while
 * Vitality renders green at comparable values.
 */
export interface Capacity {
  /** Workload Pressure, 0–100. Higher is worse. */
  pressure: number;
  /** Vitality Reserve, 0–100. Higher is better. */
  vitality: number;
  pressureNote: string;
  vitalityNote: string;
}

export interface Vital {
  id: string;
  label: string;
  value: number;
  /** Lucide icon name. */
  icon: string;
}

export interface PipProfile {
  name: string;
  level: number;
  sparks: number;
  state: PipState;
  capacity: Capacity;
  vitals: Vital[];
  /** Consecutive balanced days. */
  streakDays: number;
  /** Which of `streakDays` slots are filled, for the streak dot row. */
  streakGoal: number;
}

// ── Tasks ───────────────────────────────────────────────────────────────────

/** The @-prefixed contexts in the Manifest filter row. */
export type TaskContext = '@academics' | '@club' | '@errands' | '@internship';

export type TaskLoad = 'low' | 'medium' | 'high';

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
  /** Exactly one sub-task may carry the "Next Action" pill. */
  nextAction?: boolean;
}

export interface Resource {
  id: string;
  name: string;
  /** "PDF", "Doc", … */
  kind: string;
  size: string;
  /** Download vs. open-external affordance. */
  external?: boolean;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  context: TaskContext;
  /** Free tag shown as a filled chip — "#Leadership", "#Academics". */
  tag?: string;
  /** "Today, 4:00 PM" */
  due: string;
  /** "15 min", "1h", "90m" */
  estimate: string;
  load: TaskLoad;
  /** Cognitive-load delta, e.g. +3 renders "+3% load". */
  loadDelta: number;
  subtasks: SubTask[];
  notes?: string;
  resources: Resource[];
  /** The green "Pip's note" callout on Task Detail. */
  pipNote?: string;
  /** Lucide icon rendered in the row's leading square. */
  icon: string;
}

// ── Capture → Review (SCR-20 → SCR-21) ──────────────────────────────────────

/** A task the AI proposes in the Review sheet, before the user commits it. */
export interface ProposedTask {
  id: string;
  title: string;
  context: TaskContext;
  due: string;
  estimate: string;
  load: TaskLoad;
  subtasks: string[];
  /** Renders the blue "Calibrate later" hint chip. */
  calibrateLater?: boolean;
}

/** The amber "Just do it now (2-minute rule)" card. */
export interface QuickWin {
  id: string;
  title: string;
  note: string;
  done: boolean;
}

export interface CaptureReview {
  proposed: ProposedTask[];
  quickWin?: QuickWin;
  /** "Fits today's remaining cognitive budget (45% left)" */
  budgetRemaining: number;
  /** Sparks awarded on commit. */
  sparksReward: number;
}

// ── Shop ────────────────────────────────────────────────────────────────────

export type ShopCategory = 'skins' | 'hats' | 'habitat' | 'auras';

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  category: ShopCategory;
  /** Resolved via the registry in `src/data/skins.ts`. */
  image: number;
  owned?: boolean;
}
