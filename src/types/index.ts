/**
 * Domain schema.
 *
 * The Figma frames are the source of the *shapes* here — every field maps to
 * something a frame actually renders. What the frames could not supply is
 * behaviour, so this file draws a hard line:
 *
 *   STORED    facts the app owns and mutates  (tasks, sparks, vitals, purchases)
 *   DERIVED   never stored, always computed   (capacity, Pip's state, streaks)
 *
 * Nothing that can be computed is stored. "Pressure 38 / Vitality 76" was a
 * literal in the first rebuild because the frame said 38 and 76; here those are
 * a function of the open task list, so completing a task moves them.
 */

// ── Identity ────────────────────────────────────────────────────────────────

export type TaskId = string;
export type SubTaskId = string;
export type ResourceId = string;
export type ShopItemId = string;
export type CaptureId = string;
export type NotificationId = string;

/** Lucide icon names the app is allowed to render. Keeps data → icon total. */
export type IconName =
  | 'CalendarDays'
  | 'Code'
  | 'FileText'
  | 'BookOpen'
  | 'Mail'
  | 'ShoppingCart'
  | 'Dumbbell'
  | 'Users'
  | 'Sparkles';

// ── Tasks ───────────────────────────────────────────────────────────────────

/** The @-prefixed contexts in the Manifest filter row. */
export type TaskContext = '@academics' | '@club' | '@errands' | '@internship' | '@personal';

export type TaskLoad = 'low' | 'medium' | 'high';

export type TaskStatus = 'open' | 'done';

export interface SubTask {
  id: SubTaskId;
  title: string;
  done: boolean;
}

export interface Resource {
  id: ResourceId;
  name: string;
  /** "PDF", "Doc", … */
  kind: string;
  size: string;
  /** Open-external vs. download affordance. */
  external?: boolean;
}

export interface Task {
  id: TaskId;
  title: string;
  status: TaskStatus;
  context: TaskContext;
  /** Free tag shown as a filled chip — "#Leadership", "#Academics". */
  tag?: string;
  /**
   * ISO-8601. The frames show "Today, 4:00 PM" / "Tomorrow, 6:00 PM" — those
   * are renderings of an instant, not content. `formatDue` produces them.
   */
  dueAt: string | null;
  /** Minutes. Rendered "15 min" / "1h" by `formatEstimate`. */
  estimateMin: number;
  load: TaskLoad;
  subtasks: SubTask[];
  notes?: string;
  resources: Resource[];
  /** The green "Pip's note" callout on Task Detail. */
  pipNote?: string;
  icon: IconName;
  createdAt: string;
  completedAt: string | null;
}

/** What the Manifest filters by. `all` is the unfiltered pseudo-context. */
export type ContextFilter = TaskContext | 'all';
export type RangeFilter = 'today' | 'tomorrow' | 'week' | 'all';
export type SortKey = 'due' | 'load' | 'created';

export interface TaskQuery {
  context: ContextFilter;
  range: RangeFilter;
  sort: SortKey;
  /** Hide completed tasks. */
  hideDone: boolean;
  /** Anchor day for `range`. ISO date. */
  anchor: string;
}

// ── Capture → Review (SCR-20 → SCR-21) ──────────────────────────────────────

/** How a capture got into the Inbox. A stored fact, not a UI toggle. */
export type CaptureKind = 'text' | 'voice';

/**
 * A raw thought. The Inbox is a queue of these.
 *
 * Deliberately NOT a task, and deliberately unprocessed: no context, no due
 * date, no estimate. Getting a thought out of your head should cost three
 * seconds and no decisions — structuring it is a separate job, done later and
 * in bulk from `/inbox`. `parseCapture` never runs on the way in.
 */
export interface CaptureNote {
  id: CaptureId;
  /** Voice notes carry their transcript here, so every note is editable text. */
  text: string;
  kind: CaptureKind;
  /** Voice only. Drives the "0:11" chip on the Inbox row. */
  durationSec?: number;
  createdAt: string;
}

/** A task the AI proposes in the Review sheet, before the user commits it. */
export interface ProposedTask {
  id: string;
  /**
   * The Inbox note this came out of. Triage processes several notes at once, so
   * a proposal has to know its origin: it is what lets the commit retire
   * exactly the notes that were processed, and lets the sheet group proposals
   * under the thought that produced them.
   */
  sourceId: CaptureId;
  title: string;
  context: TaskContext;
  dueAt: string | null;
  estimateMin: number;
  load: TaskLoad;
  icon: IconName;
  subtasks: string[];
  /** Renders the blue "Calibrate later" hint chip. */
  calibrateLater?: boolean;
}

/** The amber "Just do it now (2-minute rule)" card. */
export interface QuickWin {
  id: string;
  title: string;
  note: string;
}

/** The whole SCR-21 payload — what `api.processInbox` resolves to. */
export interface CaptureReview {
  /** Every note in this batch, including ones that yielded no proposal. */
  sourceIds: CaptureId[];
  proposed: ProposedTask[];
  quickWin: QuickWin | null;
  /** Sparks awarded on commit. */
  sparksReward: number;
}

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
 * DERIVED. The two headline gauges on Home and Pip.
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

/** STORED. A daily reading from the integrations in SCR-07. */
export interface Vital {
  id: 'sleep' | 'focus';
  label: string;
  /** 0–100. */
  value: number;
  /** The sentence the Pip tab shows under the gauge. */
  note: string;
}

/** STORED. One closed day — what Reflect reads and what the streak counts. */
export interface DayRecord {
  /** ISO date, no time. */
  date: string;
  pressure: number;
  vitality: number;
  tasksCompleted: number;
  state: PipStateName;
}

// ── Shop ────────────────────────────────────────────────────────────────────

export type ShopCategory = 'skins' | 'hats' | 'habitat' | 'auras';

export interface ShopItem {
  id: ShopItemId;
  name: string;
  price: number;
  category: ShopCategory;
  /** `require()` handle, resolved via the registry in `src/data/seed.ts`. */
  image: number;
}

// ── Notifications ───────────────────────────────────────────────────────────

export type NotificationKind = 'nudge' | 'reward' | 'system';

export interface AppNotification {
  id: NotificationId;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

// ── Root ────────────────────────────────────────────────────────────────────

export interface Settings {
  /** null = follow the OS. */
  theme: 'light' | 'dark' | null;
  notificationsEnabled: boolean;
  /** Opt-in on top of the OS reduced-motion setting; never overrides it down. */
  reduceMotion: boolean;
}

/** Everything `api.bootstrap()` resolves to — the app's whole stored world. */
export interface AppData {
  user: { name: string };
  pip: {
    name: string;
    level: number;
    sparks: number;
    /** Owned cosmetics, by id. */
    owned: ShopItemId[];
    /** The equipped skin, or null for Pip's default body. */
    equipped: ShopItemId | null;
    /** Consecutive balanced days target for the dot row. */
    streakGoal: number;
  };
  tasks: Task[];
  inbox: CaptureNote[];
  vitals: Vital[];
  history: DayRecord[];
  shop: ShopItem[];
  notifications: AppNotification[];
  settings: Settings;
}

// ── Async ───────────────────────────────────────────────────────────────────

/**
 * The four-state machine every remote read runs through. The teardown's
 * largest genuine finding was that the source system has "zero skeleton
 * loaders, spinners, empty states or error states anywhere across 16 routes",
 * so loading and failure are modelled here rather than assumed away.
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}
