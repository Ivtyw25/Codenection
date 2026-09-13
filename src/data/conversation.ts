/**
 * The end-of-day conversation.
 *
 * The check-in used to be a branching menu: five buttons, then three more, and
 * a reading at the end. It collected clean data and it asked the wrong kind of
 * question — because the options ARE the answer. A student who picks "Busy"
 * from a list has not told the app anything it did not already write down; they
 * have agreed with one of five sentences Pip wrote in advance, which is a
 * different act from describing a day.
 *
 * So this file replaces the menu with a conversation. Pip asks, the student
 * types whatever they want, and this module reads it. Three things follow from
 * that which the menu could not do:
 *
 *   THE ANSWER CAN BE SOMETHING PIP DID NOT THINK OF. "Fine but I didn't eat
 *   until nine" is not on any list of five, and it is the sentence that
 *   actually explains the day.
 *
 *   THE WORDS COME BACK. Every acknowledgement here quotes what the student
 *   typed. A reply that repeats your own phrase is how a person proves they
 *   listened, and it is the cheapest honest signal an app has.
 *
 *   IT CAN ADMIT IT DID NOT UNDERSTAND. A menu never misreads because it never
 *   reads. This one does, and when its confidence is low it says so and asks
 *   again rather than filing a guess as a measurement.
 *
 * ── What the "AI" is ───────────────────────────────────────────────────────
 *
 * A lexicon and about forty lines of arithmetic, run on the device. It is not
 * pretending to be a language model and the prototype does not claim it is: it
 * scores cue words on the same strain axis `derivePipState` already uses,
 * handles negation and intensity, and reports how sure it is. Where a shipped
 * Pip would call a model, this is the seam — `readFeeling` is the only function
 * that would be replaced, and everything downstream of it is already written
 * against a confidence-carrying result rather than against a certainty.
 */
import type { PipStateName } from '@/types';
import { STRAIN_AT } from './calibration';

/** Best-first, so a band can be stepped up or down by index. */
const LADDER: PipStateName[] = ['balanced', 'strained', 'wilting', 'depleted', 'critical'];

/** The plain-word name for each state, as the conversation says it out loud. */
export const FELT_WORD: Record<PipStateName, string> = {
  balanced: 'good',
  strained: 'busy',
  wilting: 'stretched',
  depleted: 'drained',
  critical: 'done in',
};

// ── Reading what they typed ─────────────────────────────────────────────────

/**
 * The lexicon.
 *
 * Each entry is a set of words that land at roughly the same place on the
 * strain axis — the same axis `derivePipState` scores, so a read here is
 * directly comparable to what the app computed rather than living on a private
 * 1–5 scale that would have to be mapped twice.
 *
 * Deliberately built from how students actually write at 10pm — contractions,
 * British and American spellings, and the flat understatements ("meh", "a lot
 * on") that carry most of the signal in a one-line answer.
 */
const LEXICON: { strain: number; words: string[] }[] = [
  {
    strain: 20,
    words: [
      'great', 'amazing', 'brilliant', 'fantastic', 'wonderful', 'excellent', 'lovely',
      'perfect', 'restful', 'refreshed', 'energised', 'energized',
    ],
  },
  {
    strain: 32,
    words: [
      'good', 'fine', 'ok', 'okay', 'alright', 'decent', 'solid', 'steady', 'calm', 'chill',
      'relaxed', 'rested', 'easy', 'light', 'manageable', 'productive', 'happy', 'fun',
      'nice', 'sorted', 'smooth', 'clear', 'stopped', 'slept',
    ],
  },
  {
    strain: 50,
    words: [
      'busy', 'full', 'packed', 'hectic', 'lots', 'loads', 'plenty', 'nonstop', 'rushed',
      'tight', 'quick', 'fast', 'flat', 'normal', 'usual', 'average', 'fair',
    ],
  },
  {
    strain: 66,
    words: [
      'tired', 'tiring', 'stretched', 'long', 'heavy', 'hard', 'tough', 'rough', 'stress', 'bad',
      'stressed', 'stressful', 'behind', 'messy', 'scattered', 'frazzled', 'foggy',
      'unfocused', 'distracted', 'sluggish', 'meh', 'struggling', 'pushed', 'late',
      'overloaded', 'sleepy',
    ],
  },
  {
    strain: 82,
    words: [
      'exhausted', 'drained', 'shattered', 'knackered', 'wiped', 'spent', 'burnt', 'burned',
      'overwhelmed', 'anxious', 'awful', 'terrible', 'horrible', 'miserable', 'dreading',
      'panicking', 'panic', 'crushed', 'sick', 'unwell', 'low', 'worse', 'horrid',
    ],
  },
  {
    strain: 95,
    words: [
      'empty', 'nothing', 'broken', 'cope', 'collapse', 'collapsed', 'hopeless', 'worst',
      'destroyed', 'dead', 'crying', 'breaking', 'unbearable', 'quit',
    ],
  },
];

/** Multi-word phrases, checked before the word pass so they win outright. */
const PHRASES: { strain: number; phrase: string }[] = [
  { strain: 95, phrase: 'nothing left' },
  { strain: 95, phrase: "can't cope" },
  { strain: 95, phrase: 'cannot cope' },
  { strain: 95, phrase: 'done in' },
  { strain: 95, phrase: 'falling apart' },
  { strain: 95, phrase: 'give up' },
  { strain: 82, phrase: 'burnt out' },
  { strain: 82, phrase: 'burned out' },
  { strain: 82, phrase: 'too much' },
  { strain: 82, phrase: 'never stopped' },
  { strain: 82, phrase: "didn't stop" },
  { strain: 82, phrase: 'did not stop' },
  { strain: 66, phrase: 'a lot on' },
  { strain: 66, phrase: 'ran out of time' },
  { strain: 66, phrase: 'behind on' },
  { strain: 66, phrase: 'no break' },
  { strain: 66, phrase: 'back to back' },
  { strain: 66, phrase: 'back-to-back' },
  { strain: 50, phrase: 'a lot' },
  { strain: 32, phrase: 'on top of it' },
  { strain: 32, phrase: 'took a break' },
  { strain: 32, phrase: 'went well' },
  { strain: 20, phrase: 'really good' },
];

/** Words that flip the term after them around the midpoint. */
const NEGATORS = [
  'not', 'no', 'never', 'hardly', 'barely', 'without', 'wasnt', 'werent', 'didnt', 'dont',
  'cant', 'couldnt', 'isnt', 'aint',
];

/** Push the term further from the middle. */
const INTENSIFIERS = [
  'very', 'really', 'so', 'super', 'totally', 'completely', 'absolutely', 'utterly',
  'incredibly', 'extremely', 'properly', 'genuinely', 'beyond', 'insanely',
];

/** Pull it back toward the middle. */
const SOFTENERS = [
  'bit', 'slightly', 'little', 'kinda', 'kind', 'sort', 'somewhat', 'mildly', 'fairly',
  'quite', 'mostly', 'ish',
];

export type Confidence = 'high' | 'medium' | 'low';

/**
 * What one typed answer was read as.
 *
 * `felt` is null when nothing in the sentence carried a feeling — which is a
 * real and common outcome ("worked on the essay and then went to Tesco") and
 * has to be representable, because the alternative is the parser inventing a
 * state out of a shopping trip.
 */
export interface FeelingRead {
  felt: PipStateName | null;
  /** Where it landed on the strain axis, 0–100. */
  strain: number;
  confidence: Confidence;
  /** The words it actually keyed on, in the student's own spelling. */
  cues: string[];
}

const norm = (text: string) => text.toLowerCase().replace(/['’]/g, '');

/**
 * Read a free-text answer as a point on the strain axis.
 *
 * Weighted toward the extremes: a sentence containing both "fine" and
 * "exhausted" is not a neutral day, it is a bad day being minimised, and a flat
 * mean would file it as ordinary. Each cue's weight grows with its distance
 * from the middle, so the strong word carries the sentence — which is also how
 * a person reading it would take it.
 */
export function readFeeling(text: string): FeelingRead {
  const flat = norm(text);
  const hits: { strain: number; cue: string }[] = [];

  /*
   * Phrases first, and they consume their own words.
   *
   * "never stopped" scores as a phrase; without `claimed`, its "stopped" then
   * matched again as a positive cue and the acknowledgement quoted both back —
   * "‘never stopped’ and ‘stopped’" — which reads like something that has not
   * understood either.
   */
  const claimed = new Set<string>();
  for (const { strain, phrase } of PHRASES) {
    const flatPhrase = norm(phrase);
    if (!flat.includes(flatPhrase)) continue;
    hits.push({ strain, cue: phrase });
    for (const word of flatPhrase.split(/[^a-z]+/).filter(Boolean)) claimed.add(word);
  }

  const tokens = flat.split(/[^a-z]+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    if (claimed.has(tokens[i])) continue;
    const entry = LEXICON.find((e) => e.words.includes(tokens[i]));
    if (!entry) continue;

    let strain = entry.strain;
    // Look back two words for the modifiers that change what this one means.
    const before = tokens.slice(Math.max(0, i - 2), i);
    /*
     * The modifier travels with the cue.
     *
     * Without this, "not great" was scored correctly and then quoted back as
     * “great” — the acknowledgement agreeing with the opposite of what was
     * said, which is the single most damaging thing a listening-back line can
     * do. What gets quoted must be what got scored.
     */
    const modifier = [...before]
      .reverse()
      .find((w) => NEGATORS.includes(w) || INTENSIFIERS.includes(w) || SOFTENERS.includes(w));
    const cue = modifier ? `${modifier} ${tokens[i]}` : tokens[i];

    if (before.some((w) => NEGATORS.includes(w))) {
      /*
       * Negation reflects, but not all the way.
       *
       * A mirror about the midpoint made "not great" score 80 — worse than
       * "exhausted" scores on its own, which is plainly not what anybody means
       * by it. Denying a word is weaker than asserting its opposite: "not
       * great" is a shrug and "awful" is a report. Damping the reflection to
       * 0.8 puts "not great" in the stretched band and "not bad" in the fine
       * one, which is where a person would put them.
       */
      strain = 50 + (50 - strain) * 0.8;
    } else if (before.some((w) => INTENSIFIERS.includes(w))) {
      strain = 50 + (strain - 50) * 1.4;
    } else if (before.some((w) => SOFTENERS.includes(w))) {
      strain = 50 + (strain - 50) * 0.6;
    }

    hits.push({ strain: Math.max(0, Math.min(100, strain)), cue });
  }

  if (hits.length === 0) {
    return { felt: null, strain: 50, confidence: 'low', cues: [] };
  }

  let total = 0;
  let weight = 0;
  for (const hit of hits) {
    const w = 1 + Math.abs(hit.strain - 50) / 20;
    total += hit.strain * w;
    weight += w;
  }
  const strain = total / weight;

  const strongest = Math.max(...hits.map((h) => Math.abs(h.strain - 50)));
  const confidence: Confidence =
    strongest >= 25 ? 'high' : hits.length >= 2 ? 'medium' : 'low';

  return {
    felt: nearestState(strain),
    strain: Math.round(strain),
    confidence,
    // De-duplicated, longest first — the phrase is the better thing to quote
    // back when both a phrase and one of its words matched.
    cues: [...new Set(hits.map((h) => h.cue))].sort((a, b) => b.length - a.length).slice(0, 3),
  };
}

/** The state whose band midpoint this strain sits closest to. */
export function nearestState(strain: number): PipStateName {
  return LADDER.reduce((best, state) =>
    Math.abs(STRAIN_AT[state] - strain) < Math.abs(STRAIN_AT[best] - strain) ? state : best,
  );
}

/**
 * Two reads of the same day, resolved into one.
 *
 * The later answer wins whenever it carried real signal, because the follow-up
 * exists precisely to be allowed to overrule the opener — that is the whole
 * argument for asking twice. A vague or feeling-free second answer ("mostly
 * lectures, then the library") leaves the first standing rather than dragging
 * the reading toward neutral, which is what averaging would quietly do.
 */
export function combine(first: FeelingRead, second: FeelingRead): FeelingRead {
  if (second.felt == null) return first;
  if (first.felt == null) return second;
  return second.confidence === 'low' ? first : second;
}

// ── Reading agreement ───────────────────────────────────────────────────────

export type Agreement = 'agrees' | 'lighter' | 'heavier' | 'unclear';

const AGREE = [
  'yes', 'yeah', 'yep', 'yup', 'right', 'correct', 'accurate', 'matches', 'sounds about',
  'spot on', 'pretty much', 'thats it', 'true', 'agree', 'exactly', 'suppose so', 'i guess',
];
const HEAVIER = [
  'worse', 'harder', 'heavier', 'too low', 'underst', 'more than that', 'rougher',
  'generous', 'flattering', 'harsher',
];
const LIGHTER = [
  'better', 'lighter', 'easier', 'too high', 'overst', 'not that bad', 'less than that',
  'exaggerat', 'over-read', 'over reading', 'over-reading',
];

/**
 * Did the number match?
 *
 * Direction matters more than the yes/no, which is why this returns three
 * different disagreements rather than a boolean. "No, it was worse than that"
 * and "no, it's not that bad" are the two halves of the only question this
 * screen exists to ask, and collapsing them into `false` would throw away
 * exactly the bit the calibration learns from.
 */
export function readAgreement(text: string): Agreement {
  const flat = norm(text);
  const heavier = HEAVIER.some((w) => flat.includes(w));
  const lighter = LIGHTER.some((w) => flat.includes(w));
  if (heavier && !lighter) return 'heavier';
  if (lighter && !heavier) return 'lighter';

  const denies = /\b(no|nope|not really|nah|off|wrong)\b/.test(flat);
  if (AGREE.some((w) => flat.includes(w)) && !denies) return 'agrees';
  if (denies) {
    // A bare "no" with a feeling word after it tells us the direction anyway.
    const read = readFeeling(text);
    if (read.felt) return read.strain > 55 ? 'heavier' : 'lighter';
    return 'unclear';
  }
  return 'unclear';
}

/** One band worse, or one band better. Clamped at both ends of the ladder. */
export function shift(felt: PipStateName, by: number): PipStateName {
  const i = LADDER.indexOf(felt);
  return LADDER[Math.max(0, Math.min(LADDER.length - 1, i + by))];
}

// ── What Pip says ───────────────────────────────────────────────────────────

/**
 * The opener.
 *
 * States its own reading FIRST, with the two numbers behind it, before asking
 * anything. An app that asks how you are and only afterwards reveals it had
 * already decided is running an exam; showing its working first makes the
 * question what it claims to be — a check on a number the student can see.
 */
export function opening(computed: PipStateName, pressure: number, vitality: number): string[] {
  return [
    `Pip has today at pressure ${pressure} and reserve ${vitality}, which reads as ${FELT_WORD[computed]}. That is counted off your task list, and a task list only ever knows half of it.`,
    'So — how did today actually land? Say it however you want.',
  ];
}

/** When nothing in the answer carried a feeling. Asked once, then it moves on. */
export const NUDGE =
  'I got the shape of the day but not what it cost you. Was it a day you would want again, or one you were glad to see the back of?';

/**
 * Pip repeating the answer back.
 *
 * Quotes the student's own words — the one thing in this exchange that could
 * not have been generated before they typed, and the cheapest honest proof that
 * something read it. A generic "thanks for sharing" would be the tell that
 * nothing did.
 */
export function acknowledge(read: FeelingRead): string {
  if (read.cues.length === 0 || read.felt == null) return 'Noted.';
  const quoted = read.cues.map((c) => `“${c}”`);
  const list =
    quoted.length === 1
      ? quoted[0]
      : `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`;

  const hedge = read.confidence === 'low' ? 'I might be reading too much into this, but ' : '';
  return `${hedge}${list} — I am taking that as ${FELT_WORD[read.felt]}.`;
}

/**
 * The follow-up, chosen by what the opener was read as.
 *
 * Each probes the specific way its band is most often wrong. Open questions,
 * not offered answers: the previous version's three tappable replies were the
 * app writing the interesting half of the sentence and leaving the student to
 * confirm it.
 */
export function probe(felt: PipStateName): string {
  switch (felt) {
    case 'balanced':
      return 'Good is also the fastest way to close a card like this. Did today actually have a stop in it — a proper one, where you were not half-working?';
    case 'strained':
      return 'Busy covers two very different days. Was today full of your own work, or full of reacting to other people?';
    case 'wilting':
      return 'Was that today specifically, or has it been building for a few days?';
    case 'depleted':
      return 'Is that mostly last night — sleep — or is it what today asked of you?';
    case 'critical':
      return 'That is a hard day to have had. Is it one thing that did it, or has everything been landing at once?';
  }
}

/**
 * The question the whole screen exists for.
 *
 * Named plainly: does the number match. When Pip's read and the student's
 * already disagree it says so out loud rather than asking a question whose
 * answer it has visibly guessed — being caught pretending not to know is worse
 * than disagreeing.
 */
export function verify(
  felt: PipStateName,
  computed: PipStateName,
  pressure: number,
  vitality: number,
): string {
  if (felt === computed) {
    return `That lines up with what I had — pressure ${pressure}, reserve ${vitality}. Before I log it: does ${vitality} actually feel like what you have left in the tank, or is the number flattering you?`;
  }
  const worse = STRAIN_AT[felt] > STRAIN_AT[computed];
  return worse
    ? `My numbers had today lighter than you are describing it — pressure ${pressure}, reserve ${vitality}, which I called ${FELT_WORD[computed]}. You sound closer to ${FELT_WORD[felt]}. Is the ${vitality} too generous, or was there something today the task list could not see?`
    : `My numbers had today heavier than you are describing it — pressure ${pressure}, reserve ${vitality}, which I called ${FELT_WORD[computed]}. You sound closer to ${FELT_WORD[felt]}. Is ${pressure} over-reading what that work actually cost you?`;
}

/** Pip's line after the verify answer, before it files anything. */
export function settle(agreement: Agreement, felt: PipStateName): string {
  switch (agreement) {
    case 'agrees':
      return `Then ${FELT_WORD[felt]} is what goes in the record.`;
    case 'heavier':
      return `Taking it down a notch, then — logging today as ${FELT_WORD[felt]} rather than what I had.`;
    case 'lighter':
      return `Fair. Easing it back to ${FELT_WORD[felt]}.`;
    case 'unclear':
      return `Leaving it at ${FELT_WORD[felt]} — that is what the rest of what you said pointed at.`;
  }
}

/**
 * The closing line, after the reading has settled.
 *
 * States what was recorded and what it will do with it. No advice: this is the
 * app answering a question it just asked, at the hour somebody has least
 * appetite for being told anything.
 */
export function closing(felt: PipStateName, computed: PipStateName): string {
  if (felt === computed) {
    return 'That matches what I had. Agreeing is as useful an answer as disagreeing — it is what tells the model it is reading you right.';
  }
  const worse = STRAIN_AT[felt] > STRAIN_AT[computed];
  return worse
    ? 'Enough evenings like this one and I will start reading your reserve lower than the task list alone suggests.'
    : 'Enough evenings like this one and I will stop over-reading what your week is costing you.';
}
