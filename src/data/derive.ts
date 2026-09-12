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
  DayRecord,
  PipState,
  PipStateName,
  Task,
  TaskQuery,
  Vital,
} from '@/types';
import { dayOffset, formatEstimate, isOverdue, isToday, startOfDay } from './format';

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
 * The anchor the whole pressure model hangs off: eight hours is what one
 * student-day of committed work is measured against. Every "+N% load" chip and
 * the Pressure gauge are the same quantity at different scales, which is why
 * neither is stored — `loadDelta` used to be a field that could say +3% next to
 * an estimate of ninety minutes.
 */
export const DAILY_CAPACITY_MIN = 480;

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
 * Workload Pressure, 0–100. Higher is worse.
 *
 * Sum of each open task's load contribution scaled by urgency. Partial
 * progress counts: a task with 2 of 3 sub-tasks done carries a third of its
 * weight, which is why ticking a sub-task — not just a whole task — visibly
 * relieves pressure.
 */
export function derivePressure(tasks: Task[], now: Date = new Date()): number {
  let total = 0;
  for (const task of openTasks(tasks)) {
    const done = task.subtasks.filter((s) => s.done).length;
    const remaining = task.subtasks.length === 0 ? 1 : 1 - done / task.subtasks.length;
    total += loadPercent(task) * urgency(task, now) * remaining;
  }
  return clamp(total);
}

/**
 * Vitality Reserve, 0–100. Higher is better.
 *
 * Starts from the day's measured vitals (the SCR-07 integrations), then takes
 * the toll of anything overdue and gives back for what has been finished today.
 */
export function deriveVitality(
  tasks: Task[],
  vitals: Vital[],
  now: Date = new Date(),
): number {
  const base =
    vitals.length === 0 ? 70 : vitals.reduce((sum, v) => sum + v.value, 0) / vitals.length;
  const overdue = openTasks(tasks).filter((t) => isOverdue(t.dueAt, now)).length;
  const finishedToday = completedOn(tasks, now).length;
  return clamp(base - overdue * 8 + finishedToday * 3);
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

function vitalityNote(vitals: Vital[], finishedToday: number): string {
  const sleep = vitals.find((v) => v.id === 'sleep');
  if (finishedToday > 0) {
    return `${sleep?.note ?? 'Reserves holding.'} ${finishedToday} finished today.`;
  }
  return sleep?.note ?? 'Reserves holding steady.';
}

export function deriveCapacity(data: AppData, now: Date = new Date()): Capacity {
  const pressure = derivePressure(data.tasks, now);
  const vitality = deriveVitality(data.tasks, data.vitals, now);
  return {
    pressure,
    vitality,
    pressureNote: pressureNote(data.tasks, pressure, now),
    vitalityNote: vitalityNote(data.vitals, completedOn(data.tasks, now).length),
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

  let name: PipStateName = 'balanced';
  if (strain >= 85) name = 'critical';
  else if (strain >= 68) name = 'depleted';
  else if (strain >= 52) name = 'wilting';
  else if (strain >= 36) name = 'strained';

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
    if (query.context !== 'all' && task.context !== query.context) return false;
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

/** Counts for the context filter row's badges. Reflects the active range. */
export function contextCounts(tasks: Task[], query: TaskQuery): Record<string, number> {
  const counts: Record<string, number> = { all: 0 };
  for (const task of tasks) {
    if (task.status === 'done' && query.hideDone) continue;
    if (!inRange(task, query)) continue;
    counts.all += 1;
    counts[task.context] = (counts[task.context] ?? 0) + 1;
  }
  return counts;
}

/** The sub-task a task is actually blocked on — the "Next Action" row. */
export function nextAction(task: Task) {
  return task.subtasks.find((s) => !s.done) ?? null;
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
