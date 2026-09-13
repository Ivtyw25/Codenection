/**
 * Read-side hooks.
 *
 * Screens never compute domain values inline — they ask for them here, so the
 * same number appears identically on Home, on Pip, and in the Review sheet's
 * budget line. Each of these is a thin wrapper over a pure function in
 * `src/data/derive.ts`; the hooks exist only to bind them to the store and to
 * the clock.
 */
import { useEffect, useMemo, useState } from 'react';

import {
  budgetAfter,
  categoryCounts,
  deriveCapacity,
  derivePipState,
  derivePressureBreakdown,
  deriveStreak,
  forecastAhead,
  nextAction,
  outlook,
  progress,
  projectVital,
  queryTasks,
  readVitals,
  vitalSeries,
  type DayOutlook,
} from '@/data/derive';
import { calibrationNote, checkInOn, checkInOpen } from '@/data/calibration';
import { formatDayName, isoDate } from '@/data/format';
import { activeCategories, findCategory } from '@/data/categories';
import { explainVital, type VitalExplanation } from '@/data/explain';
import { planRebalance, type RebalancePlan } from '@/data/rebalance';
import {
  buildRecoveryTask,
  recoveryCase,
  suggestRecovery,
  takenActions,
  type DayLoad,
  type RecoveryCase,
  type RecoverySuggestion,
} from '@/data/recovery';
import {
  buildSchedule,
  plannedMinutes,
  proposalToTask,
  slotsOn,
  taskSlots,
  type Schedule,
  type Slot,
} from '@/data/schedule';
import { useApp } from './AppStore';
import type {
  Capacity,
  Category,
  CategoryId,
  CategoryLoad,
  CheckIn,
  Forecast,
  PipState,
  ProposedTask,
  Task,
  TaskId,
  Teammate,
  VitalId,
  VitalReading,
} from '@/types';

/**
 * A clock that ticks once a minute.
 *
 * Urgency is a function of time, so a 4 PM deadline has to start weighing more
 * as 4 PM approaches even with the app open and untouched. Once a minute is
 * the coarsest tick that still keeps "Today, 4:00 PM" honest.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useCapacity(): Capacity {
  const { data } = useApp();
  const now = useNow();
  return useMemo(() => deriveCapacity(data, now), [data, now]);
}

export function usePipState(): PipState {
  const capacity = useCapacity();
  return useMemo(() => derivePipState(capacity), [capacity]);
}

// ── Vitality ────────────────────────────────────────────────────────────────

/** The four sub-stats, resolved against this user's own model. */
export function useVitals(): VitalReading[] {
  const { data } = useApp();
  return useMemo(
    () => readVitals(data.vitals, data.vitalityModel, data.history),
    [data.vitals, data.vitalityModel, data.history],
  );
}

export function useVital(id: VitalId | undefined): VitalReading | null {
  const readings = useVitals();
  return useMemo(() => readings.find((r) => r.id === id) ?? null, [readings, id]);
}

/** One sub-stat's week, today included live. */
export function useVitalSeries(id: VitalId | undefined) {
  const { data } = useApp();
  return useMemo(
    () => (id ? vitalSeries(id, data.vitals, data.history) : []),
    [id, data.vitals, data.history],
  );
}

/**
 * Where that sub-stat is heading over the next week.
 *
 * Reacts to the recovery blocks already on the plan, which is the point: the
 * line the student sees bends the moment they accept a run on Tuesday.
 */
export function useVitalProjection(id: VitalId | undefined) {
  const { data } = useApp();
  const series = useVitalSeries(id);
  const now = useNow();
  return useMemo(
    () => (id ? projectVital(id, series, data.tasks, 7, now) : []),
    [id, series, data.tasks, now],
  );
}

/** Why that sub-stat sits where it does, and what would move it. */
export function useVitalExplanation(id: VitalId | undefined): VitalExplanation | null {
  const reading = useVital(id);
  const series = useVitalSeries(id);
  const capacity = useCapacity();
  return useMemo(
    () => (reading ? explainVital(reading, series, capacity) : null),
    [reading, series, capacity],
  );
}

/**
 * Where tomorrow lands if today's plan is followed.
 *
 * Only the student's own outstanding blocks count as "you will finish these" —
 * a delegated step is not theirs to complete, and a forecast that assumed
 * someone else's day would go to plan is making a promise on their behalf.
 */
export function useForecast(): Forecast {
  const { data } = useApp();
  const now = useNow();
  const today = useTodayTimeline();
  return useMemo(
    () =>
      forecastAhead(
        data,
        today.slots.filter((s) => !s.done && !s.delegatedTo).map((s) => s.subId),
        now,
      ),
    [data, today.slots, now],
  );
}

export function useStreak(): { days: number; goal: number } {
  const { data } = useApp();
  const pip = usePipState();
  return useMemo(
    () => ({ days: deriveStreak(data.history, pip.name), goal: data.pip.streakGoal }),
    [data.history, data.pip.streakGoal, pip.name],
  );
}

/** The Manifest's list, honouring the live filter/sort query. */
export function useTaskList(): Task[] {
  const { data, state } = useApp();
  const now = useNow();
  return useMemo(() => queryTasks(data.tasks, state.query, now), [data.tasks, state.query, now]);
}

export function useCategoryCounts(): Record<string, number> {
  const { data, state } = useApp();
  return useMemo(() => categoryCounts(data.tasks, state.query), [data.tasks, state.query]);
}

// ── Rebalance ───────────────────────────────────────────────────────────────

/**
 * What Pip would move, if asked.
 *
 * Recomputed from the live task list like every other derived value, so the
 * plan a student opens is a plan for the week they have right now — not one
 * cached from whenever the banner first appeared. Ticking something off and
 * re-opening the sheet genuinely produces a smaller plan.
 */
export function useRebalancePlan(force = false): RebalancePlan {
  const { data } = useApp();
  const now = useNow();
  return useMemo(
    () => planRebalance(data.tasks, data.teammates, data.categories, now, { force }),
    [data.tasks, data.teammates, data.categories, now, force],
  );
}

/**
 * Recovery actions worth offering this person, weakest sub-stat first.
 *
 * Reads the same `VitalReading[]` the detail pages do, so a suggestion can only
 * ever appear for a sub-stat the student can see is under its line. Actions
 * already committed as open tasks are excluded — re-proposing the run somebody
 * accepted this morning is how a helpful list becomes wallpaper.
 */
export function useRecoverySuggestions(): PlannedRecovery[] {
  const { data } = useApp();
  const readings = useVitals();
  const now = useNow();

  return useMemo(() => {
    const suggestions = suggestRecovery(readings, takenActions(data.tasks));

    /*
     * What each day ahead already carries, from the one real schedule.
     *
     * The case a suggestion makes for itself names a day and says what is on
     * it — "Thursday, where you already have four blocks and five hours" — and
     * that has to be the same Thursday the timeline shows, or the row is
     * quoting a week the student does not have.
     */
    const planned = buildSchedule(data.tasks, now);
    const dayLoad = new Map<string, DayLoad>();
    for (const slot of planned.values()) {
      if (!slot.startAt) continue;
      const key = isoDate(slot.startAt);
      const day = dayLoad.get(key) ?? { blocks: 0, minutes: 0 };
      day.blocks += 1;
      if (!slot.delegatedTo) day.minutes += slot.estimateMin;
      dayLoad.set(key, day);
    }

    /*
     * Each one priced for TIME, the way moves are priced for pressure.
     *
     * The row promises a slot — "today, 4:40pm" — and the only honest way to
     * produce that is to run the real scheduler over the task that would
     * actually be created. Guessing "sometime this evening" in the UI would be
     * a second, softer copy of the planner that drifts from it the moment the
     * day fills up.
     *
     * Scheduled ONE AT A TIME, each against the committed list rather than
     * against each other. Four hypothetical blocks competing for the same
     * afternoon would push the later ones into tomorrow, and the student is
     * only ever going to accept one or two — so each row answers "if you add
     * THIS, when does it happen?", which is the question being asked.
     */
    return suggestions.map((suggestion) => {
      const candidate = buildRecoveryTask(suggestion, `rec_preview_${suggestion.action.id}`, now);
      const schedule = buildSchedule([...data.tasks, candidate], now);

      /*
       * The argument for this block, against the CURRENT plan.
       *
       * Projected without the candidate in the list on purpose: the case is
       * "here is the dip you are heading for", and running it against a world
       * that already contains the fix would quote a shallower dip and
       * under-sell the row against its own evidence.
       */
      const series = vitalSeries(suggestion.action.vitalId, data.vitals, data.history);
      const projection = projectVital(suggestion.action.vitalId, series, data.tasks, 7, now);

      return {
        ...suggestion,
        plannedAt: schedule.get(candidate.id)?.startAt ?? null,
        why: recoveryCase(suggestion, projection, dayLoad, (iso) => formatDayName(iso, now)),
      };
    });
  }, [readings, data.tasks, data.vitals, data.history, now]);
}

/** A suggestion plus the slot the real scheduler would give it. */
export interface PlannedRecovery extends RecoverySuggestion {
  /** ISO-8601, or null if the day genuinely has no room left for it. */
  plannedAt: string | null;
  /** The dated argument for adding it — see `recoveryCase`. */
  why: RecoveryCase;
}

// ── Calibration ─────────────────────────────────────────────────────────────

/**
 * Today's check-in and what the app has learned so far.
 *
 * `answered` gates the Home card: the question is asked once a day, and a
 * wellbeing prompt that reappears after you have answered it is nagging.
 */
export function useCheckIn(): {
  today: CheckIn | null;
  answered: boolean;
  /** Whether the day has run far enough for the question to mean anything. */
  open: boolean;
  note: string | null;
  bias: number;
  count: number;
} {
  const { data } = useApp();
  const now = useNow();

  return useMemo(() => {
    const today = checkInOn(data.calibration, now);
    return {
      today,
      answered: today != null,
      open: checkInOpen(now),
      note: calibrationNote(data.calibration),
      bias: data.calibration?.vitalityBias ?? 0,
      count: data.calibration?.entries.length ?? 0,
    };
  }, [data.calibration, now]);
}

// ── Categories ──────────────────────────────────────────────────────────────

/** Every category, retired ones included. For the editor and for history. */
export function useAllCategories(): Category[] {
  const { data } = useApp();
  return data.categories;
}

/** The ones still offered on new work — filter rows, pickers, the breakdown. */
export function useCategories(): Category[] {
  const { data } = useApp();
  return useMemo(() => activeCategories(data.categories), [data.categories]);
}

export function useCategory(id: CategoryId | undefined): Category | null {
  const { data } = useApp();
  return useMemo(() => (id ? findCategory(data.categories, id) : null), [data.categories, id]);
}

/**
 * Pressure, split across the categories this student actually carries.
 *
 * Joined to the category rows here rather than in `derive.ts` so the pure
 * function stays a pure group-by over task data: the breakdown's *numbers* are
 * a fact about the task list, and its *labels* are a fact about the user's
 * category table, and those two things change for different reasons.
 *
 * A slice whose category has since been archived still resolves — it keeps its
 * stored label so the bar reads as work rather than as an orphaned id.
 */
export function useLoadBreakdown(): {
  total: number;
  slices: (CategoryLoad & { category: Category })[];
  hottest: (CategoryLoad & { category: Category }) | null;
} {
  const { data } = useApp();
  const now = useNow();

  return useMemo(() => {
    const breakdown = derivePressureBreakdown(data.tasks, now);
    const slices = breakdown.slices.map((slice) => ({
      ...slice,
      category: findCategory(data.categories, slice.categoryId) ?? {
        id: slice.categoryId,
        label: slice.categoryId,
        icon: 'Sparkles' as const,
        match: [],
        shareable: false,
      },
    }));
    return {
      total: breakdown.total,
      slices,
      hottest: slices.find((s) => s.categoryId === breakdown.hottest) ?? null,
    };
  }, [data.tasks, data.categories, now]);
}

export function useTask(id: TaskId | undefined): Task | null {
  const { data } = useApp();
  return useMemo(() => data.tasks.find((t) => t.id === id) ?? null, [data.tasks, id]);
}

/** Everyone a step can be handed to — the delegation screen's whole list. */
export function useTeammates(): Teammate[] {
  const { data } = useApp();
  return data.teammates;
}

/** Unprocessed captures waiting in the queue. Home's badge and the Inbox header. */
export function useInboxCount(): number {
  const { data } = useApp();
  return data.inbox.length;
}

export function useUnreadCount(): number {
  const { data } = useApp();
  return useMemo(() => data.notifications.filter((n) => !n.read).length, [data.notifications]);
}

/** What accepting `proposed` would do to today's pressure. */
export function useBudget(proposed: ProposedTask[]) {
  const { data } = useApp();
  const now = useNow();
  return useMemo(
    () => budgetAfter(data.tasks, proposed.map((p) => proposalToTask(p, now)), now),
    [data.tasks, proposed, now],
  );
}

// ── Schedule ────────────────────────────────────────────────────────────

/**
 * The whole plan, recomputed from the open task list and the clock.
 *
 * One schedule for the entire app rather than one per screen: Today's Focus and
 * a task's own timeline have to agree about when Tuesday afternoon is spoken
 * for, and they can only do that by reading the same object.
 */
export function useSchedule(): Schedule {
  const { data } = useApp();
  const now = useNow();
  return useMemo(() => buildSchedule(data.tasks, now), [data.tasks, now]);
}

/** One task's steps, in plan order — Task Detail's rail. */
export function useTaskTimeline(id: TaskId | undefined): Slot[] {
  const task = useTask(id);
  const schedule = useSchedule();
  return useMemo(() => (task ? taskSlots(task, schedule) : []), [task, schedule]);
}

/**
 * Everything scheduled for today, across every task, in clock order.
 *
 * Finished steps come back in their real place rather than being swept into a
 * "done" bucket — `buildSchedule` reconstructs their block from `completedAt`,
 * so the rail shows what the day actually was.
 */
export function useTodayTimeline(): { slots: Slot[]; plannedMin: number } {
  const schedule = useSchedule();
  const now = useNow();
  return useMemo(() => {
    const slots = slotsOn(schedule, now);
    return { slots, plannedMin: plannedMinutes(slots) };
  }, [schedule, now]);
}

/**
 * When the proposed work would actually happen.
 *
 * Scheduled against the committed tasks, not in isolation — otherwise the sheet
 * would promise Tuesday 9am for a step that already has the midterm revision in
 * it, and the times would all move the instant the user pressed Add.
 */
export function useProposedTimeline(proposed: ProposedTask[]): Schedule {
  const { data } = useApp();
  const now = useNow();
  return useMemo(
    () => buildSchedule([...data.tasks, ...proposed.map((p) => proposalToTask(p, now))], now),
    [data.tasks, proposed, now],
  );
}

// ── The calendar ────────────────────────────────────────────────────────────

/**
 * Every day the app has a reading for, keyed by ISO date.
 *
 * A map rather than a list because the calendar renders a grid of dates and
 * asks "what about this square?" — the one access pattern a sorted array makes
 * awkward. The list is available too, for the parts of the screen that want a
 * run of days (the week strip, the next-bad-day line).
 *
 * Recomputed like everything else: tick a task off and the forward squares
 * lighten in the same frame, because their pressure was derived from the plan
 * that task was part of.
 */
export function useOutlook(window: { back?: number; forward?: number } = {}): {
  days: DayOutlook[];
  byDate: Map<string, DayOutlook>;
  /** The heaviest day ahead, if any of them are genuinely heavy. */
  worstAhead: DayOutlook | null;
} {
  const { data } = useApp();
  const now = useNow();
  const back = window.back;
  const forward = window.forward;

  return useMemo(() => {
    const days = outlook(data, now, { back, forward });
    const ahead = days.filter((d) => !d.actual);
    const worst = ahead.reduce<DayOutlook | null>(
      (bad, day) => (bad == null || day.pressure > bad.pressure ? day : bad),
      null,
    );
    return {
      days,
      byDate: new Map(days.map((d) => [d.date, d])),
      // Only called out when it is actually worth calling out. A "worst day
      // ahead" banner on a quiet fortnight is the app manufacturing a worry.
      worstAhead: worst && worst.state !== 'balanced' ? worst : null,
    };
  }, [data, now, back, forward]);
}

/** Everything the plan puts on one particular day. The calendar's day panel. */
export function useDaySlots(date: Date | string | null): Slot[] {
  const schedule = useSchedule();
  return useMemo(() => (date ? slotsOn(schedule, new Date(date)) : []), [schedule, date]);
}

/** Seven-day series for the streak drawer, oldest first, with today live. */
export function useWeekSeries() {
  const { data } = useApp();
  const capacity = useCapacity();
  const pip = usePipState();
  const now = useNow();

  return useMemo(() => {
    const past = data.history.slice(-6).map((d) => ({ ...d, isToday: false }));
    const completedToday = data.tasks.filter(
      (t) => t.completedAt && new Date(t.completedAt).toDateString() === now.toDateString(),
    ).length;
    return [
      ...past,
      {
        date: now.toISOString(),
        pressure: capacity.pressure,
        vitality: capacity.vitality,
        tasksCompleted: completedToday,
        state: pip.name,
        isToday: true,
      },
    ];
  }, [data.history, data.tasks, capacity, pip.name, now]);
}

export { nextAction, progress };
export type { Slot } from '@/data/schedule';
