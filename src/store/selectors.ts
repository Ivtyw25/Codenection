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
  contextCounts,
  deriveCapacity,
  derivePipState,
  deriveStreak,
  nextAction,
  progress,
  queryTasks,
} from '@/data/derive';
import { useApp } from './AppStore';
import type { Capacity, PipState, ProposedTask, Task, TaskId } from '@/types';

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

/** Home's short list — the three most pressing open items. */
export function useFocusTasks(limit = 3): Task[] {
  const { data } = useApp();
  const now = useNow();
  return useMemo(
    () =>
      queryTasks(
        data.tasks,
        { context: 'all', range: 'today', sort: 'due', hideDone: true, anchor: now.toISOString() },
        now,
      ).slice(0, limit),
    [data.tasks, now, limit],
  );
}

export function useContextCounts(): Record<string, number> {
  const { data, state } = useApp();
  return useMemo(() => contextCounts(data.tasks, state.query), [data.tasks, state.query]);
}

export function useTask(id: TaskId | undefined): Task | null {
  const { data } = useApp();
  return useMemo(() => data.tasks.find((t) => t.id === id) ?? null, [data.tasks, id]);
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
    () =>
      budgetAfter(
        data.tasks,
        proposed.map((p) => ({
          id: p.id,
          title: p.title,
          status: 'open' as const,
          context: p.context,
          dueAt: p.dueAt,
          estimateMin: p.estimateMin,
          load: p.load,
          icon: p.icon,
          createdAt: now.toISOString(),
          completedAt: null,
          subtasks: [],
          resources: [],
        })),
        now,
      ),
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
