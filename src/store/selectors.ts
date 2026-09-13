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
  progress,
  queryTasks,
  readVitals,
  vitalSeries,
} from '@/data/derive';
import { activeCategories, findCategory } from '@/data/categories';
import { explainVital, type VitalExplanation } from '@/data/explain';
import { planRebalance, type RebalancePlan } from '@/data/rebalance';
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
export function useRebalancePlan(): RebalancePlan {
  const { data } = useApp();
  const now = useNow();
  return useMemo(
    () => planRebalance(data.tasks, data.teammates, data.categories, now),
    [data.tasks, data.teammates, data.categories, now],
  );
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

/** Seven-day series for Reflect, oldest first, with today appended live. */
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
