/**
 * Derived state. Pure functions, no React, no I/O — every one of these is a
 * function of the stored world plus the current time.
 *
 * This is the file that makes the app behave rather than pose. In the frames,
 * "Workload Pressure 38%" is a label. Here it is what the open task list adds
 * up to, so ticking a checkbox moves the gauge, changes Pip's expression, and
 * can push the streak forward — without a single screen knowing how.
 */
import type {
  AppData,
  Capacity,
  CategoryId,
  CategoryLoad,
  DayRecord,
  Forecast,
  PressureBreakdown,
  PipState,
  PipStateName,
  SubTask,
  Task,
  TaskQuery,
  Vital,
  VitalId,
  VitalReading,
  VitalStanding,
  VitalityModel,
} from '@/types';
import { dayOffset, formatEstimate, isOverdue, isToday, isoDate, startOfDay } from './format';
import { DAY_END_HOUR, DAY_START_HOUR, buildSchedule } from './schedule';

// ── Pressure ────────────────────────────────────────────────────────────────

/**
 * How much a task weighs *right now*. The same task is heavier the closer it
 * is, which is what makes the gauge move over a day even if nothing is ticked.
 */
function urgency(task: Task, now: Date): number {
  if (!task.dueAt) return 0.4;
  const off = dayOffset(task.dueAt, now);
  if (off < 0) return 2.0; // overdue — the heaviest thing a student carries
  if (off === 0) return 1.5;
  if (off === 1) return 1.0;
  if (off <= 6) return 0.7;
  return 0.4;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(v)));

/**
 * A day's workable capacity, in minutes.
 *
 * The anchor the whole pressure model hangs off. It is deliberately the SAME
 * window the scheduler plans into (08:00–22:00), not an eight-hour office day:
 * those were two different numbers for one idea, and the eight-hour reading was
 * the pessimistic one — it called a three-hour task "38% of your day" while the
 * planner cheerfully spread it across fourteen hours of available time. A
 * student's day is not a shift, and a task that fits comfortably inside the
 * plan should not read as though it eats half the day.
 *
 * Deriving it from the schedule constants means the two can never drift apart
 * again: move the window and every "+N% load" chip and the Pressure gauge move
 * with it.
 */
export const DAILY_CAPACITY_MIN = (DAY_END_HOUR - DAY_START_HOUR) * 60;

/** What one task costs as a percentage of the day. The "+N% load" chip. */
export function loadPercent(task: Pick<Task, 'estimateMin'>): number {
  return Math.max(1, Math.round((task.estimateMin / DAILY_CAPACITY_MIN) * 100));
}

export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === 'open');
}

export function completedOn(tasks: Task[], day: Date): Task[] {
  return tasks.filter((t) => t.completedAt && dayOffset(t.completedAt, day) === 0);
}

/**
 * Open work that is past its date, as of `when`.
 *
 * ── Why recovery is excluded ───────────────────────────────────────────────
 *
 * Because a nap you have not taken yet is not a missed deadline.
 *
 * This is not a nicety, it is a bug that was live. Recovery blocks are dated
 * for today so they cannot drift to never; the scheduler fits them into
 * whatever gap is left, and on a full day there is no gap, so the block lands
 * tomorrow morning — past its own date. Every function that counts overdue work
 * then charged the student eight points of reserve for it, which meant the
 * forecast got WORSE the moment somebody agreed to rest. The Rebalancer would
 * propose a walk, the student would accept it, and the days after it would
 * darken.
 *
 * That is the same failure `taskPressure` already refuses — the app must not
 * make resting expensive — and it is worse here, because the penalty landed on
 * the exact number the suggestion promised to raise.
 */
export function overdueCount(tasks: Task[], when: Date): number {
  return openTasks(tasks).filter((t) => !t.recovery && isOverdue(t.dueAt, when)).length;
}

/**
 * What one open task is costing right now, before it is split by vector.
 *
 * Exported because the Rebalancer prices every lever against exactly this
 * number — if it computed its own, the relief a move promised and the relief
 * the gauge then showed would drift apart, and the app would be caught lying
 * about the one thing it is for.
 */
export function taskPressure(task: Task, now: Date = new Date()): number {
  if (task.status !== 'open') return 0;
  /*
   * Recovery is weightless.
   *
   * A recovery block takes real time and is scheduled like any other, so it
   * shows up on the rail and competes for the day — but it must not raise the
   * number the app is asking the student to lower. Otherwise the Rebalancer
   * proposes a nap, the student accepts it, and Pressure goes UP: the app would
   * have made resting expensive, which is the single thing it cannot afford to
   * do.
   */
  if (task.recovery) return 0;
  return loadPercent(task) * urgency(task, now) * remainingShare(task);
}

/**
 * Workload Pressure, decomposed across the user's own categories.
 *
 * A group-by, not a redistribution. Each open task's urgency-scaled cost lands
 * whole in the one category it belongs to, so the breakdown needs no authored
 * weights and cannot be wrong about a task in a way the user could not see and
 * fix — they put it in that category themselves.
 *
 * Partial progress counts: a task with 2 of 3 steps done carries a third of its
 * weight, which is why ticking a *step* — not just a whole task — visibly moves
 * its category's bar.
 *
 * The slices are scaled to sum to the clamped total, with the rounding
 * remainder pushed onto the largest. That invariant is load-bearing: this is
 * shown to someone as an explanation OF the headline number, and slices that
 * add up to something else is the kind of small dishonesty that costs a
 * wellbeing app all of its credibility at once.
 */
export function derivePressureBreakdown(
  tasks: Task[],
  now: Date = new Date(),
): PressureBreakdown {
  const raw = new Map<CategoryId, { value: number; taskCount: number; minutes: number }>();
  let rawTotal = 0;

  for (const task of openTasks(tasks)) {
    const value = taskPressure(task, now);
    const bucket = raw.get(task.categoryId) ?? { value: 0, taskCount: 0, minutes: 0 };
    bucket.value += value;
    bucket.taskCount += 1;
    bucket.minutes += Math.round(task.estimateMin * remainingShare(task));
    raw.set(task.categoryId, bucket);
    rawTotal += value;
  }

  const total = clamp(rawTotal);
  const scale = rawTotal > 0 ? total / rawTotal : 0;

  const slices: CategoryLoad[] = [...raw.entries()]
    .map(([categoryId, bucket]) => ({
      categoryId,
      value: Math.round(bucket.value * scale),
      share: total > 0 ? Math.round((bucket.value * scale * 100) / total) : 0,
      taskCount: bucket.taskCount,
      minutes: bucket.minutes,
    }))
    .sort((a, b) => b.value - a.value || a.categoryId.localeCompare(b.categoryId));

  // Absorb the rounding drift where it is least visible — the largest slice.
  if (slices.length > 0) {
    const rounded = slices.reduce((sum, s) => sum + s.value, 0);
    slices[0].value += total - rounded;
  }

  return { total, slices, hottest: slices[0]?.categoryId ?? null };
}

/**
 * Workload Pressure, 0–100. Higher is worse.
 *
 * Deliberately the roll-up of the breakdown rather than a second sum: one
 * function means the gauge and the five-way readout cannot disagree.
 */
export function derivePressure(tasks: Task[], now: Date = new Date()): number {
  return derivePressureBreakdown(tasks, now).total;
}

/**
 * How much of a task is still the student's to carry, 0–1.
 *
 * Weighted by MINUTES, not by step count: a task whose 90-minute step is
 * outstanding and whose 15-minute one is done is nowhere near half finished,
 * and counting steps equally would say it was. Delegated steps drop out
 * entirely — that is what makes handing work off relieve pressure rather than
 * just relabel it.
 */
function remainingShare(task: Task): number {
  if (task.subtasks.length === 0) return 1;
  let total = 0;
  let mine = 0;
  for (const sub of task.subtasks) {
    const minutes = Math.max(0, sub.estimateMin);
    total += minutes;
    if (!sub.done && !sub.delegatedTo) mine += minutes;
  }
  // Zero-minute steps still represent work; fall back to counting them.
  if (total === 0) {
    const open = task.subtasks.filter((s) => !s.done && !s.delegatedTo).length;
    return open / task.subtasks.length;
  }
  return mine / total;
}

// ── Vitality ────────────────────────────────────────────────────────────────

/**
 * The shipped starting model. Four sub-stats, weighted, with a healthy mark.
 *
 * WEIGHTS. `pip-product-spec.md` §5.2 names exactly two things that accumulate
 * fatigue — `sleep_deficit` and `low_mood_streak` — so rest and mood carry most
 * of the score between them. Physical sits lower because it moves slowly and a
 * missed gym week is not a crisis. Social is lowest but deliberately non-zero:
 * it is the one that decays silently while everything else looks fine, and a
 * weight of zero would make it invisible to the very screen built to explain
 * the reserve.
 *
 * TARGETS. These are the numbers THIS user reads as healthy, and they are the
 * reason a single global threshold would be wrong — six hours wrecks one
 * student and suits another, and someone who recharges alone should not be told
 * their reserve is low because they saw nobody on Tuesday. These are only the
 * defaults everyone starts from; §5.3's weekly calibration is what moves them.
 */
export const DEFAULT_VITALITY_MODEL: VitalityModel = {
  weights: { rest: 0.35, mood: 0.3, physical: 0.2, social: 0.15 },
  targets: { rest: 75, mood: 70, physical: 65, social: 60 },
};

/** Order the four are always shown in — heaviest first. */
export const VITAL_ORDER: VitalId[] = ['rest', 'mood', 'physical', 'social'];

/**
 * The weighted base the reserve is built on, before the day's events.
 *
 * A weighted sum rather than a mean, which is what the old two-vital average
 * was: averaging said a perfect night's sleep could be cancelled by one quiet
 * weekend, and that is not how a reserve behaves.
 */
export function vitalityBase(vitals: Vital[], model: VitalityModel): number {
  if (vitals.length === 0) return 70;
  let total = 0;
  let weight = 0;
  for (const v of vitals) {
    const w = model.weights[v.id] ?? 0;
    total += v.value * w;
    weight += w;
  }
  // Renormalise, so a missing integration scales the rest rather than
  // silently dragging the score toward zero.
  return weight === 0 ? 70 : total / weight;
}

/** Where a reading sits against this user's own mark for that stat. */
export function standingOf(value: number, target: number): VitalStanding {
  if (value >= target) return 'strong';
  if (value >= target - 12) return 'fair';
  return 'low';
}

/**
 * Vitality Reserve, 0–100. Higher is better.
 *
 * The weighted sub-stat base, then the toll of anything overdue and credit for
 * what has been finished today.
 */
export function deriveVitality(
  tasks: Task[],
  vitals: Vital[],
  model: VitalityModel,
  now: Date = new Date(),
  bias = 0,
): number {
  const overdue = overdueCount(tasks, now);
  const finishedToday = completedOn(tasks, now).length;
  return clamp(vitalityBase(vitals, model) - overdue * 8 + finishedToday * 3 + bias);
}

/**
 * The four sub-stats, resolved against the model and the week behind them.
 *
 * Everything the detail page needs to explain itself: what the stat is worth to
 * the score, where it sits against the user's own mark, and which way it has
 * been moving.
 */
export function readVitals(
  vitals: Vital[],
  model: VitalityModel,
  history: DayRecord[],
): VitalReading[] {
  const oldest = history.find((d) => d.vitals != null)?.vitals;

  return VITAL_ORDER.flatMap((id) => {
    const vital = vitals.find((v) => v.id === id);
    if (!vital) return [];
    const weight = model.weights[id] ?? 0;
    const target = model.targets[id] ?? 70;
    return [
      {
        id,
        label: vital.label,
        value: vital.value,
        weight,
        target,
        contribution: Math.round(vital.value * weight),
        standing: standingOf(vital.value, target),
        delta: oldest ? vital.value - oldest[id] : 0,
        note: vital.note,
      },
    ];
  });
}

/** That sub-stat's series across history, with today appended live. */
export function vitalSeries(
  id: VitalId,
  vitals: Vital[],
  history: DayRecord[],
): { date: string; value: number; isToday: boolean }[] {
  const past = history
    .filter((d) => d.vitals != null)
    .map((d) => ({ date: d.date, value: d.vitals![id], isToday: false }));
  const today = vitals.find((v) => v.id === id);
  return today
    ? [...past, { date: new Date().toISOString(), value: today.value, isToday: true }]
    : past;
}

/**
 * Where this sub-stat is heading over the next week.
 *
 * ── What it actually models ────────────────────────────────────────────────
 *
 * Two things, and nothing else:
 *
 *   THE TREND IT IS ALREADY ON, damped. The recent daily slope is carried
 *   forward with each day counting a little less than the last, because trends
 *   flatten — a stat that fell four points a day all week does not fall
 *   twenty-eight more. Undamped extrapolation would have Social Connection at
 *   zero by Friday, which is not a forecast, it is a scare.
 *
 *   WHAT THE STUDENT HAS ALREADY COMMITTED TO. Every open recovery block
 *   aimed at this sub-stat lands on the day it is due and lifts the line by
 *   exactly what it promised. This is the whole reason the projection is worth
 *   drawing: it is the one place the app can show that accepting the run on
 *   Tuesday visibly changes where Sunday lands.
 *
 * ── What it deliberately does not do ───────────────────────────────────────
 *
 * It does not drift toward the target. A model that quietly assumed things get
 * better would draw a recovering line for somebody whose week is not
 * recovering, which is the single most damaging thing a wellbeing forecast can
 * do — it would tell a student in trouble to wait it out.
 */
export function projectVital(
  id: VitalId,
  series: { value: number; isToday: boolean }[],
  tasks: Task[],
  days = 7,
  now: Date = new Date(),
): { date: string; value: number; isToday: boolean; projected: true }[] {
  if (series.length === 0) return [];

  const current = series[series.length - 1].value;

  /*
   * Slope over the recent past, not the whole history.
   *
   * Four days is long enough to be a trend and short enough to still be about
   * this week. Averaging over everything stored would let a good fortnight ago
   * cancel out a bad three days, which is precisely the signal somebody opens
   * this screen to see.
   */
  const window = series.slice(-5);
  const slope =
    window.length >= 2
      ? (window[window.length - 1].value - window[0].value) / (window.length - 1)
      : 0;

  /** Each further day's slope counts less than the last. */
  const DAMPING = 0.75;

  /*
   * Recovery already agreed to, by the day it is due on.
   *
   * Only OPEN blocks count: completing one credits the sub-stat for real
   * (`creditVital`), so a finished nap is already inside `current` and adding it
   * again here would pay for it twice.
   *
   * Anything dated today or earlier is folded onto the first projected day
   * rather than dropped. `buildRecoveryTask` dates every block for today — on
   * purpose, because recovery with no date is recovery that happens after
   * everything else, which means never — so keying strictly on the due date
   * meant the credit landed on a day the projection does not cover, and NOTHING
   * the student accepted ever moved the line. That defeats the one claim this
   * function exists to make: that agreeing to a walk visibly changes where the
   * week ends up.
   */
  const first = startOfDay(now);
  first.setDate(first.getDate() + 1);
  const firstKey = isoDate(first);

  const credit = new Map<string, number>();
  for (const task of tasks) {
    if (task.status !== 'open' || !task.recovery || task.recovery.vitalId !== id) continue;
    if (!task.dueAt) continue;
    const due = isoDate(task.dueAt);
    const key = due < firstKey ? firstKey : due;
    credit.set(key, (credit.get(key) ?? 0) + task.recovery.lift);
  }

  const out: { date: string; value: number; isToday: boolean; projected: true }[] = [];
  let value = current;
  let step = slope;

  for (let d = 1; d <= days; d++) {
    const day = startOfDay(now);
    day.setDate(day.getDate() + d);
    value = clamp(value + step + (credit.get(isoDate(day)) ?? 0));
    step *= DAMPING;
    out.push({ date: day.toISOString(), value, isToday: false, projected: true });
  }

  return out;
}

function pressureNote(tasks: Task[], pressure: number, now: Date): string {
  const open = openTasks(tasks);
  // Recovery excluded here too — a walk that slipped past its slot is not one
  // of the things "carrying most of this", and naming it as overdue would be
  // the gauge scolding somebody for a block it suggested.
  const overdue = open.filter((t) => !t.recovery && isOverdue(t.dueAt, now));
  const dueToday = open.filter((t) => t.dueAt && isToday(t.dueAt, now) && !isOverdue(t.dueAt, now));

  if (overdue.length > 0) {
    return `${overdue.length} overdue ${overdue.length === 1 ? 'item is' : 'items are'} carrying most of this.`;
  }
  if (open.length === 0) return 'Nothing open. Your manifest is clear.';
  if (dueToday.length === 0) {
    return `${open.length} open ${open.length === 1 ? 'task' : 'tasks'}, none due today.`;
  }
  const mins = dueToday.reduce((sum, t) => sum + t.estimateMin, 0);
  const verb = pressure >= 70 ? 'Heavy' : pressure >= 45 ? 'Moderate' : 'Manageable';
  return `${verb} load — ${dueToday.length} due today, about ${formatEstimate(mins)} of work.`;
}

/**
 * The line under the Vitality gauge.
 *
 * Names the sub-stat that is actually holding the score back, measured against
 * this user's own target — which is the whole point of splitting the reserve
 * into four. "Reserves holding steady" told nobody what to do about it.
 */
function vitalityNote(readings: VitalReading[], finishedToday: number): string {
  if (readings.length === 0) return 'No vitals connected yet.';

  const weakest = [...readings].sort((a, b) => a.value - a.target - (b.value - b.target))[0];
  const done = finishedToday > 0 ? ` ${finishedToday} finished today.` : '';

  if (weakest.standing === 'strong') {
    return `All four sub-stats are at or above your marks.${done}`;
  }
  return `${weakest.label} is ${weakest.target - weakest.value} below your ${weakest.target} mark.${done}`;
}

export function deriveCapacity(data: AppData, now: Date = new Date()): Capacity {
  const pressure = derivePressure(data.tasks, now);
  const vitality = deriveVitality(
    data.tasks,
    data.vitals,
    data.vitalityModel,
    now,
    data.calibration?.vitalityBias ?? 0,
  );
  return {
    pressure,
    vitality,
    pressureNote: pressureNote(data.tasks, pressure, now),
    vitalityNote: vitalityNote(
      readVitals(data.vitals, data.vitalityModel, data.history),
      completedOn(data.tasks, now).length,
    ),
  };
}

// ── Forecast ────────────────────────────────────────────────────────────────

/**
 * The task list as it would be with `ids` finished.
 *
 * Pulled out of `forecastAhead` when the calendar needed the same operation for
 * every day of a fortnight rather than once for tomorrow. A task with no steps
 * is completed by its own id; a task whose last outstanding step is in the set
 * closes with it, because a plan that finished every step and left the parent
 * open would have the calendar quietly carrying a task the student can see is
 * done.
 */
export function markDone(tasks: Task[], ids: Iterable<string>, stamp: string): Task[] {
  const done = new Set(ids);

  return tasks.map((task) => {
    if (task.status === 'done') return task;

    if (task.subtasks.length === 0) {
      return done.has(task.id) ? { ...task, status: 'done' as const, completedAt: stamp } : task;
    }

    const subtasks = task.subtasks.map((s) =>
      !s.done && done.has(s.id) ? { ...s, done: true, completedAt: stamp } : s,
    );
    const all = subtasks.every((s) => s.done);
    return {
      ...task,
      subtasks,
      status: all ? ('done' as const) : task.status,
      completedAt: all ? stamp : task.completedAt,
    };
  });
}

/**
 * Where tomorrow lands if today goes to plan.
 *
 * A gauge says where you are. The question a student has at 9am is whether
 * today's list gets them anywhere, and the only honest way to answer it is to
 * run the same two functions over tomorrow morning with today's scheduled work
 * marked done — so the forecast is exactly the promise the timeline is already
 * making, priced. `plannedToday` is the set of step ids the schedule puts on
 * today (a step-less task contributes its own id).
 *
 * Vitality carries the day's completion credit forward rather than resetting it
 * at midnight: clearing the decks today genuinely leaves you better placed
 * tomorrow, and a model that dropped the credit would show a productive day as
 * a *fall* in reserve, which is both wrong and a terrible thing to tell someone.
 */
export function forecastAhead(
  data: AppData,
  plannedToday: Iterable<string>,
  now: Date = new Date(),
): Forecast {
  const projected = markDone(data.tasks, plannedToday, now.toISOString());

  const tomorrow = startOfDay(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(DAY_START_HOUR, 0, 0, 0);

  const pressure = derivePressure(projected, tomorrow);

  // §5.3: "adjusted downward on days the forecast also shows elevated Pressure,
  // since high-pressure days tend to erode reserve if unaddressed".
  const drag = pressure >= 70 ? 6 : pressure >= 50 ? 3 : 0;
  const overdue = overdueCount(projected, tomorrow);
  const cleared = completedOn(projected, now).length;
  // The learned bias travels with the projection. A forecast built on the raw
  // model while the gauge above it shows the calibrated one would have the two
  // numbers disagreeing by exactly the amount the app claims to have learned.
  const vitality = clamp(
    vitalityBase(data.vitals, data.vitalityModel) -
      overdue * 8 +
      cleared * 3 -
      drag +
      (data.calibration?.vitalityBias ?? 0),
  );

  const today = deriveCapacity(data, now);

  return {
    pressure,
    vitality,
    pressureDelta: pressure - today.pressure,
    vitalityDelta: vitality - today.vitality,
  };
}

// ── The calendar ────────────────────────────────────────────────────────────

/**
 * One square on the calendar.
 *
 * `known` is the field that keeps this honest. A month grid has thirty-one
 * cells and this app has never had thirty-one days of anything, so most of the
 * squares behind today are simply blank — and a calendar that filled them with
 * a plausible-looking number would be fabricating a past the student could not
 * remember disagreeing with.
 */
export interface DayOutlook {
  /** ISO date, no time. The key the grid looks up by. */
  date: string;
  pressure: number;
  vitality: number;
  state: PipStateName;
  /** There is a reading for this day at all. False for unrecorded past days. */
  known: boolean;
  /** It happened: a closed day out of history, or today's live reading. */
  actual: boolean;
  today: boolean;
  /** Blocks the plan puts on that day, and the student's own minutes in them. */
  blocks: number;
  plannedMin: number;
  /** How many of those blocks are recovery rather than work. */
  recoveryBlocks: number;
  /** Tasks whose deadline lands on that day. */
  dueCount: number;
  /** Closed days only — what history recorded. */
  tasksCompleted: number;
}

/**
 * Every day the app has an opinion about, backwards and forwards.
 *
 * ── Why a calendar, and why this shape ─────────────────────────────────────
 *
 * The tab this replaced plotted the last seven days as bars. It was honest and
 * it answered a question nobody was asking: a student does not open a wellbeing
 * app to find out that Tuesday was worse than Monday, they open it to find out
 * which day this week is going to hurt. The whole model is already forward
 * looking — the scheduler knows what lands when, `projectVital` knows where the
 * reserve is heading — and none of that was ever drawn on a date.
 *
 * So the same two numbers are now shown on a grid of days, past and future in
 * one surface, with the line between them marked rather than hidden. Which is
 * the second reason for the shape: the only dishonest way to draw this would be
 * to make a forecast look like a record. `actual` is what the cell needs to
 * render the difference, and the screen is required to use it.
 *
 * ── How the forward days are computed ──────────────────────────────────────
 *
 * Not extrapolated. Walked.
 *
 * PRESSURE: for each day ahead, everything the scheduler placed on an EARLIER
 * day is marked done, and the real `derivePressure` is run against that list at
 * that day's 8am. So the line falls as planned work is assumed completed and
 * rises as untouched deadlines close in — both of which are facts about the
 * student's actual plan, not a trend fitted to the last few days.
 *
 * VITALITY: each sub-stat is projected by `projectVital` — the same function
 * the sub-stat pages draw, including the lift from recovery blocks already
 * accepted — and the four are recombined through the user's own weights, minus
 * the toll of anything still overdue on that day, minus the same high-pressure
 * drag `forecastAhead` applies, plus whatever the check-ins have taught the
 * model. It is the existing machinery on a date axis, not a second model.
 *
 * The consequence worth having: accept a run on Thursday and Thursday's square
 * changes colour. That is the app showing its own advice working, on the
 * surface where the student is looking for the bad day.
 */
/**
 * How far ahead the app is willing to claim anything.
 *
 * Three weeks. The scheduler only plans seven days, `projectVital` damps its
 * slope to nothing not long after that, and past about a fortnight the honest
 * description of any of these numbers is "we do not know". A calendar can be
 * scrolled to next March; the readings must stop well before the scrolling
 * does, and a blank square is the correct thing to show beyond here — an app
 * that will draw you a pressure figure for a day five weeks out is one that
 * will draw you anything.
 */
export const FORECAST_DAYS = 21;

export function outlook(
  data: AppData,
  now: Date = new Date(),
  window: { back?: number; forward?: number } = {},
): DayOutlook[] {
  const back = window.back ?? 31;
  const forward = window.forward ?? 31;
  const bias = data.calibration?.vitalityBias ?? 0;

  // What the plan puts on each day, from the one schedule the app reads.
  const schedule = buildSchedule(data.tasks, now);
  const recovery = new Set(data.tasks.filter((t) => t.recovery).map((t) => t.id));
  const byDay = new Map<string, { ids: string[]; blocks: number; minutes: number; rest: number }>();
  for (const slot of schedule.values()) {
    if (!slot.startAt) continue;
    const key = isoDate(slot.startAt);
    const day = byDay.get(key) ?? { ids: [], blocks: 0, minutes: 0, rest: 0 };
    day.ids.push(slot.subId);
    day.blocks += 1;
    if (!slot.delegatedTo) day.minutes += slot.estimateMin;
    if (recovery.has(slot.taskId)) day.rest += 1;
    byDay.set(key, day);
  }

  const due = new Map<string, number>();
  for (const task of openTasks(data.tasks)) {
    if (!task.dueAt) continue;
    const key = isoDate(task.dueAt);
    due.set(key, (due.get(key) ?? 0) + 1);
  }

  // Each sub-stat's own forward line, keyed by the day it lands on.
  const projected = new Map<VitalId, Map<string, number>>();
  for (const id of VITAL_ORDER) {
    const line = projectVital(
      id,
      vitalSeries(id, data.vitals, data.history),
      data.tasks,
      Math.min(forward, FORECAST_DAYS),
      now,
    );
    projected.set(id, new Map(line.map((d) => [isoDate(d.date), d.value])));
  }

  const history = new Map(data.history.map((d) => [isoDate(d.date), d]));
  const today = deriveCapacity(data, now);
  const out: DayOutlook[] = [];

  // ── Behind ────────────────────────────────────────────────────────────────
  for (let d = back; d >= 1; d--) {
    const day = startOfDay(now);
    day.setDate(day.getDate() - d);
    const key = isoDate(day);
    const record = history.get(key);

    out.push({
      date: key,
      pressure: record?.pressure ?? 0,
      vitality: record?.vitality ?? 0,
      state: record?.state ?? 'balanced',
      known: record != null,
      actual: true,
      today: false,
      blocks: 0,
      plannedMin: 0,
      recoveryBlocks: 0,
      dueCount: 0,
      tasksCompleted: record?.tasksCompleted ?? 0,
    });
  }

  // ── Today ─────────────────────────────────────────────────────────────────
  const todayKey = isoDate(now);
  const todayLoad = byDay.get(todayKey);
  out.push({
    date: todayKey,
    pressure: today.pressure,
    vitality: today.vitality,
    state: derivePipState(today).name,
    known: true,
    actual: true,
    today: true,
    blocks: todayLoad?.blocks ?? 0,
    plannedMin: todayLoad?.minutes ?? 0,
    recoveryBlocks: todayLoad?.rest ?? 0,
    dueCount: due.get(todayKey) ?? 0,
    tasksCompleted: completedOn(data.tasks, now).length,
  });

  // ── Ahead ─────────────────────────────────────────────────────────────────
  /*
   * Carried forward, day by day.
   *
   * `finished` accumulates every block the schedule placed on a day already
   * walked past, which is what makes the forward line a consequence of the
   * plan rather than a curve. Delegated blocks are included: they are going to
   * be done, just not by the student, and the pressure model has already
   * stopped counting them as theirs.
   */
  const finished: string[] = [...(todayLoad?.ids ?? [])];
  const stamp = now.toISOString();

  for (let d = 1; d <= forward; d++) {
    const day = startOfDay(now);
    day.setDate(day.getDate() + d);
    const key = isoDate(day);

    // Past the horizon the grid still needs its squares, but they are blanks.
    if (d > FORECAST_DAYS) {
      out.push({
        date: key,
        pressure: 0,
        vitality: 0,
        state: 'balanced',
        known: false,
        actual: false,
        today: false,
        blocks: 0,
        plannedMin: 0,
        recoveryBlocks: 0,
        dueCount: due.get(key) ?? 0,
        tasksCompleted: 0,
      });
      continue;
    }

    const morning = new Date(day);
    morning.setHours(DAY_START_HOUR, 0, 0, 0);

    const tasks = markDone(data.tasks, finished, stamp);
    const pressure = derivePressure(tasks, morning);

    const vitals: Vital[] = data.vitals.map((v) => ({
      ...v,
      value: projected.get(v.id)?.get(key) ?? v.value,
    }));
    const overdue = overdueCount(tasks, morning);
    // §5.3's drag, and the same thresholds `forecastAhead` uses — a heavy day
    // erodes the reserve, and the two forward-looking functions in this file
    // must not disagree about by how much.
    const drag = pressure >= 70 ? 6 : pressure >= 50 ? 3 : 0;
    const vitality = clamp(
      vitalityBase(vitals, data.vitalityModel) - overdue * 8 - drag + bias,
    );

    const load = byDay.get(key);
    out.push({
      date: key,
      pressure,
      vitality,
      state: derivePipState({ pressure, vitality, pressureNote: '', vitalityNote: '' }).name,
      known: true,
      actual: false,
      today: false,
      blocks: load?.blocks ?? 0,
      plannedMin: load?.minutes ?? 0,
      recoveryBlocks: load?.rest ?? 0,
      dueCount: due.get(key) ?? 0,
      tasksCompleted: 0,
    });

    if (load) finished.push(...load.ids);
  }

  return out;
}

// ── Pip's state ─────────────────────────────────────────────────────────────

const BLURBS: Record<PipStateName, { label: string; blurb: string }> = {
  balanced: {
    label: 'Balanced',
    blurb: 'Pip feels steady today. Your workloads and vitality are in healthy equilibrium.',
  },
  strained: {
    label: 'Strained',
    blurb: 'Pip is leaning into the load. Still fine — but the margin is thinner than usual.',
  },
  wilting: {
    label: 'Wilting',
    blurb: "Pip's drooping a little. Clearing one thing, or resting, would both help.",
  },
  depleted: {
    label: 'Depleted',
    blurb: 'Pip has run down. The pile is bigger than the reserves right now.',
  },
  critical: {
    label: 'Critical',
    blurb: "Pip can't carry this. Something needs to move or wait — and that's allowed.",
  },
};

/**
 * The single mapping from capacity to Pip. Both axes matter: high pressure is
 * survivable on full reserves, and low pressure still wilts on empty ones.
 */
export function derivePipState({ pressure, vitality }: Capacity): PipState {
  const strain = pressure - (vitality - 50) * 0.6;

  // Wider bands than the first cut, which tipped into Strained at a third of a
  // planned day and into Wilting at half. An app whose whole premise is that it
  // will not alarm you cannot open at amber for an ordinary week — if every
  // state above Balanced is the normal state, the mascot has stopped carrying
  // information. Balanced now covers a week that is genuinely under control,
  // and the upper bands are reserved for a week that is not.
  let name: PipStateName = 'balanced';
  if (strain >= 90) name = 'critical';
  else if (strain >= 75) name = 'depleted';
  else if (strain >= 58) name = 'wilting';
  else if (strain >= 42) name = 'strained';

  return { name, ...BLURBS[name] };
}

// ── Streak ──────────────────────────────────────────────────────────────────

/**
 * Consecutive balanced days ending yesterday, plus today if today is balanced.
 * Reads closed days out of history rather than storing a counter, so it cannot
 * drift out of sync with the record it claims to summarise.
 */
export function deriveStreak(history: DayRecord[], todayState: PipStateName): number {
  const closed = [...history].sort((a, b) => (a.date < b.date ? 1 : -1));
  let streak = todayState === 'balanced' ? 1 : 0;
  if (todayState !== 'balanced') return 0;
  for (const day of closed) {
    if (day.state !== 'balanced') break;
    streak += 1;
  }
  return streak;
}

// ── Task querying ───────────────────────────────────────────────────────────

const LOAD_ORDER = { high: 0, medium: 1, low: 2 } as const;

function inRange(task: Task, query: TaskQuery, now: Date): boolean {
  if (query.range === 'all') return true;

  /*
   * Overdue is measured against the CLOCK, not against the day being browsed.
   *
   * Every other range answers "what belongs to this day?" and moves as the
   * student pages back and forth through the strip. This one answers "what am I
   * behind on?", which has exactly one true answer regardless of which day they
   * happen to be looking at — paging to last Tuesday must not change what
   * counts as late.
   */
  if (query.range === 'overdue') {
    return task.status === 'open' && isOverdue(task.dueAt, now);
  }

  const anchor = startOfDay(query.anchor);
  // Undated work belongs to no day. It surfaces under "Everything", which is
  // handled above — putting it on today's list instead would quietly make the
  // Manifest a backlog.
  if (!task.dueAt) return false;
  const off = dayOffset(task.dueAt, anchor);
  /*
   * Today no longer swallows the backlog.
   *
   * This used to be `off <= 0` — "overdue surfaces on today" — which was the
   * right call when the rest of the app also folded late work into today. It no
   * longer does: the scheduler refuses to plan overdue work and Today's Focus
   * does not show it, so leaving it in this list would make the Manifest the
   * one place still quietly mixing "due today" with "already missed". They are
   * different problems and now have different tabs.
   */
  if (query.range === 'today') return off === 0;
  if (query.range === 'tomorrow') return off === 1;
  return off >= 0 && off <= 6; // this week
}

/** The one place a task list is filtered and ordered. Every list uses it. */
export function queryTasks(tasks: Task[], query: TaskQuery, now: Date = new Date()): Task[] {
  const filtered = tasks.filter((task) => {
    if (query.hideDone && task.status === 'done') return false;
    if (query.categoryId !== 'all' && task.categoryId !== query.categoryId) return false;
    return inRange(task, query, now);
  });

  return filtered.sort((a, b) => {
    // Done always sinks, whatever the sort.
    if (a.status !== b.status) return a.status === 'done' ? 1 : -1;
    if (query.sort === 'load') return LOAD_ORDER[a.load] - LOAD_ORDER[b.load];
    if (query.sort === 'created') return a.createdAt < b.createdAt ? 1 : -1;
    // 'due' — undated sink below dated.
    if (!a.dueAt) return b.dueAt ? 1 : 0;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}

/** Counts for the category filter row's badges. Reflects the active range. */
export function categoryCounts(
  tasks: Task[],
  query: TaskQuery,
  now: Date = new Date(),
): Record<string, number> {
  const counts: Record<string, number> = { all: 0 };
  for (const task of tasks) {
    if (task.status === 'done' && query.hideDone) continue;
    if (!inRange(task, query, now)) continue;
    counts.all += 1;
    counts[task.categoryId] = (counts[task.categoryId] ?? 0) + 1;
  }
  return counts;
}

// ── Sub-task dependencies ───────────────────────────────────────────────────

/** The unfinished steps `sub` is waiting on. Empty means it can be started. */
export function blockers(task: Task, sub: SubTask): SubTask[] {
  if (sub.dependsOn.length === 0) return [];
  return task.subtasks.filter((s) => sub.dependsOn.includes(s.id) && !s.done);
}

/** A step is blocked while any dependency is still open. */
export function isBlocked(task: Task, sub: SubTask): boolean {
  return blockers(task, sub).length > 0;
}

/**
 * The step the student can actually start next — the "Next Action" row.
 *
 * Not merely the first unticked one: a step whose prerequisites are unfinished
 * is not startable, and one handed to a teammate is not the student's to do.
 * Pointing the row at either would be advice the user cannot act on.
 *
 * Returns null when everything open is blocked or delegated, which callers
 * already handle by rendering no row.
 */
export function nextAction(task: Task) {
  return (
    task.subtasks.find((s) => !s.done && !s.delegatedTo && !isBlocked(task, s)) ?? null
  );
}

export function progress(task: Task): { done: number; total: number; pct: number } {
  const total = task.subtasks.length;
  const done = task.subtasks.filter((s) => s.done).length;
  return { done, total, pct: total === 0 ? (task.status === 'done' ? 100 : 0) : (done / total) * 100 };
}

/**
 * What committing the review would do to pressure — the SCR-21 budget line.
 * Computed by running the real pressure function over a hypothetical list,
 * so the number the sheet promises is the number the user then gets.
 */
export function budgetAfter(
  tasks: Task[],
  incoming: Task[],
  now: Date = new Date(),
): { before: number; after: number; remaining: number } {
  const before = derivePressure(tasks, now);
  const after = derivePressure([...tasks, ...incoming], now);
  return { before, after, remaining: Math.max(0, 100 - after) };
}
