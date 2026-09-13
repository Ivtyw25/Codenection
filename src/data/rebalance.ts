/**
 * The Rebalancer.
 *
 * `Lever` has been declared in the types for three commits with nothing behind
 * it. This is the engine: given a week that has gone over, it proposes the
 * smallest set of moves that brings it back, and prices every one of them
 * against the *real* pressure function.
 *
 * ── The rule this file exists to keep ──────────────────────────────────────
 *
 * PROMISED RELIEF IS DELIVERED RELIEF. Every move is priced by building the
 * task list that would exist if it were applied and running `derivePressure`
 * over it — the same function the gauge reads. Nothing here estimates. If the
 * plan says "−14", the gauge moves 14 when the user taps Apply, because the 14
 * was computed by simulating exactly that. An app whose entire premise is that
 * it will help you carry less cannot be caught overstating how much it just
 * took off you.
 *
 * ── It proposes. It does not act. ──────────────────────────────────────────
 *
 * "Autonomous" means the *analysis* is automatic, not the consequences. The app
 * does not silently drop a student's commitments and tell them afterwards; it
 * shows the moves, says what each costs and buys, and applies them on one tap.
 * A tool that quietly cancelled things on your behalf would be one more thing
 * to anxiously check, which is the opposite of the job.
 *
 * ── Order of preference ────────────────────────────────────────────────────
 *
 * Ranked by what the move costs the STUDENT, cheapest first:
 *
 *   delegate  the work still happens, done by someone with room for it
 *   postpone  the work still happens, later — it costs future-you, not the goal
 *   drop      the work does not happen. Real relief, real cost. Always last.
 *
 * `breakdown` sits outside that ladder entirely — see `breakdownAid`.
 */
import type {
  Category,
  Lever,
  SubTask,
  SubTaskId,
  Task,
  TaskId,
  Teammate,
  TeammateId,
} from '@/types';
import { categoryLabel, findCategory } from './categories';
import { derivePressure, openTasks } from './derive';
import { dayOffset, formatEstimate, isOverdue, startOfDay } from './format';

/** One proposed change. Priced, reversible, and explained. */
export interface Move {
  id: string;
  lever: Lever;
  taskId: TaskId;
  /** Delegation operates on a step, not a whole task. */
  subId?: SubTaskId;
  /** The headline — what this does, in plain words. */
  title: string;
  /** Why this task and not another. Shown under the title. */
  reason: string;
  /** What it costs the student, said honestly. Never hidden. */
  cost: string;
  /** Points of Pressure returned. Computed by simulation, never estimated. */
  relief: number;
  toTeammate?: TeammateId;
  /** Postpone only. ISO-8601. */
  newDueAt?: string;
}

export interface RebalancePlan {
  /** Pressure now. */
  before: number;
  /** Pressure if every move in `moves` is applied. */
  after: number;
  /** What the plan was aiming at. */
  target: number;
  /** Whether the situation warranted a plan at all. */
  triggered: boolean;
  moves: Move[];
  /**
   * Moves that cost nothing and relieve nothing, but make a stuck task
   * startable. Kept separate so they never pad the relief figure.
   */
  aids: Move[];
  /** The sentence the sheet leads with. */
  note: string;
}

/**
 * The reading at which the app offers to intervene.
 *
 * Deliberately high. `derivePipState` already widened its bands once because an
 * app that opens at amber for an ordinary week has stopped carrying
 * information; a rebalancer that offers to cancel your commitments every
 * Tuesday would be worse than that — it would be nagging with a spreadsheet.
 * This fires when the week is genuinely over, not when it is merely busy.
 */
export const REBALANCE_THRESHOLD = 68;

/** Where the plan tries to land. Comfortably inside the Balanced band. */
export const REBALANCE_TARGET = 52;

/**
 * How far out a postpone pushes.
 *
 * At least three days, but always far enough to leave the crunch week —
 * `urgency` weights everything from two to six days out identically, so a
 * three-day nudge on a task due Thursday buys *literally nothing*. The first
 * measured run of the seeded fixture proved it: two of the three postpone
 * candidates priced at zero and were silently dropped, and the one that
 * survived moved the number by one point.
 *
 * A lever that usually buys nothing is worse than no lever, because the student
 * still pays the cost of considering it. So a postpone means "not this week",
 * which is what the sheet's copy already promised.
 */
const POSTPONE_MIN_DAYS = 3;
const POSTPONE_CLEAR_WEEK_DAYS = 8;

/** A task moved this many times already is not postponed again — it is dropped. */
const MAX_POSTPONES = 2;

// ── Simulation ──────────────────────────────────────────────────────────────

/**
 * The task list as it would be if `move` were applied.
 *
 * The single most important function here. Every price in the plan comes from
 * running `derivePressure` over the output of this, which is what guarantees
 * the sheet cannot promise relief the gauge will not then show.
 */
export function applyMove(tasks: Task[], move: Move): Task[] {
  return tasks.map((task) => {
    if (task.id !== move.taskId) return task;

    switch (move.lever) {
      case 'drop':
        return { ...task, status: 'dropped' as const };

      case 'postpone':
        return {
          ...task,
          dueAt: move.newDueAt ?? task.dueAt,
          postponedFrom: task.dueAt,
          postponeCount: (task.postponeCount ?? 0) + 1,
        };

      case 'delegate':
        return {
          ...task,
          subtasks: task.subtasks.map((s) =>
            s.id === move.subId ? { ...s, delegatedTo: move.toTeammate ?? null } : s,
          ),
        };

      // Splitting changes what the student can start, not what they carry.
      case 'breakdown':
        return task;
    }
  });
}

/** Apply a whole plan, in order. Used by the store's one-tap commit. */
export function applyMoves(tasks: Task[], moves: Move[]): Task[] {
  return moves.reduce(applyMove, tasks);
}

/**
 * What an arbitrary SUBSET of a plan is really worth.
 *
 * The sheet lets a student un-tick any row, and each move's stored `relief` was
 * priced *sequentially* — against the list as it stood after every earlier
 * accepted move. Those figures therefore only sum correctly for the whole plan,
 * or for a prefix of it. Skip the first of three and the remaining two are each
 * quoting a saving measured in a world that no longer happens.
 *
 * So the footer asks this instead of adding up the rows. It is the same
 * simulate-and-diff the engine uses, run over exactly the moves the user has
 * agreed to, which keeps the one promise this file exists to keep: the number
 * on the button is the number the gauge moves.
 */
export function priceSubset(
  tasks: Task[],
  moves: Move[],
  now: Date = new Date(),
): { before: number; after: number; relief: number } {
  const before = derivePressure(tasks, now);
  const after = derivePressure(applyMoves(tasks, moves), now);
  return { before, after, relief: Math.max(0, before - after) };
}

/** What one move is actually worth, against the list it would act on. */
function priceOf(tasks: Task[], move: Move, now: Date): number {
  const before = derivePressure(tasks, now);
  const after = derivePressure(applyMove(tasks, move), now);
  return Math.max(0, before - after);
}

// ── Candidate generation ────────────────────────────────────────────────────

/**
 * Is this teammate someone it would be decent to hand work to?
 *
 * Delegation must not become a way to push a bad week onto a friend having a
 * worse one. Only the coarse shared bucket is consulted — the app never sees a
 * teammate's numbers, and someone who has not opted into sharing is simply not
 * offered, rather than being assumed fine.
 */
function hasRoom(mate: Teammate): boolean {
  return mate.sharesState && (mate.state === 'balanced' || mate.state === 'strained');
}

/**
 * Could somebody else actually do this step?
 *
 * The step's own flag wins; otherwise the category answers. Without this the
 * Rebalancer's first verified run proposed asking a friend to take "Re-read
 * lecture notes" and "Past-year paper" off the user's midterm revision — which
 * is not a rebalance, it is nonsense, and the sort of nonsense that would make
 * a student close the app and not come back.
 */
function isDelegable(task: Task, sub: SubTask, categories: Category[]): boolean {
  if (sub.delegable != null) return sub.delegable;
  return findCategory(categories, task.categoryId)?.shareable ?? false;
}

function delegateCandidates(tasks: Task[], teammates: Teammate[], categories: Category[]): Move[] {
  const available = teammates.filter(hasRoom);
  if (available.length === 0) return [];

  const moves: Move[] = [];
  // Round-robin, so a single obliging friend does not collect the whole week.
  let next = 0;

  for (const task of openTasks(tasks)) {
    for (const sub of task.subtasks) {
      if (sub.done || sub.delegatedTo) continue;
      if (!isDelegable(task, sub, categories)) continue;
      // Only steps nothing else is waiting on. Handing over a prerequisite
      // means the student's own next step now depends on someone else's day.
      const isPrerequisite = task.subtasks.some((s) => s.dependsOn.includes(sub.id));
      if (isPrerequisite) continue;
      if (sub.estimateMin < 15) continue; // not worth the asking

      const mate = available[next % available.length];
      next += 1;

      moves.push({
        id: `mv_del_${sub.id}`,
        lever: 'delegate',
        taskId: task.id,
        subId: sub.id,
        title: `Ask ${mate.name} to take “${sub.title}”`,
        reason: `${formatEstimate(sub.estimateMin)} of ${categoryLabel(categories, task.categoryId)} work, and nothing else is waiting on it.`,
        cost: 'Someone else’s time — they have room this week.',
        relief: 0,
        toTeammate: mate.id,
      });
    }
  }

  return moves;
}

function postponeCandidates(tasks: Task[], categories: Category[], now: Date): Move[] {
  const moves: Move[] = [];

  for (const task of openTasks(tasks)) {
    if (!task.dueAt) continue;
    // Something already overdue does not get moved — that is how a backlog
    // rots one comfortable week at a time. It gets dropped or done.
    if (isOverdue(task.dueAt, now)) continue;
    if ((task.postponeCount ?? 0) >= MAX_POSTPONES) continue;
    // Only the near stuff is worth moving; a task due next month is not what
    // is making this week heavy.
    if (dayOffset(task.dueAt, now) > 6) continue;
    if (task.load === 'high') continue; // the hard deadlines stay put

    // Whichever is later: a minimum nudge from where it sits, or clear of the
    // week entirely. The second is what usually does the work.
    const nudged = new Date(task.dueAt);
    nudged.setDate(nudged.getDate() + POSTPONE_MIN_DAYS);

    const clearOfWeek = startOfDay(now);
    clearOfWeek.setDate(clearOfWeek.getDate() + POSTPONE_CLEAR_WEEK_DAYS);
    clearOfWeek.setHours(
      new Date(task.dueAt).getHours(),
      new Date(task.dueAt).getMinutes(),
      0,
      0,
    );

    const moved = nudged > clearOfWeek ? nudged : clearOfWeek;
    const days = Math.max(1, Math.round((moved.getTime() - new Date(task.dueAt).getTime()) / 86_400_000));

    const times = task.postponeCount ?? 0;
    moves.push({
      id: `mv_post_${task.id}`,
      lever: 'postpone',
      taskId: task.id,
      title: `Move “${task.title}” out ${days} days`,
      reason:
        times > 0
          ? `${categoryLabel(categories, task.categoryId)} · moved ${times === 1 ? 'once' : `${times} times`} already.`
          : `${categoryLabel(categories, task.categoryId)} · no hard deadline this week.`,
      cost: 'Future-you carries it instead.',
      relief: 0,
      newDueAt: moved.toISOString(),
    });
  }

  return moves;
}

function dropCandidates(tasks: Task[], categories: Category[], now: Date): Move[] {
  const moves: Move[] = [];

  for (const task of openTasks(tasks)) {
    const times = task.postponeCount ?? 0;
    // Only offer to drop what the student has already shown they keep avoiding,
    // or what is small enough that carrying it is costing more than doing it.
    const keepsSliding = times >= MAX_POSTPONES;
    const lowStakes = task.load === 'low' && !isOverdue(task.dueAt, now);
    if (!keepsSliding && !lowStakes) continue;

    moves.push({
      id: `mv_drop_${task.id}`,
      lever: 'drop',
      taskId: task.id,
      title: `Let go of “${task.title}”`,
      reason: keepsSliding
        ? `Moved ${times} times. It is not going to happen this week.`
        : `${categoryLabel(categories, task.categoryId)} · low stakes, and it is still taking up room.`,
      // The one lever with a cost worth stating plainly rather than softening.
      cost: 'This does not get done. That is allowed.',
      relief: 0,
    });
  }

  return moves;
}

/**
 * Tasks that are stuck rather than heavy.
 *
 * A big task with no steps does not weigh more than its minutes — splitting it
 * changes NOTHING about the pressure number, and this file refuses to pretend
 * otherwise by quoting a relief it cannot deliver. What it changes is whether
 * the student can start today, which for a depleted person is often the actual
 * blocker. So it is offered, priced honestly at zero, and kept out of the
 * relief arithmetic entirely.
 */
function breakdownAid(tasks: Task[], categories: Category[]): Move[] {
  return openTasks(tasks)
    .filter((t) => t.subtasks.length === 0 && t.estimateMin >= 60)
    .map((task) => ({
      id: `mv_brk_${task.id}`,
      lever: 'breakdown' as const,
      taskId: task.id,
      title: `Break “${task.title}” into steps`,
      reason: `${formatEstimate(task.estimateMin)} in one undifferentiated block — there is no obvious place to start.`,
      cost: 'Won’t lower the number. Makes it possible to begin.',
      relief: 0,
    }));
}

// ── The plan ────────────────────────────────────────────────────────────────

/**
 * The smallest set of moves that brings the week back under control.
 *
 * Greedy over the preference ladder rather than optimal: it walks delegate,
 * then postpone, then drop, taking each move only if pressure is still above
 * target and the move actually buys something. Greedy is the right shape here
 * because the ladder encodes a value judgement — a smaller total of cheap moves
 * beats one big expensive one, and an optimiser would happily propose dropping
 * a midterm because it scored well.
 *
 * Re-prices after every accepted move, against the list as it now stands.
 * Pricing all candidates up-front and summing them would double-count: two
 * moves against the same task each look worth their full value in isolation.
 */
export function planRebalance(
  tasks: Task[],
  teammates: Teammate[],
  categories: Category[],
  now: Date = new Date(),
): RebalancePlan {
  const before = derivePressure(tasks, now);
  const aids = breakdownAid(tasks, categories);

  if (before < REBALANCE_THRESHOLD) {
    return {
      before,
      after: before,
      target: REBALANCE_TARGET,
      triggered: false,
      moves: [],
      aids,
      note:
        'Your week is inside its limits. Nothing needs moving — Pip is not going to invent a problem to solve.',
    };
  }

  const ladder = [
    ...delegateCandidates(tasks, teammates, categories),
    ...postponeCandidates(tasks, categories, now),
    ...dropCandidates(tasks, categories, now),
  ];

  const chosen: Move[] = [];
  let working = tasks;
  let pressure = before;
  /*
   * At most one WHOLE-TASK lever per task.
   *
   * The first verified run proposed "Move groceries out 3 days" AND "Let go of
   * groceries" in the same plan. The arithmetic was sound — the drop was priced
   * against the already-postponed list, so the totals still added up — but it
   * is incoherent as advice, and a plan that contradicts itself is one nobody
   * can agree to with a single tap.
   *
   * Only postpone and drop claim, because only they act on the whole task.
   * Delegation acts on a step, and handing three of a task's steps to three
   * people is a perfectly sensible thing to propose — claiming by task id would
   * have silently capped every delegation at one step per task. Since the
   * ladder runs delegate → postpone → drop, delegates are never blocked, and
   * drop only ever sees what postpone could not take.
   */
  const claimed = new Set<TaskId>();

  for (const candidate of ladder) {
    if (pressure <= REBALANCE_TARGET) break;
    if (claimed.has(candidate.taskId)) continue;

    const relief = priceOf(working, candidate, now);
    // A move that buys nothing is not offered, whatever ladder rung it sits
    // on. Padding the list with free-looking actions that change no number is
    // how a rebalancer becomes theatre.
    if (relief <= 0) continue;

    chosen.push({ ...candidate, relief });
    if (candidate.lever === 'postpone' || candidate.lever === 'drop') {
      claimed.add(candidate.taskId);
    }
    working = applyMove(working, candidate);
    pressure = derivePressure(working, now);
  }

  const after = pressure;
  const relieved = before - after;

  return {
    before,
    after,
    target: REBALANCE_TARGET,
    triggered: true,
    moves: chosen,
    aids,
    note:
      chosen.length === 0
        ? 'Pip could not find anything safe to move. What is left is work only you can do, on deadlines that will not shift — so the honest answer is rest, not rearrangement.'
        : after <= REBALANCE_TARGET
          ? `${chosen.length} ${chosen.length === 1 ? 'move' : 'moves'} takes ${relieved} points off and brings the week back inside its limits.`
          : `${chosen.length} ${chosen.length === 1 ? 'move' : 'moves'} takes ${relieved} points off. That is everything Pip can safely move — the rest is genuinely yours.`,
  };
}

/** Grouped for the sheet, which renders one section per lever. */
export function groupByLever(moves: Move[]): { lever: Lever; moves: Move[] }[] {
  const order: Lever[] = ['delegate', 'postpone', 'breakdown', 'drop'];
  return order
    .map((lever) => ({ lever, moves: moves.filter((m) => m.lever === lever) }))
    .filter((g) => g.moves.length > 0);
}

/** Section copy. Says what the lever is for, not what it is called. */
export const LEVER_COPY: Record<Lever, { title: string; blurb: string }> = {
  delegate: {
    title: 'Hand over',
    blurb: 'Still gets done — by someone with room for it this week.',
  },
  postpone: {
    title: 'Move later',
    blurb: 'Still gets done. Just not while everything else is due.',
  },
  breakdown: {
    title: 'Make startable',
    blurb: 'Changes nothing about the load. Changes whether you can begin.',
  },
  drop: {
    title: 'Let go',
    blurb: 'This one does not get done. Sometimes that is the right call.',
  },
};
