/**
 * Why a sub-stat is where it is, and what would move it.
 *
 * HONEST ABOUT WHAT THIS IS. There is no model behind this file. Every line it
 * produces is arithmetic over the user's own readings, their own targets and
 * the weights in their own `VitalityModel` — which is exactly why it can quote
 * the numbers it is reasoning from. An explanation the user cannot check is
 * worse than no explanation, and a wellbeing score that says "our AI thinks you
 * should rest more" without showing its working is the thing this screen exists
 * to be the opposite of.
 *
 * The seam is the right shape for a real model: swap `explainVital` for a
 * generated response and the screen does not change. But it would still have to
 * cite these same figures, because they are what the score is made of.
 */
import type { Capacity, VitalId, VitalReading } from '@/types';
import { formatDayHeading } from './format';

export type DriverTone = 'good' | 'watch' | 'bad';

/** One reason the number is what it is. Each cites a figure from the data. */
export interface Driver {
  text: string;
  tone: DriverTone;
}

export interface Suggestion {
  title: string;
  why: string;
  /** What it would be worth, in points of Vitality. */
  lift: string;
}

export interface VitalExplanation {
  headline: string;
  drivers: Driver[];
  suggestions: Suggestion[];
}

export interface VitalPoint {
  date: string;
  value: number;
  isToday: boolean;
}

/**
 * What raising a sub-stat by `points` is worth to the reserve.
 *
 * This is the whole reason the weights are user-visible: a fifteen-point gain
 * in Social Connection moves Vitality by two, and telling someone to fix their
 * weakest number without saying what it buys them is how an app ends up
 * nagging about something that barely matters.
 */
function lift(points: number, weight: number): string {
  const gain = Math.round(points * weight);
  if (gain <= 0) return 'Holds the line rather than raising it';
  return `About +${gain} Vitality`;
}

/** "1 point" / "2 points" — a wellbeing screen cannot afford to read as a draft. */
function points(n: number): string {
  return `${n} ${n === 1 ? 'point' : 'points'}`;
}

/** Consecutive days ending today that sat below the user's mark. */
function daysBelow(series: VitalPoint[], target: number): number {
  let run = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].value >= target) break;
    run += 1;
  }
  return run;
}

// ── Suggestions ─────────────────────────────────────────────────────────────

/**
 * What actually moves each sub-stat.
 *
 * Deliberately small, concrete and same-day. "Improve your sleep hygiene" is
 * advice; "protect a seven-hour window tonight" is something a person can
 * either do or not do by bedtime, which is the only kind of suggestion worth
 * putting in front of someone whose reserve is already low.
 */
const PLAYBOOK: Record<VitalId, { title: string; why: string; points: number }[]> = {
  rest: [
    {
      title: 'Protect a seven-hour window tonight',
      why: 'Rest carries more of your reserve than anything else, and it is the fastest of the four to recover.',
      points: 9,
    },
    {
      title: 'Pull your last block earlier',
      why: 'Your plan can run to 10pm. Finishing the last step before 8 leaves a real wind-down instead of a hard stop.',
      points: 5,
    },
    {
      title: 'Put tomorrow’s first block after 9am',
      why: 'A late start is worth more than a long lie-in you spend feeling behind.',
      points: 4,
    },
  ],
  mood: [
    {
      title: 'Close one small thing',
      why: 'Finishing a task credits the reserve directly, and the two-minute items exist for exactly this.',
      points: 6,
    },
    {
      title: 'Log a check-in',
      why: 'A subjective bad day nudges the score before your behaviour catches up — Pip cannot see it otherwise.',
      points: 4,
    },
    {
      title: 'Name the draining commitment in Weekly Reflect',
      why: 'Two ten-hour weeks are not equal. Marking what drains you changes how it is weighed from then on.',
      points: 7,
    },
  ],
  physical: [
    {
      title: 'Take a twenty-minute walk between blocks',
      why: 'Your plan already has gaps between steps. One of them is long enough.',
      points: 6,
    },
    {
      title: 'Put one session on tomorrow’s timeline',
      why: 'Scheduled recovery survives a busy day; unscheduled recovery does not.',
      points: 8,
    },
  ],
  social: [
    {
      title: 'Message one person today',
      why: 'This is the sub-stat that decays without anything going wrong, so it is also the one a single message moves.',
      points: 10,
    },
    {
      title: 'Attach a study block to someone',
      why: 'You have work planned regardless. Doing an hour of it beside a friend costs no extra time.',
      points: 12,
    },
    {
      title: 'Put a shared meal on tomorrow’s plan',
      why: 'A scheduled hour with someone is the only version of this that reliably happens.',
      points: 15,
    },
  ],
};

// ── The explanation ─────────────────────────────────────────────────────────

export function explainVital(
  reading: VitalReading,
  series: VitalPoint[],
  capacity: Capacity,
): VitalExplanation {
  const gap = reading.value - reading.target;
  const past = series.filter((p) => !p.isToday);
  const first = past[0];
  const prev = past[past.length - 1];
  const drivers: Driver[] = [];

  // 1. Where it sits against this user's own mark.
  drivers.push(
    gap >= 0
      ? {
          text: `${reading.value} against your ${reading.target} mark — ${gap === 0 ? 'exactly on it' : `${gap} above`}.`,
          tone: 'good',
        }
      : {
          text: `${reading.value} against your ${reading.target} mark — ${-gap} below.`,
          tone: gap < -12 ? 'bad' : 'watch',
        },
  );

  // 2. Which way it has moved, and from when.
  if (first) {
    const since = reading.value - first.value;
    const when = formatDayHeading(first.date).replace(/^TODAY · |^TOMORROW · /, '');
    if (Math.abs(since) >= 3) {
      drivers.push({
        text: `${since > 0 ? 'Up' : 'Down'} ${Math.abs(since)} points since ${when}.`,
        tone: since > 0 ? 'good' : 'watch',
      });
    } else {
      drivers.push({ text: `Flat since ${when} — within three points all week.`, tone: 'good' });
    }
  }

  // 3. Day-over-day, which is the one a person can still act on.
  if (prev) {
    const step = reading.value - prev.value;
    if (Math.abs(step) >= 4) {
      drivers.push({
        text: `${step > 0 ? 'Up' : 'Down'} ${Math.abs(step)} since yesterday.`,
        tone: step > 0 ? 'good' : 'watch',
      });
    }
  }

  // 4. How long it has been under. A run is the signal; one bad day is noise.
  const run = daysBelow(series, reading.target);
  if (run >= 3) {
    drivers.push({
      text: `${run} days running below your mark — long enough to be a pattern, not a bad day.`,
      tone: 'bad',
    });
  }

  // 5. What the gap is actually costing, via this stat's weight.
  const pct = Math.round(reading.weight * 100);
  drivers.push(
    gap >= 0
      ? {
          text: `Worth ${pct}% of your reserve, contributing ${reading.contribution} of its points.`,
          tone: 'good',
        }
      : {
          text: `Worth ${pct}% of your reserve, so this gap is costing you about ${points(Math.max(1, Math.round(-gap * reading.weight)))} of Vitality.`,
          tone: 'watch',
        },
  );

  // 6. The one cross-link the spec is explicit about: pressure erodes recovery.
  if ((reading.id === 'rest' || reading.id === 'mood') && capacity.pressure >= 50) {
    drivers.push({
      text: `Pressure is at ${capacity.pressure}%. Sustained load erodes this one first, so it is worth watching while the week is heavy.`,
      tone: 'watch',
    });
  }

  const headline =
    reading.standing === 'strong'
      ? `${reading.label} is doing its job. Nothing here needs fixing.`
      : reading.standing === 'fair'
        ? `${reading.label} is slightly under where you want it — recoverable today.`
        : `${reading.label} is the one holding your reserve back right now.`;

  // A strong stat gets the cheapest maintenance move, not a to-do list.
  const plays = PLAYBOOK[reading.id];
  const suggestions = (reading.standing === 'strong' ? plays.slice(0, 1) : plays).map((play) => ({
    title: play.title,
    why: play.why,
    /*
     * Capped at the gap when the stat is under its mark.
     *
     * Getting Rest from 71 to its 75 mark is worth one point of Vitality, not
     * the three a nine-point swing would imply — promising the bigger number
     * would be the app overselling a nudge, which is how these screens lose
     * trust. It also makes the weighting legible: every play on a 15%-weight
     * stat is worth about two points, and that is the honest reason to spend
     * the effort somewhere heavier first.
     */
    lift: lift(gap < 0 ? Math.min(play.points, -gap) : play.points, reading.weight),
  }));

  return { headline, drivers, suggestions };
}
