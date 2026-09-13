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
import { formatDayHeading } from './format';

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

  const paragraphs: string[] = [];

  /*
   * 1. Where it sits, and how it got there — one sentence, one joined thought.
   *
   * The standing and the trend belong together. "16 below your mark" and "down
   * 9 since Monday" as separate bullets makes the reader work out that the
   * second explains the first; as one sentence it simply says so.
   */
  const when = first ? formatDayHeading(first.date).replace(/^TODAY · |^TOMORROW · /, '') : '';
  if (under && since <= -3) {
    paragraphs.push(
      `${reading.label} is at ${reading.value}, which is ${-gap} under the ${reading.target} you should be staying above. It has been sliding since ${when} — down ${points(-since)} across the week — and ${mechanism.slide}.`,
    );
  } else if (under) {
    paragraphs.push(
      `${reading.label} is at ${reading.value}, ${-gap} under the ${reading.target} you should be staying above. It has not fallen far this week; it simply has not come back up, and ${mechanism.slide}.`,
    );
  } else if (since >= 3) {
    paragraphs.push(
      `${reading.label} is at ${reading.value}, comfortably above the ${reading.target} you need to stay over, and it has climbed ${points(since)} since ${when}. Right now ${mechanism.hold}.`,
    );
  } else {
    paragraphs.push(
      `${reading.label} is at ${reading.value}, holding above the ${reading.target} you need to stay over and steady within a few points all week. ${capitalise(mechanism.hold)}.`,
    );
  }

  /*
   * 2. The run. This is the paragraph that turns a reading into a pattern, and
   * it is the one a person most needs, because a single bad day is noise and
   * five in a row is a thing that is happening to them.
   */
  if (run >= 3) {
    paragraphs.push(
      `This is ${days(run)} in a row below your mark, which is long enough to be a pattern rather than a bad night. That is what is breaking here — not the size of any one day, but that nothing has interrupted the run, and ${mechanism.slow}.`,
    );
  } else if (run > 0 && step <= -4) {
    paragraphs.push(
      `It dropped ${points(-step)} since yesterday, so this is a recent dip rather than a settled pattern — which is the easiest possible moment to interrupt it, because ${mechanism.slow}.`,
    );
  }

  /*
   * 3. What the gap costs, via this stat's own weight. The whole reason the
   * weights are visible: a fifteen-point hole in a 15%-weight stat is worth two
   * points of reserve, and a student deciding where to spend a tired evening
   * deserves to know that before they spend it.
   */
  if (under) {
    paragraphs.push(
      `${reading.label} carries ${pct}% of your reserve, so this gap alone is costing you about ${points(Math.max(1, Math.round(-gap * reading.weight)))} of Vitality. Closing it back to ${reading.target} is worth roughly that much, and no more — which is worth knowing before you spend an evening on it.`,
    );
  } else {
    paragraphs.push(
      `It carries ${pct}% of your reserve and is currently contributing ${reading.contribution} of its points. Nothing here needs fixing; it needs not being spent.`,
    );
  }

  /*
   * 4. The one cross-link the spec is explicit about: sustained load erodes
   * recovery. Only said when it is actually true, and only for the two stats it
   * is true of — a caveat that appears every time is a caveat nobody reads.
   */
  if ((reading.id === 'rest' || reading.id === 'mood') && capacity.pressure >= 50) {
    paragraphs.push(
      `Worth reading alongside your Pressure, which is at ${capacity.pressure}. Sustained load erodes this sub-stat before any of the others, so while the week stays this heavy it will keep pulling downward on its own — recovering it and lightening the week are the same job.`,
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
