/**
 * Demo store — FRONTEND STAGE ONLY.
 *
 * Every screen in the spec defines Loading / Empty / Error branches alongside
 * its populated state. Those branches are part of the deliverable, so rather
 * than leaving them as unreachable code they are driven from here and can be
 * flipped from the `/dev` review screen.
 *
 * This is presentational state only — no scoring, no persistence, no network.
 * When the real engine lands, screens keep reading `useDemo()` and only this
 * file is replaced.
 */

import { createContext, useContext, useMemo, useState } from 'react';

import type { CapacityState } from '@/types';
import { capacity as seedCapacity } from './index';

export type DemoScenario =
  | 'populated'
  | 'loading'
  | 'empty'
  | 'balanced'
  | 'criticalPressure'
  | 'criticalVitality';

interface DemoValue {
  scenario: DemoScenario;
  setScenario: (s: DemoScenario) => void;
  capacity: CapacityState;
  loading: boolean;
  empty: boolean;
  /** Drives the SCR-10 "How are you feeling?" prompt on the status strip. */
  checkInDone: boolean;
  setCheckInDone: (v: boolean) => void;
  /** Whether the SCR-23 nudge slot is currently showing on Home. */
  nudgeActive: boolean;
  setNudgeActive: (v: boolean) => void;
}

const SCENARIO_CAPACITY: Record<DemoScenario, CapacityState> = {
  populated: seedCapacity,
  loading: seedCapacity,
  empty: {
    pressure: 12,
    vitality: 72,
    subStats: { rest: 70, physical: 68, mood: 74, connection: 66 },
    trend: 'flat',
    // Day 1 — scores badged "Estimating…", forecast widened (§A.9).
    isColdStart: true,
  },
  balanced: {
    pressure: 34,
    vitality: 71,
    subStats: { rest: 66, physical: 74, mood: 70, connection: 62 },
    trend: 'flat',
    isColdStart: false,
  },
  criticalPressure: {
    pressure: 93,
    vitality: 38,
    subStats: { rest: 26, physical: 44, mood: 35, connection: 48 },
    trend: 'up',
    isColdStart: false,
  },
  criticalVitality: {
    pressure: 41,
    vitality: 9,
    subStats: { rest: 6, physical: 22, mood: 14, connection: 19 },
    trend: 'down',
    isColdStart: false,
  },
};

const DemoContext = createContext<DemoValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [scenario, setScenario] = useState<DemoScenario>('populated');
  const [checkInDone, setCheckInDone] = useState(false);
  const [nudgeActive, setNudgeActive] = useState(true);

  const value = useMemo<DemoValue>(
    () => ({
      scenario,
      setScenario,
      capacity: SCENARIO_CAPACITY[scenario],
      loading: scenario === 'loading',
      empty: scenario === 'empty',
      checkInDone,
      setCheckInDone,
      nudgeActive,
      setNudgeActive,
    }),
    [scenario, checkInDone, nudgeActive],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside <DemoProvider>');
  return ctx;
}

export const SCENARIOS: { value: DemoScenario; label: string }[] = [
  { value: 'populated', label: 'Week 4 — Strained' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'criticalPressure', label: 'Critical — pressure' },
  { value: 'criticalVitality', label: 'Critical — vitality' },
  { value: 'empty', label: 'Day 1 — cold start' },
  { value: 'loading', label: 'Loading' },
];
