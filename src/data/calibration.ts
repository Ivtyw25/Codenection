/**
 * Teaching the score it was wrong.
 *
 * Every other number in this app is arithmetic over facts the student can
 * check: so many tasks, so many minutes, these deadlines. That is the model's
 * great strength and also the exact shape of its blind spot — a week can
 * contain nine hours of work and cost one person nothing and another person
 * everything, and no amount of counting minutes will tell the two apart.
 *
 * So the app asks. Once a day, next to its own reading, in the same five-word
 * vocabulary it already uses: Pip thinks you are Strained — is that right? The
 * gap between the answer and the reading is the only piece of information in
 * the system that could not have been derived, and this file is what turns a
 * run of those gaps into a correction.
 *
 * ── Two rules it will not break ────────────────────────────────────────────
 *
 * IT BENDS VITALITY, NEVER PRESSURE. Pressure is the checkable half: it counts
 * work that demonstrably exists. Quietly adjusting it because somebody had a
 * rough Tuesday would corrupt the one number a student can audit against their
 * own task list, and an unauditable Pressure gauge is just a mood ring with a
 * percentage on it. Vitality is the half that is genuinely about the person, so
 * Vitality is the half that learns.
 *
 * IT MOVES SLOWLY AND NOT FAR. The bias is an average over a window, clamped to
 * ±`MAX_BIAS`. A model that lurched after a single check-in would be useless to
 * anyone who has ever had one bad day, and a model with no ceiling could be
 * talked into reporting a catastrophic week as fine — which is the failure mode
 * that actually hurts someone.
 */
import type { Calibration, CheckIn, PipStateName } from '@/types';
import { isoDate } from './format';

/**
 * Where each state sits on the strain axis `derivePipState` thresholds.
 *
 * The midpoints of its bands — balanced <42, strained 42–58, wilting 58–75,
 * depleted 75–90, critical ≥90 — so the distance between two states is measured
 * in the same units the state machine itself uses. Inventing a separate 1–5
 * scale here would mean two different ideas of how far apart "wilting" and
 * "depleted" are, and they would drift.
 */
const STRAIN_AT: Record<PipStateName, number> = {
  balanced: 30,
  strained: 50,
  wilting: 66,
  depleted: 82,
  critical: 95,
};

/** How many recent check-ins the bias is averaged over. */
export const CALIBRATION_WINDOW = 14;

/**
 * The most the app will let itself be talked into.
 *
 * Fifteen points is roughly one state band. Enough to fix a model that reads a
 * particular student consistently wrong; not enough to let a fortnight of
 * cheerful answers hide a genuinely critical week, or a fortnight of bleak ones
 * bury someone whose task list is objectively fine.
 */
export const MAX_BIAS = 15;

/**
 * How much of the error a single check-in is allowed to move the bias.
 *
 * The felt/computed gap is expressed in strain, and strain responds to vitality
 * at 0.6 points per point (`derivePipState`), so a raw conversion is `/0.6`.
 * Damped to a third of that: the student is reporting how a day felt, not
 * filing a correction to the arithmetic, and treating one answer as a precise
 * measurement of their own model would over-fit immediately.
 */
const RESPONSE = 1 / 0.6 / 3;

export const EMPTY_CALIBRATION: Calibration = { entries: [], vitalityBias: 0 };

/** Today's check-in, if it has already been answered. */
export function checkInOn(calibration: Calibration | undefined, day: Date): CheckIn | null {
  const key = isoDate(day);
  return calibration?.entries.find((e) => e.date === key) ?? null;
}

/**
 * Record an answer and re-learn from the window.
 *
 * One entry per day, replacing rather than appending: a student who reconsiders
 * an hour later is correcting today's answer, not casting a second vote, and
 * letting both count would quietly weight talkative days double.
 */
export function recordCheckIn(
  calibration: Calibration | undefined,
  entry: CheckIn,
): Calibration {
  const base = calibration ?? EMPTY_CALIBRATION;
  const entries = [...base.entries.filter((e) => e.date !== entry.date), entry]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-CALIBRATION_WINDOW);

  return { entries, vitalityBias: biasFrom(entries) };
}

/**
 * The correction the window implies.
 *
 * A mean rather than a decayed or weighted series. The signal being chased is a
 * *standing* mismatch — this person runs lower than their task list suggests —
 * and a mean over a fortnight is the honest estimator of that. Anything fancier
 * would be fitting noise with more confidence than fourteen self-reports can
 * carry.
 *
 * Sign convention: `felt` above `computed` on the strain axis means the day was
 * WORSE than the app said, which means the app is over-reading the reserve, so
 * the bias is negative.
 */
export function biasFrom(entries: CheckIn[]): number {
  if (entries.length === 0) return 0;

  const total = entries.reduce(
    (sum, e) => sum + (STRAIN_AT[e.felt] - STRAIN_AT[e.computed]),
    0,
  );
  const meanError = total / entries.length;
  const bias = -meanError * RESPONSE;

  return Math.max(-MAX_BIAS, Math.min(MAX_BIAS, Math.round(bias)));
}

/**
 * What the app has learned, in a sentence it can show the person.
 *
 * Returns null while there is nothing to say. A calibration line that appears
 * after one answer, claiming to have learned something, would be theatre — and
 * this is precisely the screen where theatre costs the most.
 */
export function calibrationNote(calibration: Calibration | undefined): string | null {
  const entries = calibration?.entries ?? [];
  const bias = calibration?.vitalityBias ?? 0;
  if (entries.length < 3) {
    const left = 3 - entries.length;
    return entries.length === 0
      ? null
      : `${left} more check-${left === 1 ? 'in' : 'ins'} before Pip starts adjusting.`;
  }

  if (bias === 0) {
    return `Across ${entries.length} check-ins, Pip's read has matched how the days actually felt. Nothing to correct.`;
  }

  return bias < 0
    ? `Across ${entries.length} check-ins you have consistently felt worse than the task list alone suggested, so Pip now reads your reserve ${-bias} ${-bias === 1 ? 'point' : 'points'} lower than the raw model would.`
    : `Across ${entries.length} check-ins you have consistently felt better than the task list alone suggested, so Pip now reads your reserve ${bias} ${bias === 1 ? 'point' : 'points'} higher than the raw model would.`;
}

/** The five options the check-in opens with, in the order they are shown. */
export const FELT_OPTIONS: { state: PipStateName; label: string; blurb: string }[] = [
  { state: 'balanced', label: 'Good', blurb: 'Steady. Today was fine.' },
  { state: 'strained', label: 'Busy', blurb: 'Full, but I was on top of it.' },
  { state: 'wilting', label: 'Stretched', blurb: 'Running on less than I had.' },
  { state: 'depleted', label: 'Drained', blurb: 'Today took more than it gave.' },
  { state: 'critical', label: 'Done in', blurb: 'I have nothing left.' },
];

// ── The evening conversation ────────────────────────────────────────────────

/**
 * The hour the check-in becomes available.
 *
 * ── Why it is gated at all ─────────────────────────────────────────────────
 *
 * "How was today?" asked at 9am is not a question, it is a prompt to invent an
 * answer. The check-in exists to collect one specific thing — how a day that
 * has actually happened compares to what the app computed about it — and a day
 * that is three hours old has not happened yet. Answering early would feed the
 * calibration a prediction dressed as a report, and the whole model rests on
 * this being the one input that is not a derivation.
 *
 * Nine is late enough that the day is essentially over and early enough that
 * somebody is still awake to answer it.
 */
export const CHECKIN_HOUR = 21;

/** Whether the day has run far enough for the question to mean anything. */
export function checkInOpen(now: Date): boolean {
  return now.getHours() >= CHECKIN_HOUR;
}

/**
 * One turn in the check-in.
 *
 * `felt` is what the answer means on the strain axis; null on turns that are
 * only gathering context and should not move the reading on their own.
 */
export interface CheckInReply {
  id: string;
  label: string;
  /** Where this answer lands, when it revises the read. */
  felt?: PipStateName;
  /** Pip's acknowledgement. Says what it heard, never what it thinks. */
  ack: string;
}

export interface CheckInTurn {
  id: string;
  /** What Pip says before the options. */
  prompt: string;
  replies: CheckInReply[];
}

/**
 * Why this is a conversation rather than a five-way tap.
 *
 * The single-tap version asked "does Pip's read match?" and took the first
 * answer as fact. That is a bad instrument for the thing being measured, for
 * two reasons a single question cannot get around.
 *
 * PEOPLE ANSWER THE EASY VERSION. "Fine" is what anybody types into a wellbeing
 * prompt at the end of a hard day, because it closes the card fastest. A follow
 * up that asks something concrete — did you stop, did you sleep, was any of it
 * yours — gets an answer about the day instead of an answer about the prompt.
 *
 * ONE WORD IS NOT A READING. "Drained" covers a productive day that cost a lot
 * and an empty day that cost more; those are different states and the
 * calibration would learn the wrong thing from either if it could not tell them
 * apart. The second turn is what separates them, and it can revise the reading
 * the first one produced.
 *
 * It stays THREE turns at most. This is a tired person at 9pm, and an interview
 * is a worse instrument than a single question — it gets abandoned, which
 * collects nothing at all.
 */
export const CHECKIN_OPENER: CheckInTurn = {
  id: 'open',
  prompt: 'How did today actually land?',
  replies: FELT_OPTIONS.map((o) => ({
    id: o.state,
    label: o.label,
    felt: o.state,
    ack: o.blurb,
  })),
};

/**
 * The follow-up, chosen by what they just said.
 *
 * Each one probes the specific way its answer is most often wrong — and every
 * branch can move the reading, because the point of asking again is that the
 * second answer is allowed to overrule the first.
 */
export function followUp(felt: PipStateName): CheckInTurn {
  switch (felt) {
    case 'balanced':
      return {
        id: 'balanced_probe',
        prompt: 'Good is the answer people give to close the card. Did today actually have a stop in it?',
        replies: [
          {
            id: 'real_stop',
            label: 'Yes — I properly stopped',
            felt: 'balanced',
            ack: 'Then it was a genuinely good one. Those are worth noticing.',
          },
          {
            id: 'busy_fine',
            label: 'Not really, but I was fine',
            felt: 'strained',
            ack: 'Fine while moving is a different thing from rested. Logged as busy.',
          },
          {
            id: 'no_stop',
            label: 'No, and I felt it by the end',
            felt: 'wilting',
            ack: 'That is worth counting properly rather than rounding up to fine.',
          },
        ],
      };

    case 'strained':
      return {
        id: 'strained_probe',
        prompt: 'Busy covers two very different days. Was today full of things you chose?',
        replies: [
          {
            id: 'chosen',
            label: 'Mostly mine, yes',
            felt: 'strained',
            ack: 'A full day of your own work costs less than a full day of everyone else’s.',
          },
          {
            id: 'reactive',
            label: 'Mostly reacting to other people',
            felt: 'wilting',
            ack: 'That is the more expensive kind of busy, and it rarely shows in a task list.',
          },
          {
            id: 'behind',
            label: 'Spent most of it behind',
            felt: 'depleted',
            ack: 'Running behind all day costs more than the work in it. Noted.',
          },
        ],
      };

    case 'wilting':
      return {
        id: 'wilting_probe',
        prompt: 'Was that mostly the work today, or how you started it?',
        replies: [
          {
            id: 'today',
            label: 'Today was just heavy',
            felt: 'wilting',
            ack: 'A heavy day you can see the end of.',
          },
          {
            id: 'accumulated',
            label: 'I have been running low for days',
            felt: 'depleted',
            ack: 'That changes the reading. A run of days is not the same as one of them.',
          },
        ],
      };

    case 'depleted':
    case 'critical':
      return {
        id: 'depleted_probe',
        prompt: 'Did you sleep badly last night, or is this about what the day asked of you?',
        replies: [
          {
            id: 'sleep',
            label: 'Slept badly',
            felt: 'depleted',
            ack: 'Then tonight matters more than tomorrow’s list does.',
          },
          {
            id: 'load',
            label: 'The day asked too much',
            felt: felt === 'critical' ? 'critical' : 'depleted',
            ack: 'That is the one Pip can actually do something about — a rebalance is built for it.',
          },
          {
            id: 'both',
            label: 'Both, honestly',
            felt: 'critical',
            ack: 'Logged at the bottom of the scale. That is not a failure, it is information.',
          },
        ],
      };
  }
}

/**
 * The closing line, after the reading has settled.
 *
 * States what was recorded and what it will do — nothing else. Advice here
 * would be the app answering a question it just asked, at the moment somebody
 * has least appetite for being told anything.
 */
export function closingLine(felt: PipStateName, computed: PipStateName): string {
  if (felt === computed) {
    return 'That matches what Pip had. Agreeing is as useful an answer as disagreeing — it is what tells the model it is reading you right.';
  }

  const worse = STRAIN_AT[felt] > STRAIN_AT[computed];
  return worse
    ? 'Pip had today lighter than you did. Enough evenings like this and it will start reading your reserve lower than the task list alone suggests.'
    : 'Pip had today heavier than you did. Enough evenings like this and it will stop over-reading what your week is costing you.';
}
