/**
 * When each step happens.
 *
 * `derive.ts` answers "how much is on your plate"; this file answers "and when
 * are you doing it". A task's `dueAt` is the date everything under it must be
 * finished by — it is a deadline, not a plan — so the plan has to be built.
 *
 * DERIVED, NOT STORED. Same rule the rest of the domain follows: a stored
 * `scheduledAt` on every step would be a lie the moment one of them finished
 * early, and nothing would ever reconcile it. The schedule is a pure function
 * of the open task list plus the clock, so ticking a step at 10:20 slides the
 * afternoon up in the same frame.
 *
 * The one thing that IS stored is `SubTask.completedAt`, because when a step
 * actually got done is a fact about the past that no amount of recomputation
 * can recover.
 */
import type { ProposedTask, SubTask, SubTaskId, Task, TaskId, TeammateId } from '@/types';
import { dayOffset, isoDate, startOfDay } from './format';

// ── The shape of a day ──────────────────────────────────────────────────────

/** First hour a block may start. */
export const DAY_START_HOUR = 8;
/** Last hour a block may run to. Nothing is scheduled past this. */
export const DAY_END_HOUR = 22;
/** Breathing room between consecutive blocks. Nobody context-switches instantly. */
export const BLOCK_GAP_MIN = 10;
/** Blocks snap to this grid, so the rail reads in round numbers. */
export const SLOT_MIN = 5;
/** How far ahead undated work is spread. */
export const DEFAULT_HORIZON_DAYS = 7;

/** Stops a pathological graph from walking the calendar forever. */
const MAX_DAYS = 60;

const MS_MIN = 60_000;
const WINDOW_MIN = (DAY_END_HOUR - DAY_START_HOUR) * 60;

// ── Output ──────────────────────────────────────────────────────────────────

/**
 * One step, placed.
 *
 * `startAt` / `endAt` are nullable for exactly one case: a step that is already
 * done but was ticked before `completedAt` existed (or by a bulk parent
 * complete). It still belongs on the rail — it just has no clock to show.
 */
export interface Slot {
  taskId: TaskId;
  /** For a task with no steps this is the task's own id — see `synthetic`. */
  subId: SubTaskId;
  title: string;
  taskTitle: string;
  estimateMin: number;
  startAt: string | null;
  endAt: string | null;
  done: boolean;
  delegatedTo: TeammateId | null;
  /** Waiting on unfinished work — renders the lock treatment. */
  blocked: boolean;
  /** The plan runs past the parent's deadline. The honest over-commitment signal. */
  late: boolean;
  /** The parent task has no steps, so the whole task is one block. */
  synthetic: boolean;
}

export type Schedule = Map<string, Slot>;

// ── Internals ───────────────────────────────────────────────────────────────

interface Unit {
  taskId: TaskId;
  subId: string;
  title: string;
  taskTitle: string;
  estimateMin: number;
  dependsOn: string[];
  delegatedTo: TeammateId | null;
  synthetic: boolean;
  /** Parent's deadline, as ms. Infinity when undated — sorts last. */
  due: number;
  /** Longest dependency chain behind this step. Keeps siblings in order. */
  depth: number;
  /** Authored position, the final tie-break. */
  index: number;
  /** Any dependency still unfinished — drives the lock treatment. */
  blocked: boolean;
}

const ceilTo = (ms: number, minutes: number) => Math.ceil(ms / (minutes * MS_MIN)) * (minutes * MS_MIN);

function dayWindow(day: Date): { start: number; end: number } {
  const s = startOfDay(day);
  s.setHours(DAY_START_HOUR, 0, 0, 0);
  const e = startOfDay(day);
  e.setHours(DAY_END_HOUR, 0, 0, 0);
  return { start: s.getTime(), end: e.getTime() };
}

/** Longest chain behind `sub`, memoised. Edges only ever point at siblings. */
function depthOf(sub: SubTask, byId: Map<string, SubTask>, memo: Map<string, number>): number {
  const seen = memo.get(sub.id);
  if (seen != null) return seen;
  // Written before recursing so a malformed cycle terminates at 0 rather than
  // blowing the stack. The add-step flow cannot author one, but seed data and a
  // future reorder feature could.
  memo.set(sub.id, 0);
  let best = 0;
  for (const id of sub.dependsOn) {
    const parent = byId.get(id);
    if (parent) best = Math.max(best, depthOf(parent, byId, memo) + 1);
  }
  memo.set(sub.id, best);
  return best;
}

/**
 * A finished step's block, reconstructed backwards from when it was ticked.
 *
 * Reading "9:00 – 9:45 ✓" is the point of keeping done work on the rail: the
 * day should show what the day actually was, not just what is left of it.
 */
function doneSlot(task: Task, sub: SubTask): Slot {
  const at = sub.completedAt ? new Date(sub.completedAt).getTime() : null;
  return {
    taskId: task.id,
    subId: sub.id,
    title: sub.title,
    taskTitle: task.title,
    estimateMin: sub.estimateMin,
    startAt: at == null ? null : new Date(at - sub.estimateMin * MS_MIN).toISOString(),
    endAt: at == null ? null : new Date(at).toISOString(),
    done: true,
    delegatedTo: sub.delegatedTo ?? null,
    blocked: false,
    late: false,
    synthetic: false,
  };
}

// ── The scheduler ───────────────────────────────────────────────────────────

/**
 * Place every outstanding step on the calendar.
 *
 * Deadline-aware greedy list scheduling, global across tasks — the whole point
 * is that the club poster and the midterm revision have to share a Tuesday.
 *
 * Work is SPREAD toward its deadline rather than packed as early as possible.
 * Packing forward would put ten hours into today and make every due date
 * decorative; instead each task gets a per-day share of `remaining / days left`,
 * recomputed every morning so slipping a day re-tightens the rest of the plan.
 */
export function buildSchedule(tasks: Task[], now: Date = new Date()): Schedule {
  const slots: Schedule = new Map();
  const units: Unit[] = [];
  /** subId → the ms instant its dependents may start after. */
  const endOf = new Map<string, number>();

  for (const task of tasks) {
    const due = task.dueAt ? new Date(task.dueAt).getTime() : Infinity;

    // A task with no steps is still a thing that takes time, and Today's rail
    // would simply lose it otherwise — see the two-minute errand in the seed.
    if (task.subtasks.length === 0) {
      if (task.status === 'done') {
        slots.set(task.id, {
          taskId: task.id,
          subId: task.id,
          title: task.title,
          taskTitle: task.title,
          estimateMin: task.estimateMin,
          startAt: task.completedAt
            ? new Date(new Date(task.completedAt).getTime() - task.estimateMin * MS_MIN).toISOString()
            : null,
          endAt: task.completedAt,
          done: true,
          delegatedTo: null,
          blocked: false,
          late: false,
          synthetic: true,
        });
        continue;
      }
      units.push({
        taskId: task.id,
        subId: task.id,
        title: task.title,
        taskTitle: task.title,
        estimateMin: Math.max(SLOT_MIN, task.estimateMin),
        dependsOn: [],
        delegatedTo: null,
        synthetic: true,
        due,
        depth: 0,
        index: 0,
        blocked: false,
      });
      continue;
    }

    const byId = new Map(task.subtasks.map((s) => [s.id, s]));
    const memo = new Map<string, number>();

    task.subtasks.forEach((sub, index) => {
      if (sub.done) {
        const slot = doneSlot(task, sub);
        slots.set(sub.id, slot);
        // A finished prerequisite stops constraining anything: its dependents
        // are free from now on, whenever it was actually ticked.
        endOf.set(sub.id, slot.endAt ? new Date(slot.endAt).getTime() : 0);
        return;
      }
      units.push({
        taskId: task.id,
        subId: sub.id,
        title: sub.title,
        taskTitle: task.title,
        estimateMin: Math.max(SLOT_MIN, sub.estimateMin),
        dependsOn: sub.dependsOn,
        delegatedTo: sub.delegatedTo ?? null,
        synthetic: false,
        due,
        depth: depthOf(sub, byId, memo),
        index,
        blocked: sub.dependsOn.some((id) => !byId.get(id)?.done),
      });
    });
  }

  if (units.length === 0) return slots;

  const pending = new Set(units);
  /**
   * taskId → the student's OWN minutes still to place. Drives the per-day share.
   *
   * Delegated minutes are excluded: they are not hours this student has to find
   * in a day, so letting them inflate the share would shrink everything else's.
   */
  const remaining = new Map<TaskId, number>();
  for (const u of units) {
    if (u.delegatedTo) continue;
    remaining.set(u.taskId, (remaining.get(u.taskId) ?? 0) + u.estimateMin);
  }

  let day = startOfDay(now);
  // Today starts wherever the student actually is, not at 08:00 — a plan that
  // opens with two blocks already in the past is not a plan.
  let cursor = Math.max(ceilTo(now.getTime(), SLOT_MIN), dayWindow(day).start);

  for (let d = 0; d < MAX_DAYS && pending.size > 0; d++) {
    const { end: dayEnd } = dayWindow(day);

    // Each task's share of THIS day. Recomputed every morning, so a day that
    // ran short quietly raises tomorrow's share instead of silently slipping.
    const perDay = new Map<TaskId, number>();
    for (const u of pending) {
      if (perDay.has(u.taskId)) continue;
      const daysLeft =
        u.due === Infinity
          ? Math.max(1, DEFAULT_HORIZON_DAYS - d)
          : Math.max(1, dayOffset(new Date(u.due), day) + 1);
      perDay.set(u.taskId, Math.ceil((remaining.get(u.taskId) ?? 0) / daysLeft));
    }

    const spent = new Map<TaskId, number>();
    /**
     * Handed-off work runs on its own clock.
     *
     * A delegated block still belongs on the rail — you want to see that Arif
     * has the API section today — but it is not an hour of the student's day,
     * so it cannot share the student's cursor or it would either eat the day or
     * draw on top of the block that follows it.
     */
    let handoff = Math.max(dayWindow(day).start, d === 0 ? ceilTo(now.getTime(), SLOT_MIN) : 0);

    // Fill the day until nothing ready both fits and is still within its share.
    for (;;) {
      const ready = [...pending]
        .filter((u) => u.dependsOn.every((dep) => endOf.has(dep)))
        .sort((a, b) => a.due - b.due || a.depth - b.depth || a.index - b.index);

      let placedOne = false;

      for (const unit of ready) {
        /*
         * The day-share gate.
         *
         * Blocks are atomic, so a task's share can only ever be respected
         * approximately — the escape hatch is that a task which has done
         * NOTHING today always gets its next block, however long. Without it a
         * 90-minute step whose share is 30 minutes would never be placed at
         * all; without the gate, one task would eat the whole day and the
         * spread this scheduler exists for would not happen.
         */
        const handedOff = unit.delegatedTo != null;
        const spentSoFar = spent.get(unit.taskId) ?? 0;
        const share = perDay.get(unit.taskId) ?? Infinity;
        if (!handedOff && spentSoFar > 0 && spentSoFar + unit.estimateMin > share) continue;

        const depEnd = unit.dependsOn.reduce(
          (max, dep) => Math.max(max, (endOf.get(dep) ?? 0) + BLOCK_GAP_MIN * MS_MIN),
          0,
        );
        const start = ceilTo(Math.max(handedOff ? handoff : cursor, depEnd), SLOT_MIN);
        const finish = start + unit.estimateMin * MS_MIN;

        // Blocks are atomic — a 90-minute step is not two 45-minute ones. If it
        // does not fit before 22:00 it rolls whole to tomorrow, unless it is
        // longer than any day, in which case it has to overflow somewhere.
        if (finish > dayEnd && unit.estimateMin <= WINDOW_MIN) continue;

        slots.set(unit.subId, {
          taskId: unit.taskId,
          subId: unit.subId,
          title: unit.title,
          taskTitle: unit.taskTitle,
          estimateMin: unit.estimateMin,
          startAt: new Date(start).toISOString(),
          endAt: new Date(finish).toISOString(),
          done: false,
          delegatedTo: unit.delegatedTo,
          blocked: unit.blocked,
          late: unit.due !== Infinity && finish > unit.due,
          synthetic: unit.synthetic,
        });

        pending.delete(unit);

        if (handedOff) {
          /*
           * You get handed-off work back the NEXT day, not ten minutes later.
           *
           * The block ends when Arif's block ends, but what gates its dependents
           * is the end of his day — scheduling the merge for 12:00 because the
           * hand-off "finished" at 11:50 would be a plan built on someone else
           * dropping everything, which is exactly the promise this app should
           * not quietly make on a teammate's behalf.
           */
          endOf.set(unit.subId, dayEnd);
          handoff = finish + BLOCK_GAP_MIN * MS_MIN;
        } else {
          endOf.set(unit.subId, finish);
          cursor = finish + BLOCK_GAP_MIN * MS_MIN;
          spent.set(unit.taskId, (spent.get(unit.taskId) ?? 0) + unit.estimateMin);
          remaining.set(unit.taskId, (remaining.get(unit.taskId) ?? 0) - unit.estimateMin);
        }

        placedOne = true;
        break;
      }

      if (!placedOne) break;
    }

    day = new Date(day);
    day.setDate(day.getDate() + 1);
    cursor = dayWindow(day).start;
  }

  // Anything the guard cut off still has to render. Undated rather than
  // invented: a block with no time says "not planned yet", which is true.
  for (const unit of pending) {
    slots.set(unit.subId, {
      taskId: unit.taskId,
      subId: unit.subId,
      title: unit.title,
      taskTitle: unit.taskTitle,
      estimateMin: unit.estimateMin,
      startAt: null,
      endAt: null,
      done: false,
      delegatedTo: unit.delegatedTo,
      blocked: unit.blocked,
      late: false,
      synthetic: unit.synthetic,
    });
  }

  return slots;
}

// ── Reading the schedule ────────────────────────────────────────────────────

/** Slots for one task, in plan order. Undated blocks sink to the bottom. */
export function taskSlots(task: Task, schedule: Schedule): Slot[] {
  const ids = task.subtasks.length === 0 ? [task.id] : task.subtasks.map((s) => s.id);
  return ids
    .map((id) => schedule.get(id))
    .filter((s): s is Slot => s != null)
    .sort(compareSlots);
}

/** Every block that touches `day`, across every task. Today's Focus. */
export function slotsOn(schedule: Schedule, day: Date): Slot[] {
  const key = isoDate(day);
  return [...schedule.values()]
    .filter((s) => s.startAt != null && isoDate(s.startAt) === key)
    .sort(compareSlots);
}

/** Chronological, with unplanned blocks last. */
export function compareSlots(a: Slot, b: Slot): number {
  if (a.startAt == null) return b.startAt == null ? 0 : 1;
  if (b.startAt == null) return -1;
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}

export interface DayGroup {
  /** ISO date, no time. */
  date: string;
  slots: Slot[];
  /** Minutes of the student's own work — delegated blocks excluded. */
  totalMin: number;
}

/** Split a run of slots into day sections for the rail's headings. */
export function groupByDay(slots: Slot[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  const unplanned: Slot[] = [];

  for (const slot of [...slots].sort(compareSlots)) {
    if (slot.startAt == null) {
      unplanned.push(slot);
      continue;
    }
    const date = isoDate(slot.startAt);
    const group = groups.get(date) ?? { date, slots: [], totalMin: 0 };
    group.slots.push(slot);
    if (!slot.delegatedTo) group.totalMin += slot.estimateMin;
    groups.set(date, group);
  }

  const out = [...groups.values()];
  if (unplanned.length > 0) out.push({ date: '', slots: unplanned, totalMin: 0 });
  return out;
}

/**
 * What a day's rail adds up to, for the line under Today's Focus.
 *
 * Deliberately only what is PLANNED, with no "x left to go". The app does not
 * set a daily quota, so a remaining figure would be a target nobody agreed to —
 * and counting down against a budget that does not exist is exactly the anxious
 * framing the timeline is supposed to replace. Delegated blocks are excluded:
 * they are on the rail, but they are not the student's hours.
 */
export function plannedMinutes(slots: Slot[]): number {
  return slots.reduce((sum, slot) => (slot.delegatedTo ? sum : sum + slot.estimateMin), 0);
}

/** "Mon → Fri" · "Today" — the span a task's plan covers. */
export function planSpan(slots: Slot[], now: Date = new Date()): string | null {
  const dated = slots.filter((s) => s.startAt != null);
  if (dated.length === 0) return null;
  const first = new Date(dated[0].startAt!);
  const last = new Date(dated[dated.length - 1].endAt ?? dated[dated.length - 1].startAt!);

  const label = (d: Date) => {
    const off = dayOffset(d, now);
    if (off === 0) return 'Today';
    if (off === 1) return 'Tomorrow';
    if (off > 1 && off <= 6) return d.toLocaleDateString(undefined, { weekday: 'short' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const from = label(first);
  const to = label(last);
  return from === to ? from : `${from} → ${to}`;
}

// ── Proposals ───────────────────────────────────────────────────────────────

/**
 * A proposal, shaped as the task it would become.
 *
 * Shared by the Review sheet's budget line and its timeline so both are
 * answering the question with the same object — the sheet promises a pressure
 * number and a set of times, and both have to survive the commit unchanged.
 */
/**
 * The scheduler's key for one proposed step.
 *
 * Proposal-local ids are `s1`, `s2`, `s3` — unique inside a proposal and
 * nowhere else, so a batch of four breakdowns would hand the schedule four
 * different steps all called `s1`. Namespacing them by proposal is what lets
 * one `buildSchedule` pass plan a whole batch against the committed work.
 */
export function proposedSlotId(proposalId: string, subId: string): string {
  return `${proposalId}:${subId}`;
}

export function proposalToTask(p: ProposedTask, now: Date = new Date()): Task {
  // Mirrors `materialise()` in the store — a two-minute job the user ticked in
  // the sheet commits as DONE, so it must not carry pressure or take a slot in
  // the plan either. Anything that disagreed here would promise the user one
  // number and one schedule, then hand them another a second after commit.
  const at = now.toISOString();
  const done = Boolean(p.completeNow);

  return {
    id: p.id,
    title: p.title,
    status: done ? 'done' : 'open',
    categoryId: p.categoryId,
    dueAt: p.dueAt,
    estimateMin: p.estimateMin,
    load: p.load,
    icon: p.icon,
    createdAt: at,
    completedAt: done ? at : null,
    // Carried through rather than flattened: pressure weights a task by the
    // minutes still on the student's own plate, and the schedule needs the
    // edges, so a sheet that dropped the steps would be wrong twice.
    subtasks: p.subtasks.map((s) => ({
      id: proposedSlotId(p.id, s.id),
      title: s.title,
      done,
      estimateMin: s.estimateMin,
      dependsOn: s.dependsOn.map((d) => proposedSlotId(p.id, d)),
      delegatedTo: s.delegatedTo ?? null,
      completedAt: done ? at : null,
    })),
    resources: [],
  };
}
