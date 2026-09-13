/**
 * The boundary the app treats as a network.
 *
 * There is no server yet, so every call here resolves from the seed after a
 * delay — but it resolves *asynchronously and fallibly*, because that is what
 * the screens have to be built against. The teardown's biggest genuine finding
 * was that the source system has "zero skeleton loaders, spinners, empty states
 * or error states anywhere across 16 routes"; a synchronous fixture would let
 * this rebuild repeat exactly that mistake. Swapping these four functions for
 * `fetch` should be the whole of the change when a backend exists.
 */
import type {
  AppData,
  CaptureId,
  CaptureNote,
  CaptureReview,
  IconName,
  ProposedSubTask,
  ProposedTask,
  Category,
  TaskLoad,
} from '@/types';
import { SEEDED_BREAKDOWNS } from './breakdowns';
import { matchCategory } from './categories';
import { applyAnswers } from './clarify';
import { seedData } from './seed';
import { startOfDay } from './format';

/** Non-cryptographic id, stable enough for a client-side entity. */
export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const jitter = (base: number) => base + Math.random() * base * 0.5;

/**
 * Dev-only failure injection. `api.failNext()` makes exactly one call reject,
 * which is how the error branch of every screen gets exercised without
 * unplugging anything. Profile → Developer wires a switch to it.
 */
let failNextCall = false;
export function failNext(on = true) {
  failNextCall = on;
}
function consumeFailure(message: string) {
  if (!failNextCall) return;
  failNextCall = false;
  throw new Error(message);
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function bootstrap(): Promise<AppData> {
  await sleep(jitter(520));
  consumeFailure("Couldn't reach Pip. Check your connection and try again.");
  return seedData();
}

// ── Capture parsing ─────────────────────────────────────────────────────────

/*
 * Where the keyword→category table used to live.
 *
 * It is now `match` on each `Category`, in `src/data/categories.ts` — because
 * the categories themselves are the user's, and a routing table the app owned
 * privately could not be corrected by the person whose notes it was misfiling.
 * `matchCategory` does the scoring.
 */

const ICON_HINTS: [IconName, RegExp][] = [
  ['Mail', /\b(email|e-mail|reply|message|write to|contact)\b/i],
  ['ShoppingCart', /\b(buy|groceries|pick up|order|shop)\b/i],
  ['BookOpen', /\b(read|study|revise|lecture|notes|paper)\b/i],
  ['Code', /\b(build|debug|deploy|docker|code|script|bug|ci)\b/i],
  ['Dumbbell', /\b(gym|run|workout|swim|train)\b/i],
  ['CalendarDays', /\b(book|schedule|meeting|venue|appointment)\b/i],
  ['Users', /\b(team|committee|group|partner|classmate)\b/i],
];

/** "by 5pm", "at 14:30", "tonight" → a clock time, or null if none is stated. */
function parseClock(text: string): { hour: number; minute: number } | null {
  const ampm = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (ampm) {
    const base = parseInt(ampm[1], 10) % 12;
    return {
      hour: ampm[3].toLowerCase() === 'pm' ? base + 12 : base,
      minute: ampm[2] ? parseInt(ampm[2], 10) : 0,
    };
  }
  const h24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (h24) return { hour: parseInt(h24[1], 10), minute: parseInt(h24[2], 10) };

  if (/\btonight|this evening\b/i.test(text)) return { hour: 20, minute: 0 };
  if (/\bmorning\b/i.test(text)) return { hour: 9, minute: 0 };
  if (/\bafternoon\b/i.test(text)) return { hour: 15, minute: 0 };
  return null;
}

function parseDue(text: string, now: Date): string | null {
  const clock = parseClock(text);
  const tomorrow = /\btomorrow\b/i.test(text);
  const nextWeek = /\bnext week\b/i.test(text);
  const today = /\b(today|tonight|this evening|this afternoon)\b/i.test(text);

  // Nothing in the text implies a date at all.
  if (!clock && !tomorrow && !nextWeek && !today) return null;

  const d = startOfDay(now);
  if (tomorrow) d.setDate(d.getDate() + 1);
  else if (nextWeek) d.setDate(d.getDate() + 7);

  d.setHours(clock?.hour ?? 17, clock?.minute ?? 0, 0, 0);

  // A bare time that has already passed reads as tomorrow, not as instantly
  // overdue — "email them at 9" typed at 3pm means tomorrow morning.
  if (d.getTime() < now.getTime() && !tomorrow && !nextWeek) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString();
}

function firstMatch<T>(pairs: [T, RegExp][], text: string, fallback: T): T {
  for (const [value, re] of pairs) if (re.test(text)) return value;
  return fallback;
}

/** Sentence-ish splitting — the unit the extractor turns into sub-tasks. */
function clauses(text: string): string[] {
  return text
    .split(/[\n.;]+|\band then\b|\balso\b|\bplus\b/i)
    .map((s) => s.trim().replace(/^[-*•,\s]+/, ''))
    .filter((s) => s.length > 3);
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function estimateFor(text: string): { minutes: number; load: TaskLoad } {
  const explicit = text.match(/(\d{1,3})\s*(min|minutes|m)/i);
  if (explicit) {
    const m = parseInt(explicit[1], 10);
    return { minutes: m, load: m <= 20 ? 'low' : m <= 60 ? 'medium' : 'high' };
  }
  const hours = text.match(/(\d{1,2})\s*(h|hr|hrs|hours?)/i);
  if (hours) {
    const m = parseInt(hours[1], 10) * 60;
    return { minutes: m, load: m <= 60 ? 'medium' : 'high' };
  }
  // Length of the thought is a weak but honest proxy.
  const words = text.split(/\s+/).length;
  if (words <= 6) return { minutes: 15, load: 'low' };
  if (words <= 16) return { minutes: 45, load: 'medium' };
  return { minutes: 90, load: 'high' };
}

/** Shortest capture worth structuring. Below this, the field shows an error. */
export const MIN_CAPTURE = 4;

/** Under two minutes, no scheduling needed — the amber 2-minute-rule card. */
const QUICK_WIN = /\b(reply|text|confirm|rsvp|say|send a quick|ping|acknowledge|got it)\b/i;

/**
 * The capture parser.
 *
 * Nothing here is intelligent, and it is not meant to be — but it is *real*:
 * the triage sheet shows a breakdown of the words the user actually typed, so
 * editing a note changes its proposal.
 *
 * Deliberately module-private. Capture no longer parses on the way in — this
 * runs once, later, over a whole batch, from `processInbox`.
 */
function parseNote(
  note: CaptureNote,
  now: Date,
  categories: Category[],
): { proposed: ProposedTask[]; quickWin: CaptureReview['quickWin'] } {
  const trimmed = note.text.trim();

  const parts = clauses(trimmed);
  const proposed: ProposedTask[] = [];
  let quickWin: CaptureReview['quickWin'] = null;

  for (const part of parts.slice(0, 4)) {
    if (QUICK_WIN.test(part) && part.split(/\s+/).length <= 10 && !quickWin) {
      quickWin = {
        id: uid('q'),
        title: titleCase(part),
        note: "Under 2 mins · Don't schedule, just clear it",
      };
      continue;
    }

    const { minutes, load } = estimateFor(part);
    // Only a date stated in *this* clause counts. Falling back to a date found
    // anywhere in the note reads as confident extraction but is a guess. A task
    // with no stated deadline gets none, and the planner spreads it over the
    // default horizon instead — admitting the gap rather than inventing one.
    const dueAt = parseDue(part, now);

    // A clause that splits no further is one action, and manufacturing a single
    // sub-task out of it just adds a row that says the same thing twice.
    const steps = clauses(part).slice(1);
    const each = steps.length > 0 ? Math.max(5, Math.round(minutes / steps.length)) : 0;
    const subtasks: ProposedSubTask[] = steps.map((title, i) => ({
      id: `s${i + 1}`,
      title: titleCase(title),
      estimateMin: each,
      // The sentence narrates these in order, so each one follows the last.
      // A guess — but the same guess the user's own phrasing makes, and it is
      // editable before commit.
      dependsOn: i === 0 ? [] : [`s${i}`],
    }));

    proposed.push({
      id: uid('p'),
      sourceId: note.id,
      title: titleCase(part.slice(0, 120)),
      categoryId: matchCategory(categories, part),
      dueAt,
      estimateMin: minutes,
      load,
      icon: firstMatch(ICON_HINTS, part, 'Sparkles'),
      subtasks,
    });
  }

  return { proposed, quickWin };
}

/**
 * Batch triage — the only way a capture becomes a task.
 *
 * Takes everything the user selected in the Inbox and structures it in one
 * pass. At most one quick win survives a batch: the amber "just do it now"
 * card is an interruption, and three of them stacked is no longer a nudge.
 *
 * Carries the same latency and failure mode as every other call here, because
 * the Inbox's loading and error states are built against it — and because a
 * triage that fails must leave the queue untouched rather than half-consumed.
 */
export async function processInbox(
  notes: CaptureNote[],
  categories: Category[],
  now: Date = new Date(),
  answers: Record<string, string> = {},
): Promise<CaptureReview> {
  await sleep(jitter(1400));
  consumeFailure("Pip couldn't structure those. Your notes are safe — try again.");

  if (notes.length === 0) {
    throw new Error('Nothing selected to process.');
  }

  const proposed: ProposedTask[] = [];
  let quickWin: CaptureReview['quickWin'] = null;

  for (const note of notes) {
    // Seeded captures have authored breakdowns — real dependencies, which no
    // amount of clause-splitting could infer. Anything the user typed still
    // goes through the parser.
    const authored = SEEDED_BREAKDOWNS[note.id];
    if (authored) {
      proposed.push(...authored.map((p) => ({ ...p, subtasks: p.subtasks.map((s) => ({ ...s })) })));
      continue;
    }

    const result = parseNote(note, now, categories);
    proposed.push(...result.proposed);
    quickWin = quickWin ?? result.quickWin;
  }

  const sourceIds: CaptureId[] = notes.map((n) => n.id);
  // The clarification pass is what makes these proposals specific rather than
  // plausible — it drops steps the user says are done, moves dates they know,
  // and marks what someone else can take.
  const answered = applyAnswers(proposed, answers);

  return {
    sourceIds,
    proposed: answered,
    quickWin,
    sparksReward: 10 + answered.length * 5 + (quickWin ? 5 : 0),
  };
}

export async function purchase(itemId: string, price: number, balance: number): Promise<void> {
  await sleep(jitter(680));
  consumeFailure("The purchase didn't go through. No Sparks were spent.");
  if (price > balance) {
    throw new Error('Not enough Sparks for that yet.');
  }
}

/**
 * Voice capture.
 *
 * STUB. There is no recorder behind this — `VoiceRecorder` models the states
 * (idle, recording, transcribing, error) against a timer, and this returns a
 * fixed transcript after a plausible delay. The seam is the right shape for a
 * real speech service, and the UI is already built for one.
 */
export async function transcribe(seconds: number): Promise<{ text: string; durationSec: number }> {
  await sleep(jitter(900));
  consumeFailure("Couldn't hear that clearly. Try again, or type it instead.");
  if (seconds < 1) throw new Error('That recording was too short to transcribe.');
  return {
    text: 'Email Prof. Miller about office hours tomorrow, and pick up cold brew beans on the way back',
    durationSec: Math.round(seconds),
  };
}
