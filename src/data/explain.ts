/**
 * Why a sub-stat is where it is, said as sentences.
 *
 * HONEST ABOUT WHAT THIS IS. There is no model behind this file. Every line it
 * produces is arithmetic over the user's own readings, their own suggested
 * marks and the weights in their own `VitalityModel` — which is exactly why it
 * can quote the numbers it is reasoning from. An explanation the user cannot
 * check is worse than no explanation, and a wellbeing score that says "our AI
 * thinks you should rest more" without showing its working is the thing this
 * screen exists to be the opposite of.
 *
 * ── Why this stopped being a bullet list ───────────────────────────────────
 *
 * It used to emit six `Driver` rows, each a coloured dot and a fragment: "44
 * against your 60 mark — 16 below." "Down 9 points since Monday." "5 days
 * running below your mark." Every one of those was true and the list as a whole
 * explained nothing, because a reader has to assemble the causal story out of
 * six disconnected facts themselves — and the person reading this screen is by
 * definition the person with the least capacity to do that today.
 *
 * A bulleted number is a reading. A sentence is a diagnosis. What someone
 * actually wants here is "your physical vitality has been sliding all weekend —
 * you have not done anything active in five days, and it is the slowest of the
 * four to come back", which is the same arithmetic, joined up, with the
 * mechanism named. So this file now writes paragraphs: what the stat is doing,
 * what is breaking, and why it is dropping.
 *
 * ── What it deliberately no longer does ────────────────────────────────────
 *
 * It does not suggest anything. The old `Suggestion[]` — "protect a seven-hour
 * window tonight", priced in points — has moved to `recovery.ts`, where it
 * belongs: those are actions, actions need to be scheduled to happen at all,
 * and scheduling them is the Rebalancer's job. Explaining a number and
 * proposing work are two jobs, and doing both on one screen meant the reader
 * got a diagnosis and a to-do list at the moment they were least able to take
 * on either.
 */
import type { Capacity, VitalId, VitalReading } from '@/types';

export interface VitalExplanation {
  /** The one-line read, shown at body size above the paragraphs. */
  headline: string;
  /**
   * The explanation proper. Two to four paragraphs, in causal order: where it
   * sits, what has been happening to it, and what that is costing.
   */
  paragraphs: string[];
  /** The working shown — what the sentences above were computed from. */
  basis: string;
}

export interface VitalPoint {
  date: string;
  value: number;
  isToday: boolean;
}

/** "1 point" / "2 points" — a wellbeing screen cannot afford to read as a draft. */
function points(n: number): string {
  return `${n} ${n === 1 ? 'point' : 'points'}`;
}

/** "day" / "days", for the run-length sentences. */
function days(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

/** Consecutive days ending today that sat below the user's suggested mark. */
function daysBelow(series: VitalPoint[], target: number): number {
  let run = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].value >= target) break;
    run += 1;
  }
  return run;
}

/**
 * What this sub-stat is actually made of, in the second person.
 *
 * The mechanism sentence is the whole reason the prose beats the bullets: "down
 * 9 points" tells you the number moved, and "you have not done anything active
 * in five days" tells you what moved it. These are the plain-language
 * behavioural readings behind each stat — deliberately phrased as things a
 * person does or stops doing, because those are the only things they can change.
 */
const MECHANISM: Record<VitalId, { slide: string; hold: string; slow: string }> = {
  rest: {
    slide: 'short nights stack up faster than any other deficit here',
    hold: 'your nights have been long enough to clear the day',
    slow: 'it is also the quickest of the four to come back — one protected night moves it visibly',
  },
  mood: {
    slide:
      'a run of heavy days erodes this one before it shows up anywhere else you would notice',
    hold: 'you have been finishing things, and closing work credits this directly',
    slow: 'it responds within a day or two, usually to something small being finished rather than something large being fixed',
  },
  physical: {
    slide: 'days without anything active accumulate quietly — nothing goes wrong, it just drifts',
    hold: 'you have been moving enough to keep it where you want it',
    slow: 'it is the slowest of the four to recover, so it is worth catching before it gets far under',
  },
  social: {
    slide:
      'this is the one that decays without anything going wrong — no argument, no falling-out, just a week where nobody was seen',
    hold: 'you have kept enough contact to hold it steady',
    slow: 'it also rebounds faster than it looks — one real conversation moves it more than any other stat responds to anything',
  },
};

export function explainVital(
  reading: VitalReading,
  series: VitalPoint[],
  capacity: Capacity,
): VitalExplanation {
  const gap = reading.value - reading.target;
  const under = gap < 0;
  const past = series.filter((p) => !p.isToday);
  const first = past[0];
  const prev = past[past.length - 1];
  const since = first ? reading.value - first.value : 0;
  const step = prev ? reading.value - prev.value : 0;
  const run = daysBelow(series, reading.target);
  const mechanism = MECHANISM[reading.id];
  const pct = Math.round(reading.weight * 100);

  /*
   * TWO paragraphs, hard cap.
   *
   * This was four to five, each of them individually justified — where it sits,
   * how long the run is, what the gap costs via the weight, and a Pressure
   * cross-link. Read on the screen it was a wall of text on the one page
   * somebody opens when they already feel flat, and the honest test is that
   * nobody reaches the fourth paragraph about their own sleep.
   *
   * So it says the two things only prose can say — what is happening, and what
   * is causing it — and lets the chart, the chips and the projection carry the
   * rest. Every number that used to be argued in a sentence is still on the
   * screen; it is just rendered instead of narrated.
   */
  const paragraphs: string[] = [];

  /*
   * 1. Where it sits, and how it got there — one sentence, one joined thought.
   *
   * The standing and the trend belong together. "16 below your mark" and "down
   * 9 since Monday" as separate bullets makes the reader work out that the
   * second explains the first; as one sentence it simply says so.
   */
  if (under && since <= -3) {
    paragraphs.push(
      `Down ${points(-since)} this week and ${-gap} under the ${reading.target} it needs to stay above — ${mechanism.slide}.`,
    );
  } else if (under) {
    paragraphs.push(
      `Sitting ${-gap} under the ${reading.target} it needs to stay above. It has not fallen far; it just has not come back, and ${mechanism.slide}.`,
    );
  } else if (since >= 3) {
    paragraphs.push(
      `Up ${points(since)} this week and clear of the ${reading.target} it needs to stay above — ${mechanism.hold}.`,
    );
  } else {
    paragraphs.push(
      `Holding above the ${reading.target} it needs to stay above, steady within a few points all week — ${mechanism.hold}.`,
    );
  }

  /*
   * 2. What is actually breaking. A run turns a reading into a pattern, which
   * is the one thing the chart above cannot say on its own — and if there is no
   * run, the cost of the gap is the more useful second sentence. One or the
   * other, never both.
   */
  if (run >= 3) {
    paragraphs.push(
      `${capitalise(days(run))} in a row below the line now — a pattern rather than a bad night, and ${mechanism.slow}.`,
    );
  } else if (run > 0 && step <= -4) {
    paragraphs.push(
      `It dropped ${points(-step)} since yesterday, so this is a dip rather than a pattern — the easiest moment to interrupt it, because ${mechanism.slow}.`,
    );
  } else if (under) {
    paragraphs.push(
      `At ${pct}% of your reserve, this gap is costing about ${points(Math.max(1, Math.round(-gap * reading.weight)))} of Vitality.`,
    );
  } else if ((reading.id === 'rest' || reading.id === 'mood') && capacity.pressure >= 50) {
    // The one cross-link the spec is explicit about, and the only place it
    // still earns a line: a healthy stat with a heavy week ahead of it.
    paragraphs.push(
      `Your Pressure is at ${capacity.pressure} though, and sustained load erodes this one first — worth watching while the week stays heavy.`,
    );
  }

  const headline = under
    ? reading.standing === 'low'
      ? `${reading.label} is the one holding your reserve back right now.`
      : `${reading.label} has slipped under where it needs to be — still recoverable today.`
    : `${reading.label} is doing its job.`;

  return {
    headline,
    paragraphs,
    basis: `Worked out from your own readings, the ${reading.target} mark suggested for this stat and the ${pct}% weight it carries in your reserve. No part of it is a guess about you.`,
  };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
