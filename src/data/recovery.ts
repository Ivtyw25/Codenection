/**
 * Putting something back.
 *
 * The Rebalancer's four levers all subtract — hand over, move later, break up,
 * let go. Every one of them lowers Pressure, and not one of them raises
 * Vitality, which means a student who ran the full plan ended up with a lighter
 * week and the same empty reserve. That is only half of what "rebalance" means,
 * and it is the less important half: the pile is a problem you can arithmetic
 * your way out of, and being depleted is not.
 *
 * So the scan also proposes recovery. These are the additions — a run, a walk
 * with nowhere to be, twenty minutes of reading that is not for a module, a nap
 * taken deliberately instead of apologetically.
 *
 * ── Why they are tasks ─────────────────────────────────────────────────────
 *
 * Because unscheduled recovery does not happen. A student with a heavy week and
 * a suggestion to "rest more" will not rest more; a student with a forty-minute
 * walk on the rail at 4pm might. Committing one creates a real `Task` that sits
 * on the timeline next to the coursework and competes for the same day, which
 * is the honest way to represent it — recovery costs time, and pretending
 * otherwise is how these suggestions become noise a person scrolls past.
 *
 * What it does NOT cost is Pressure: see `taskPressure`, which prices a
 * recovery task at zero. The app must not tell you to rest and then report you
 * as more loaded for agreeing.
 *
 * ── Why some of them have a timer ──────────────────────────────────────────
 *
 * A checkbox is a fine instrument for "email the supervisor" and a terrible one
 * for "sit still for twenty minutes". For meditation, a nap and a reading
 * block, the passing of the time IS the task — so those carry `timerSec` and
 * get a screen that does nothing but hold the time, which is also the only
 * screen in this app whose job is to be looked away from.
 *
 * ── Why the lift is small ──────────────────────────────────────────────────
 *
 * Every `lift` here is one evening's worth of movement on one sub-stat, and the
 * suggestion layer caps it at the distance to the user's own suggested mark. An
 * app that promised a nap would take Rest from 38 to 80 would be caught lying
 * by the next morning's reading, and this is a screen that cannot afford to be
 * caught lying — it is already asking a depleted person to believe that resting
 * counts as progress.
 */
import type { RecoveryMeta, Task, VitalId, VitalReading } from '@/types';
import { RECOVERY_CATEGORY } from './categories';
import { DAY_END_HOUR } from './schedule';

/** Icons the recovery rows may render. Keeps the catalogue free of lucide. */
export type RecoveryIcon =
  | 'Footprints'
  | 'Wind'
  | 'BookOpen'
  | 'Moon'
  | 'MessageCircle'
  | 'Coffee'
  | 'Sun';

export interface RecoveryAction {
  id: string;
  vitalId: VitalId;
  title: string;
  /**
   * Why this one, in a line.
   *
   * Deliberately short. These used to be two-sentence arguments for each
   * activity — true, well-made, and terrible in a list of four, because by the
   * third paragraph the student is reading an essay about rest instead of
   * choosing to rest. The row already shows which sub-stat it lifts, by how
   * much, how long it takes and when it would happen; this only has to supply
   * the one clause those cannot.
   */
  blurb: string;
  /** Minutes it takes. Becomes the task's estimate and its block on the rail. */
  minutes: number;
  /** Points it is worth to its sub-stat, before capping. */
  lift: number;
  icon: RecoveryIcon;
  /**
   * Sit-still actions only. Seconds. Presence of this field is what routes the
   * task to the timer screen instead of to an ordinary checkbox.
   */
  timerSec?: number;
}

/**
 * The catalogue.
 *
 * Deliberately short, and deliberately specific. "Practise self-care" is not an
 * action; "walk a route you do not need to be at the end of" is something a
 * person can either do or not do this afternoon. Each entry names a real
 * activity with a real duration, because the thing being proposed has to be
 * small enough to actually start on the worst day of the week — which is the
 * only day this list will ever be read on.
 */
export const RECOVERY_CATALOGUE: RecoveryAction[] = [
  // ── Rest & Sleep ──────────────────────────────────────────────────────────
  {
    id: 'rec_nap',
    vitalId: 'rest',
    title: 'A nap, without the guilt',
    blurb: 'Short enough to wake up clear rather than groggy.',
    minutes: 20,
    lift: 8,
    icon: 'Moon',
    timerSec: 20 * 60,
  },
  {
    id: 'rec_winddown',
    vitalId: 'rest',
    title: 'Close the day an hour early',
    blurb: 'Turns a hard stop into a wind-down.',
    minutes: 60,
    lift: 7,
    icon: 'Sun',
  },

  // ── Physical ──────────────────────────────────────────────────────────────
  {
    id: 'rec_run',
    vitalId: 'physical',
    title: 'Go for a run',
    blurb: 'Any pace counts. This one moves when you use your body.',
    minutes: 30,
    lift: 10,
    icon: 'Footprints',
  },
  {
    id: 'rec_walk',
    vitalId: 'physical',
    title: 'A solo walk through town',
    blurb: 'No destination. Moves you and unhooks your attention at once.',
    minutes: 40,
    lift: 8,
    icon: 'Wind',
  },

  // ── Mood & Stress ─────────────────────────────────────────────────────────
  {
    id: 'rec_meditate',
    vitalId: 'mood',
    title: 'Ten minutes of sitting still',
    blurb: 'Not to empty your head — just to stop adding to it.',
    minutes: 10,
    lift: 7,
    icon: 'Coffee',
    timerSec: 10 * 60,
  },
  {
    id: 'rec_read',
    vitalId: 'mood',
    title: 'Read something that is not for a module',
    blurb: 'Reading nobody is going to test you on.',
    minutes: 30,
    lift: 8,
    icon: 'BookOpen',
    timerSec: 30 * 60,
  },

  // ── Social ────────────────────────────────────────────────────────────────
  {
    id: 'rec_message',
    vitalId: 'social',
    title: 'Message one person properly',
    blurb: 'One real conversation moves this more than anything else.',
    minutes: 15,
    lift: 10,
    icon: 'MessageCircle',
  },
  {
    id: 'rec_meal',
    vitalId: 'social',
    title: 'Eat one meal with someone',
    blurb: 'You were going to eat anyway.',
    minutes: 60,
    lift: 12,
    icon: 'Coffee',
  },
];

/** One catalogue entry, resolved against how far under the user actually is. */
export interface RecoverySuggestion {
  action: RecoveryAction;
  /** The sub-stat it would lift, already read against this user's model. */
  reading: VitalReading;
  /** Points it would actually deliver — capped at the distance to the mark. */
  lift: number;
}

export function findRecoveryAction(id: string): RecoveryAction | null {
  return RECOVERY_CATALOGUE.find((a) => a.id === id) ?? null;
}

/** The stored shape a committed recovery task carries. */
export function recoveryMeta(suggestion: RecoverySuggestion): RecoveryMeta {
  return {
    vitalId: suggestion.action.vitalId,
    lift: suggestion.lift,
    timerSec: suggestion.action.timerSec,
    actionId: suggestion.action.id,
  };
}

/**
 * A recovery suggestion, as a schedulable task.
 *
 * Lives here rather than in the store because the suggestion list needs to
 * build one BEFORE it is committed — the row promises a time ("today, 4:40pm"),
 * and the only honest way to produce that time is to run the real scheduler
 * over the task that would actually be created. A second, approximate copy of
 * this shape in the UI would drift from the committed one, and the row would be
 * quoting a slot the task never lands in.
 *
 * Due TODAY, and deliberately so. Recovery with no date is recovery that
 * happens after everything else, which means never. It lands at the end of the
 * planning window so it does not shoulder real deadlines out of the way; the
 * scheduler fits it into whatever gap is left.
 *
 * No sub-tasks. Breaking "take a nap" into steps would be the app failing to
 * understand its own suggestion.
 */
export function buildRecoveryTask(
  suggestion: RecoverySuggestion,
  id: string,
  now: Date = new Date(),
): Task {
  const due = new Date(now);
  due.setHours(DAY_END_HOUR, 0, 0, 0);

  return {
    id,
    title: suggestion.action.title,
    status: 'open',
    categoryId: RECOVERY_CATEGORY,
    dueAt: due.toISOString(),
    estimateMin: suggestion.action.minutes,
    // Always low. A recovery block is not a heavy commitment, and rendering it
    // beside the midterm at the same weight would make resting look like work.
    load: 'low',
    icon: 'Heart',
    createdAt: now.toISOString(),
    completedAt: null,
    subtasks: [],
    resources: [],
    pipNote: suggestion.action.blurb,
    recovery: recoveryMeta(suggestion),
  };
}

/**
 * The most recovery options offered at once.
 *
 * A bad week puts all four sub-stats under their marks at the same time, which
 * at two options each is eight cards — and eight is not a list of suggestions,
 * it is a second backlog, handed to the person with the least capacity to
 * triage one. The whole argument for the Rebalancer's default of pre-accepting
 * every move is that a depleted student should be vetoing decisions rather than
 * assembling them, and a wall of recovery options would undo that two sections
 * further down the same screen.
 *
 * Four, taken weakest-first, so what survives the cut is always aimed at the
 * sub-stats actually dragging the reserve down.
 */
export const MAX_SUGGESTIONS = 4;

/**
 * What this person should be offered, weakest sub-stat first.
 *
 * ONLY SUB-STATS THAT ARE ACTUALLY UNDER. A student whose Rest is comfortably
 * above their own mark does not need to be sold a nap, and a recovery list that
 * always has something to say about all four is a list nobody reads — it is
 * horoscope output. If everything is at its mark this returns nothing, and the
 * screen says so.
 *
 * Ordered by how far under each sub-stat is, so the first suggestion is always
 * aimed at the thing actually dragging the reserve down. `perVital` keeps the
 * list from becoming four napping options in a row when Rest is the problem;
 * two per sub-stat is enough to offer a choice without turning recovery into
 * another backlog to triage.
 *
 * `taken` carries the action ids already sitting in the task list, so the scan
 * stops re-proposing a run the student committed to this morning.
 */
export function suggestRecovery(
  readings: VitalReading[],
  taken: Iterable<string> = [],
  perVital = 2,
  limit = MAX_SUGGESTIONS,
): RecoverySuggestion[] {
  const already = new Set(taken);

  const under = readings
    .filter((r) => r.value < r.target)
    .sort((a, b) => a.value - a.target - (b.value - b.target));

  return under.flatMap((reading) => {
    const gap = reading.target - reading.value;
    return RECOVERY_CATALOGUE.filter((a) => a.vitalId === reading.id && !already.has(a.id))
      .slice(0, perVital)
      .map((action) => ({
        action,
        reading,
        /*
         * Capped at the gap.
         *
         * A nap worth eight points offered to someone four points under their
         * own Rest mark is worth four, not eight — the mark is the target, not
         * a waypoint. Overstating it would be caught by tomorrow's reading, and
         * this is the one screen in the app that cannot afford to be caught
         * overstating what rest buys.
         */
        lift: Math.max(1, Math.min(action.lift, gap)),
      }));
  })
    .slice(0, limit);
}


/** Recovery action ids already committed as open tasks. */
export function takenActions(tasks: { status: string; recovery?: RecoveryMeta }[]): string[] {
  return tasks
    .filter((t) => t.status === 'open' && t.recovery)
    .map((t) => t.recovery!.actionId);
}
