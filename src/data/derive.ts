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
import { dayOffset, formatEstimate, isOverdue, isToday, startOfDay } from './format';
import { DAY_END_HOUR, DAY_START_HOUR } from './schedule';

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
 * What one open task is costing right now, before it is split by vector.
 *
 * Exported because the Rebalancer prices every lever against exactly this
 * number — if it computed its own, the relief a move promised and the relief
 * the gauge then showed would drift apart, and the app would be caught lying
 * about the one thing it is for.
 */
export function taskPressure(task: Task, now: Date = new Date()): number {
  if (task.status !== 'open') return 0;
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
): number {
  const overdue = openTasks(tasks).filter((t) => isOverdue(t.dueAt, now)).length;
  const finishedToday = completedOn(tasks, now).length;
  return clamp(vitalityBase(vitals, model) - overdue * 8 + finishedToday * 3);
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

function pressureNote(tasks: Task[], pressure: number, now: Date): string {
  const open = openTasks(tasks);
  const overdue = open.filter((t) => isOverdue(t.dueAt, now));
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
  const vitality = deriveVitality(data.tasks, data.vitals, data.vitalityModel, now);
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
  const planned = new Set(plannedToday);
  const stamp = now.toISOString();

  const projected: Task[] = data.tasks.map((task) => {
    if (task.status === 'done') return task;

    if (task.subtasks.length === 0) {
      return planned.has(task.id) ? { ...task, status: 'done', completedAt: stamp } : task;
    }

    const subtasks = task.subtasks.map((s) =>
      !s.done && planned.has(s.id) ? { ...s, done: true, completedAt: stamp } : s,
    );
    const all = subtasks.every((s) => s.done);
    return {
      ...task,
      subtasks,
      status: all ? ('done' as const) : task.status,
      completedAt: all ? stamp : task.completedAt,
    };
  });

  const tomorrow = startOfDay(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(DAY_START_HOUR, 0, 0, 0);

  const pressure = derivePressure(projected, tomorrow);

  // §5.3: "adjusted downward on days the forecast also shows elevated Pressure,
  // since high-pressure days tend to erode reserve if unaddressed".
  const drag = pressure >= 70 ? 6 : pressure >= 50 ? 3 : 0;
  const overdue = openTasks(projected).filter((t) => isOverdue(t.dueAt, tomorrow)).length;
  const cleared = completedOn(projected, now).length;
  const vitality = clamp(
    vitalityBase(data.vitals, data.vitalityModel) - overdue * 8 + cleared * 3 - drag,
  );

  const today = deriveCapacity(data, now);
  const left = [...planned].length;

  return {
    pressure,
    vitality,
    pressureDelta: pressure - today.pressure,
    vitalityDelta: vitality - today.vitality,
    note:
      left === 0
        ? 'Nothing is planned for today, so tomorrow opens where today closes.'
        : 'Assuming you finish today’s plan and your sub-stats hold.',
  };
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

function inRange(task: Task, query: TaskQuery): boolean {
  if (query.range === 'all') return true;
  const anchor = startOfDay(query.anchor);
  // Undated work belongs to no day. It surfaces under "Everything", which is
  // handled above — putting it on today's list instead would quietly make the
  // Manifest a backlog.
  if (!task.dueAt) return false;
  const off = dayOffset(task.dueAt, anchor);
  if (query.range === 'today') return off <= 0; // overdue surfaces on today
  if (query.range === 'tomorrow') return off === 1;
  return off <= 6; // this week
}

/** The one place a task list is filtered and ordered. Every list uses it. */
export function queryTasks(tasks: Task[], query: TaskQuery, now: Date = new Date()): Task[] {
  const filtered = tasks.filter((task) => {
    if (query.hideDone && task.status === 'done') return false;
    if (query.categoryId !== 'all' && task.categoryId !== query.categoryId) return false;
    return inRange(task, query);
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
export function categoryCounts(tasks: Task[], query: TaskQuery): Record<string, number> {
  const counts: Record<string, number> = { all: 0 };
  for (const task of tasks) {
    if (task.status === 'done' && query.hideDone) continue;
    if (!inRange(task, query)) continue;
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
