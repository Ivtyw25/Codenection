/**
 * Presentation of stored values.
 *
 * The Figma frames show strings like "Today, 4:00 PM", "15 min", "5/7". Those
 * are renderings, not data — the app stores an instant and a duration, and
 * every screen that needs the frame's wording calls through here. One place to
 * change means "Today" stays correct at midnight instead of at build time.
 */

const MS_DAY = 86_400_000;

const TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

/** Midnight, local, of whatever day `d` falls on. */
export function startOfDay(d: Date | string): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** ISO date with no time component — the key `DayRecord` is stored under. */
export function isoDate(d: Date | string): string {
  const x = startOfDay(d);
  const m = `${x.getMonth() + 1}`.padStart(2, '0');
  const day = `${x.getDate()}`.padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
}

/** Whole days from `now`'s midnight to `d`'s midnight. Today = 0. */
export function dayOffset(d: Date | string, now: Date = new Date()): number {
  return Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / MS_DAY);
}

export function isToday(d: Date | string, now: Date = new Date()): boolean {
  return dayOffset(d, now) === 0;
}

export function isOverdue(iso: string | null, now: Date = new Date()): boolean {
  return iso != null && new Date(iso).getTime() < now.getTime();
}

/**
 * "Today, 4:00 PM" · "Tomorrow, 6:00 PM" · "Thu Oct 25" · "No due date".
 * Matches the wording the frames use, including dropping the time once a date
 * is more than a week out.
 */
export function formatDue(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'No due date';
  const d = new Date(iso);
  const off = dayOffset(d, now);
  const time = d.toLocaleTimeString(undefined, TIME);

  if (off === 0) return `Today, ${time}`;
  if (off === 1) return `Tomorrow, ${time}`;
  if (off === -1) return `Yesterday, ${time}`;
  if (off < 0) return `Overdue · ${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
  if (off <= 6) return `${d.toLocaleDateString(undefined, { weekday: 'long' })}, ${time}`;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** The short form used inside chips where width is tight. */
export function formatDueShort(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'Someday';
  const d = new Date(iso);
  const off = dayOffset(d, now);
  if (off === 0) return d.toLocaleTimeString(undefined, TIME);
  if (off === 1) return 'Tomorrow';
  if (off < 0) return 'Overdue';
  if (off <= 6) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * "tomorrow" · "Thursday" · "Thu 2 Oct" — a day named inside a sentence.
 *
 * Lower case and un-punctuated, because everything that uses it is mid-prose
 * ("Suggested because of Thursday…"). The existing day formatters all shout for
 * chips and rail headings, and dropping one of those into a paragraph is how
 * copy ends up reading like a database row.
 */
export function formatDayName(d: Date | string, now: Date = new Date()): string {
  const day = new Date(d);
  const off = dayOffset(day, now);
  if (off === 0) return 'today';
  if (off === 1) return 'tomorrow';
  if (off === -1) return 'yesterday';
  if (off > 1 && off <= 6) return day.toLocaleDateString(undefined, { weekday: 'long' });
  return day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "9:00 AM" — a single instant on the clock. */
export function formatClock(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString(undefined, TIME);
}

/**
 * "9:00 – 9:45 AM" · "11:30 AM – 12:15 PM" — one scheduled block.
 *
 * The meridiem is printed once when both ends share it, which is the common
 * case and the difference between a rail that reads as a schedule and one that
 * reads as a table of timestamps.
 */
export function formatTimeRange(startIso: string | Date, endIso: string | Date): string {
  const start = formatClock(startIso);
  const end = formatClock(endIso);
  const m = /\s*([AP]M)$/i;
  const sm = start.match(m);
  const em = end.match(m);
  if (sm && em && sm[1].toUpperCase() === em[1].toUpperCase()) {
    return `${start.replace(m, '')} – ${end}`;
  }
  return `${start} – ${end}`;
}

/** "TODAY · SAT, SEP 13" — the day separator on a timeline. */
export function formatDayHeading(d: Date | string, now: Date = new Date()): string {
  const day = new Date(d);
  const off = dayOffset(day, now);
  const label = day
    .toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
  if (off === 0) return `TODAY · ${label}`;
  if (off === 1) return `TOMORROW · ${label}`;
  if (off === -1) return `YESTERDAY · ${label}`;
  return label;
}

/** "15 min" · "1h" · "1h 30m" — the three shapes the frames show. */
export function formatEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "TODAY · OCT 25" — the Manifest's date pill. */
export function formatDayPill(d: Date, now: Date = new Date()): string {
  const off = dayOffset(d, now);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
  if (off === 0) return `TODAY · ${date}`;
  if (off === 1) return `TOMORROW · ${date}`;
  if (off === -1) return `YESTERDAY · ${date}`;
  return date;
}

/** "Oct 25, 2026" — the "Showing:" line. */
export function formatFullDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Seven days starting AT the anchor — the date strip.
 *
 * Rolling, not a Monday-first calendar week. Two reasons, both of them bugs the
 * calendar version actually had: on a Sunday, "tomorrow" fell off the end of
 * the row and could not be highlighted at all; and "This Week" filters to
 * `anchor … anchor + 6`, which a Mon–Sun row only coincidentally matches. Now
 * the strip shows exactly the days the range can select, today always first.
 */
export function weekFrom(anchor: Date): Date[] {
  const start = startOfDay(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Single-letter weekday for the date strip: M T W T F S S. */
export function dayInitial(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'narrow' }).slice(0, 1).toUpperCase();
}

/*
 * `contextLabel` lived here, capitalising "@academics" into "@Academics".
 *
 * It is gone because a category's name is no longer something the app derives
 * from an id — it is a string the user typed, stored on the category itself.
 * Use `categoryLabel(categories, id)` from `src/data/categories.ts`.
 */

/** "2 minutes ago" · "3h ago" · "Oct 25" — notification timestamps. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
