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
export type AttachmentId = string;
export type NotificationId = string;
export type TeammateId = string;
export type CategoryId = string;

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
  | 'Sparkles'
  | 'Briefcase'
  | 'Heart'
  | 'Home';

// ── Categories ──────────────────────────────────────────────────────────────

/**
 * One of the things this student carries.
 *
 * STORED, and the user's own. This is the single most important consequence of
 * the load model: the app does not decide what a life is made of. An earlier
 * cut split every task across five fixed vectors — mental, time, physical,
 * social, errands — and it was wrong twice over. It asked the app to invent
 * five numbers per task that nobody could check, and it described a student's
 * week in a vocabulary no student uses. Nobody says "my social vector is at
 * 39%". They say "the club is eating me alive".
 *
 * So load decomposes across THESE — whatever the student actually has — and a
 * category is a first-class row they can add, rename, retire, or reorder. A
 * nursing student with placements and a CS student with an internship get
 * genuinely different breakdowns rather than the same five bars with different
 * numbers in them.
 *
 * `id` is stable and never rendered; `label` is what the user typed and may
 * change under it. Nothing stores a label.
 */
export interface Category {
  id: CategoryId;
  /** What the user calls it. "Academics", "Placement", "Mum's stuff". */
  label: string;
  icon: IconName;
  /**
   * Words that route a fresh capture here.
   *
   * Plain strings rather than a RegExp so a category survives serialisation and
   * so the user can see — and fix — exactly why their note landed where it did.
   * `matchCategory` compiles them at call time.
   */
  match: string[];
  /**
   * Retired rather than deleted.
   *
   * Deleting a category the user has history under would silently rewrite what
   * their last month was made of. An archived category stops being offered on
   * new work and disappears from the breakdown once nothing open carries it,
   * but Reflect can still say what October cost.
   */
  archived?: boolean;
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export type TaskLoad = 'low' | 'medium' | 'high';

/**
 * `dropped` is a first-class outcome, not a deletion.
 *
 * The whole point of the Drop lever is to give someone permission to stop
 * carrying something — and permission you have to hide the evidence of is not
 * permission. A dropped task leaves Pressure immediately and stays in the
 * record, so Weekly Reflect can show what was let go and what it bought. If
 * dropping meant `removeTask`, the app would be asking students to delete proof
 * of a decision it just told them was healthy.
 */
export type TaskStatus = 'open' | 'done' | 'dropped';

/** The four ways to put something down. */
export type Lever = 'drop' | 'breakdown' | 'delegate' | 'postpone';

/**
 * One step of a task.
 *
 * `dependsOn` is what makes the list a graph rather than a checklist: a step
 * that waits on unfinished work renders locked and cannot be ticked, so "Next
 * Action" can never point at something the student is not yet able to start.
 * Edges only ever point at siblings — see `blockers` in `src/data/derive.ts`.
 */
export interface SubTask {
  id: SubTaskId;
  title: string;
  done: boolean;
  /** Rough minutes. A parent's `estimateMin` is the sum of its steps'. */
  estimateMin: number;
  /**
   * Sibling steps that must be done first. Empty means startable now.
   *
   * Acyclic by construction, not by check: seeded breakdowns are authored that
   * way, and the add-step flow only offers steps that already exist, so a new
   * edge can only ever point backwards.
   */
  dependsOn: SubTaskId[];
  /**
   * Handed to a teammate. Their minutes leave the student's Pressure, but the
   * step still blocks its dependents until someone marks it done.
   */
  delegatedTo?: TeammateId | null;
  /**
   * ISO-8601. When this step was actually ticked, or null while it is open.
   *
   * The one scheduling fact that is STORED, because it is the one that cannot
   * be computed: `src/data/schedule.ts` derives where every *future* block
   * sits, but nothing in the stored world remembers that the reading got done
   * at 9:40 this morning. Today's timeline needs that to draw finished work in
   * its real place rather than lumping it above the rail.
   */
  completedAt?: string | null;
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
  /** Which of the user's own categories this belongs to. */
  categoryId: CategoryId;
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
  /** When the student chose to stop carrying this. Null unless `dropped`. */
  droppedAt?: string | null;
  /** Why, in their own words or the reason they picked. Never required. */
  dropReason?: string | null;
  /**
   * The deadline this task had before it was last postponed.
   *
   * Kept so the app can say "moved twice already" rather than letting a task
   * slide forever one comfortable week at a time. Deferral is a real lever; an
   * invisible deferral habit is how a backlog rots.
   */
  postponedFrom?: string | null;
  postponeCount?: number;
}

/** What the Manifest filters by. `all` is the unfiltered pseudo-category. */
export type CategoryFilter = CategoryId | 'all';
export type RangeFilter = 'today' | 'tomorrow' | 'week' | 'all';
export type SortKey = 'due' | 'load' | 'created';

export interface TaskQuery {
  categoryId: CategoryFilter;
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

/** What an attachment is, for picking an icon and grouping the tray. */
export type AttachmentKind = 'image' | 'video' | 'audio' | 'document';

/**
 * A file carried along with a capture.
 *
 * ATTACHED, NOT UPLOADED. There is no backend, so `uri` points at a local file
 * — the picker's cache copy on this device. The distinction matters: the app
 * must never imply the file has gone anywhere. Swapping this for real storage
 * means uploading on commit and replacing `uri` with a remote one; nothing
 * about the capture flow changes.
 */
export interface CaptureAttachment {
  id: AttachmentId;
  /** Display name — the picker's filename, or a generated one for media. */
  name: string;
  kind: AttachmentKind;
  /** Local file URI. */
  uri: string;
  /** Bytes, when the picker reports it. Rendered by `formatBytes`. */
  sizeBytes?: number;
  mimeType?: string;
  /** Seconds, for audio and video. */
  durationSec?: number;
}

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
  /**
   * Supporting context the user attached — documents, media, extra audio.
   *
   * Bundled with the note as ONE inbox item rather than filed separately: the
   * photo of the whiteboard and the sentence about it are the same thought, and
   * splitting them at capture time would mean re-pairing them at triage time.
   */
  attachments: CaptureAttachment[];
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
  categoryId: CategoryId;
  dueAt: string | null;
  estimateMin: number;
  load: TaskLoad;
  icon: IconName;
  subtasks: ProposedSubTask[];
  /**
   * Trivial enough for the 2-minute rule — renders under "Just do it now"
   * instead of among the breakdown cards. Still commits as a real task.
   */
  twoMinute?: boolean;
  /**
   * The user did it right there in the sheet. It still commits — a two-minute
   * job that got done is a real thing that happened, and dropping it on the
   * floor would lose the Spark and the completed-today count.
   */
  completeNow?: boolean;
}

/**
 * A proposed step, before commit.
 *
 * Ids here are LOCAL to the proposal and exist only so a proposal can express
 * "this waits on that" — real `SubTaskId`s are minted in `materialise()`. The
 * previous shape was a bare `string[]`, which had no ids and therefore could
 * not carry a dependency at all.
 */
export interface ProposedSubTask {
  id: string;
  title: string;
  estimateMin: number;
  /** Local ids of sibling proposed steps. */
  dependsOn: string[];
  /** Pip thinks this could be handed off — drives the delegate section. */
  delegatable?: boolean;
  delegatedTo?: TeammateId | null;
}

// ── Clarification ───────────────────────────────────────────────────────────

/**
 * One thing Pip needs to know before it can break a capture down honestly.
 *
 * Every option changes the resulting proposal — see `applyAnswers` in
 * `src/data/clarify.ts`. A question whose answers all produced the same
 * breakdown would be a loading screen wearing a conversation's clothes.
 */
export interface ClarifyQuestion {
  id: string;
  sourceId: CaptureId;
  /** Short label for which capture is being discussed. */
  about: string;
  prompt: string;
  options: ClarifyOption[];
}

export interface ClarifyOption {
  id: string;
  label: string;
  /** Pip's acknowledgement — says what this answer changed. */
  reply: string;
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
/** One category's share of the load, ready to render. */
export interface CategoryLoad {
  categoryId: CategoryId;
  /** Points of Pressure this category is carrying. */
  value: number;
  /** Its share of `total`, 0–100. What the bar's width is. */
  share: number;
  /** Open tasks behind it. */
  taskCount: number;
  /** Minutes of outstanding work behind it. */
  minutes: number;
}

/**
 * Pressure, decomposed across the categories the student actually has.
 *
 * The slices always sum to `total`, so this is a genuine breakdown of one
 * number rather than a set of loosely related gauges — which is what makes it
 * safe to show a depleted person. Five figures that add up to something other
 * than the headline is the kind of small dishonesty that costs a wellbeing app
 * all of its credibility at once.
 *
 * Only categories carrying something appear. An empty bar for a category you
 * are not currently carrying is noise, and this screen's whole job is to have
 * none.
 *
 * `hottest` is the category carrying the most, and it is what the Rebalancer
 * reaches for first. Null when nothing is open.
 */
export interface PressureBreakdown {
  total: number;
  /** Descending by value. */
  slices: CategoryLoad[];
  hottest: CategoryId | null;
}

export interface Capacity {
  /** Workload Pressure, 0–100. Higher is worse. */
  pressure: number;
  /** Vitality Reserve, 0–100. Higher is better. */
  vitality: number;
  pressureNote: string;
  vitalityNote: string;
}

/**
 * DERIVED. Where today lands if the day goes to plan.
 *
 * A gauge only says where you are; the question a student actually has at 9am
 * is whether today's plan gets them anywhere. This answers it by running the
 * same pressure and vitality functions over tomorrow morning, with today's
 * scheduled blocks marked done — so the forecast is the promise the timeline is
 * already making, priced.
 */
export interface Forecast {
  pressure: number;
  vitality: number;
  /** Signed change from today's reading. */
  pressureDelta: number;
  vitalityDelta: number;
  /** What the projection assumes, said plainly. */
  note: string;
}

/** One sub-stat, resolved against the user's own model. */
export interface VitalReading {
  id: VitalId;
  label: string;
  value: number;
  /** 0–1. */
  weight: number;
  /** This user's healthy mark for the stat. */
  target: number;
  /** Points this stat puts into the weighted base. */
  contribution: number;
  standing: VitalStanding;
  /** Change since the oldest day in history. */
  delta: number;
  note: string;
}

/**
 * The four things Vitality is actually made of.
 *
 * `pip-product-spec.md` §1: "how much rest and reserve the student has banked
 * (sleep, mood, physical health, social connection)". Vitality is not a
 * measurement of its own — it is these four, weighted. Splitting them out is
 * what lets the app say *why* the reserve moved instead of only that it did.
 */
export type VitalId = 'rest' | 'physical' | 'mood' | 'social';

/** STORED. One sub-stat's current reading. */
export interface Vital {
  id: VitalId;
  label: string;
  /** 0–100. */
  value: number;
  /** The sentence the detail page leads with. */
  note: string;
}

/**
 * How the four sub-stats combine, and what counts as "good" FOR THIS USER.
 *
 * Both halves are personal. Six hours is a catastrophe for one student and
 * normal for another, and someone who recharges alone should not be told their
 * reserve is low because they saw nobody on Tuesday. Shipping one global
 * threshold would make the score confidently wrong for most people.
 *
 * Defaults ship (see `DEFAULT_VITALITY_MODEL`); the spec's weekly calibration
 * pass (§5.3) is what moves them, and nothing here prevents a user editing them
 * directly. STORED, because a calibrated model is a fact about the person.
 */
export interface VitalityModel {
  /** Per-sub-stat weight. Sums to 1. */
  weights: Record<VitalId, number>;
  /** The value this user reads as healthy for each sub-stat. */
  targets: Record<VitalId, number>;
}

/** How a reading sits against this user's own target. */
export type VitalStanding = 'strong' | 'fair' | 'low';

/** STORED. One closed day — what Reflect reads and what the streak counts. */
export interface DayRecord {
  /** ISO date, no time. */
  date: string;
  pressure: number;
  vitality: number;
  tasksCompleted: number;
  state: PipStateName;
  /**
   * That day's four sub-stat readings.
   *
   * Optional because a teammate's shared week deliberately carries none — the
   * delegation screen shows the shape of someone's week, never what their sleep
   * was doing.
   */
  vitals?: Record<VitalId, number>;
}

// ── Teammates ───────────────────────────────────────────────────────────────

/**
 * Someone a step can be delegated to.
 *
 * Deliberately reuses `PipStateName` and `DayRecord` rather than modelling a
 * second, parallel notion of "how someone is doing".
 *
 * PRIVACY. The delegation screen shows the coarse bucket and the *shape* of the
 * last week, never numeric scores or what the person is actually working on —
 * and shows nothing at all for someone who hasn't opted in. Handing work to a
 * teammate should not become a way to surveil them.
 */
export interface Teammate {
  id: TeammateId;
  name: string;
  /** Rendered by `Avatar` when there's no photo. */
  initials: string;
  /** False = hasn't opted into sharing; render no state at all. */
  sharesState: boolean;
  /** Coarse bucket only. Null when `!sharesState`. */
  state: PipStateName | null;
  /** The last 7 closed days, oldest first. Empty when `!sharesState`. */
  week: DayRecord[];
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
  /** The things this student carries. Theirs to add to, rename and retire. */
  categories: Category[];
  tasks: Task[];
  inbox: CaptureNote[];
  teammates: Teammate[];
  vitals: Vital[];
  /** How `vitals` become one Vitality score, calibrated to this user. */
  vitalityModel: VitalityModel;
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
