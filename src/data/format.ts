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

/** The seven days of `anchor`'s week, Monday-first, for the date strip. */
export function weekOf(anchor: Date): Date[] {
  const start = startOfDay(anchor);
  // getDay(): 0 = Sunday. Shift so Monday is index 0.
  const shift = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - shift);
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

/** "@academics" → "@Academics", for the filter row's labels. */
export function contextLabel(ctx: string): string {
  return ctx.replace(/^@(.)/, (_, c: string) => `@${c.toUpperCase()}`);
}

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
