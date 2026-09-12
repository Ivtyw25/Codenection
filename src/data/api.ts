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
  CaptureMode,
  CaptureReview,
  IconName,
  ProposedTask,
  TaskContext,
  TaskLoad,
} from '@/types';
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

/**
 * Keyword → context. Deliberately a visible table rather than a model: the
 * point is that the Review sheet reflects what was actually typed, so the
 * mapping has to be inspectable when it guesses wrong.
 */
const CONTEXT_HINTS: [TaskContext, RegExp][] = [
  ['@academics', /\b(assignment|problem set|pset|lecture|exam|paper|essay|study|prof|professor|class|homework|revision|thesis|lab)\b/i],
  ['@club', /\b(club|society|committee|venue|workshop|event|meeting|gdsc|booking|member)\b/i],
  ['@internship', /\b(internship|intern|resume|cv|standup|sprint|ticket|deploy|pr\b|client|manager|interview)\b/i],
  ['@errands', /\b(buy|pick up|groceries|laundry|detergent|return|post|bank|pharmacy|shop|collect)\b/i],
];

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

function estimateFor(text: string): { minutes: number; load: TaskLoad; delta: number } {
  const explicit = text.match(/\b(\d{1,3})\s*(min|minutes|m)\b/i);
  if (explicit) {
    const m = parseInt(explicit[1], 10);
    return { minutes: m, load: m <= 20 ? 'low' : m <= 60 ? 'medium' : 'high', delta: Math.min(30, Math.round(m / 3)) };
  }
  const hours = text.match(/\b(\d{1,2})\s*(h|hr|hrs|hours?)\b/i);
  if (hours) {
    const m = parseInt(hours[1], 10) * 60;
    return { minutes: m, load: m <= 60 ? 'medium' : 'high', delta: Math.min(30, Math.round(m / 3)) };
  }
  // Length of the thought is a weak but honest proxy.
  const words = text.split(/\s+/).length;
  if (words <= 6) return { minutes: 15, load: 'low', delta: 8 };
  if (words <= 16) return { minutes: 45, load: 'medium', delta: 16 };
  return { minutes: 90, load: 'high', delta: 26 };
}

/** Shortest capture worth structuring. Below this, the field shows an error. */
export const MIN_CAPTURE = 4;

/** Under two minutes, no scheduling needed — the amber 2-minute-rule card. */
const QUICK_WIN = /\b(reply|text|confirm|rsvp|say|send a quick|ping|acknowledge|got it)\b/i;

/**
 * The capture parser.
 *
 * Nothing here is intelligent, and it is not meant to be — but it is *real*:
 * the Review sheet shows a breakdown of the words the user actually typed, so
 * editing the capture changes the proposal. The previous rebuild returned a
 * fixed three-task constant no matter what was entered.
 */
export function parseCapture(text: string, now: Date = new Date()): CaptureReview {
  const trimmed = text.trim();

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
    // anywhere in the note reads as confident extraction but is a guess, and it
    // suppresses the "Calibrate later" chip that exists precisely to say "I
    // couldn't tell". Better to admit the gap than to invent a deadline.
    const dueAt = parseDue(part, now);
    const subtasks = clauses(part).length > 1 ? clauses(part).slice(1).map(titleCase) : [];

    proposed.push({
      id: uid('p'),
      title: titleCase(part.slice(0, 120)),
      context: firstMatch(CONTEXT_HINTS, part, '@personal'),
      dueAt,
      estimateMin: minutes,
      load,
      icon: firstMatch(ICON_HINTS, part, 'Sparkles'),
      subtasks,
      // No date in the text — the frames' blue "Calibrate later" hint.
      calibrateLater: dueAt == null,
    });
  }

  if (proposed.length === 0 && quickWin) {
    // Everything collapsed into the quick win; still a valid outcome.
    return { captureId: uid('cap'), proposed: [], quickWin, sparksReward: 5 };
  }

  return {
    captureId: uid('cap'),
    proposed,
    quickWin,
    sparksReward: 10 + proposed.length * 5 + (quickWin ? 5 : 0),
  };
}

// ── Writes ──────────────────────────────────────────────────────────────────

/**
 * The async form. Same parse, plus the latency and the failure mode a real
 * extraction service would have — which is what the Capture screen's loading
 * and error states are built against.
 */
export async function processCapture(
  text: string,
  _mode: CaptureMode,
  now: Date = new Date(),
): Promise<CaptureReview> {
  await sleep(jitter(1400));
  consumeFailure("Pip couldn't structure that. Your note is safe — try again.");

  if (text.trim().length < MIN_CAPTURE) {
    throw new Error('There is not enough here to work with yet. Add a few more words.');
  }
  return parseCapture(text, now);
}

export async function purchase(itemId: string, price: number, balance: number): Promise<void> {
  await sleep(jitter(680));
  consumeFailure("The purchase didn't go through. No Sparks were spent.");
  if (price > balance) {
    throw new Error('Not enough Sparks for that yet.');
  }
}

/** Voice capture. Returns a transcript; the UI shows a recording state. */
export async function transcribe(seconds: number): Promise<string> {
  await sleep(jitter(900));
  consumeFailure("Couldn't hear that clearly. Try again, or type it instead.");
  if (seconds < 1) throw new Error('That recording was too short to transcribe.');
  return 'Email Prof. Miller about office hours tomorrow, and pick up cold brew beans on the way back';
}
