/**
 * The user's own categories, and the arithmetic over them.
 *
 * This file replaces a five-vector load model that did not survive contact with
 * the idea. That model split every task across `mental / time / physical /
 * social / errands` — five shares, summing to one, authored per task. It was
 * wrong in two ways at once:
 *
 *   It invented data.  Nothing in "book the venue" tells you it is 39% social,
 *                      and no student is going to correct the number. A figure
 *                      nobody can check is a figure the app should not show.
 *
 *   It spoke wrong.    "Your social vector is elevated" is not a sentence a
 *                      stressed 20-year-old has ever said. They say "the club
 *                      is eating me alive" — and the club is a thing they
 *                      already told us about.
 *
 * So load decomposes across the categories the student actually has. The
 * breakdown becomes a group-by rather than a weighted redistribution, which
 * means it needs no authored shares, cannot drift from the headline number, and
 * names the problem in the user's own words. A category is data they own: they
 * can add one, rename it, and retire it.
 *
 * Everything here is pure and total — no clock, no store, no React.
 */
import type { Category, CategoryId, IconName } from '@/types';

/**
 * What a new user starts with.
 *
 * A starting point, explicitly not a schema. Onboarding's discovery step is
 * meant to replace most of these with whatever the student says they carry, and
 * every one of them is renameable and retirable afterwards. They exist so the
 * app has something honest to show before it has been told anything.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'academics',
    label: 'Academics',
    icon: 'BookOpen',
    // Nobody can revise, sit or think for you.
    shareable: false,
    match: [
      'assignment', 'problem set', 'pset', 'lecture', 'exam', 'paper', 'essay',
      'study', 'prof', 'professor', 'class', 'homework', 'revision', 'thesis', 'lab',
    ],
  },
  {
    id: 'club',
    label: 'Club',
    icon: 'Users',
    // Committee work is the most delegable thing a student carries — there is
    // a whole committee standing right there.
    shareable: true,
    match: [
      'club', 'society', 'committee', 'venue', 'workshop', 'event', 'meeting',
      'gdsc', 'booking', 'member',
    ],
  },
  {
    id: 'internship',
    label: 'Internship',
    icon: 'Briefcase',
    // Assigned to you by name. Handing it on is a conversation with a manager,
    // not something an app should propose.
    shareable: false,
    match: [
      'internship', 'intern', 'resume', 'cv', 'standup', 'sprint', 'ticket',
      'deploy', 'client', 'manager', 'interview',
    ],
  },
  {
    id: 'errands',
    label: 'Errands',
    icon: 'ShoppingCart',
    // Legwork. Almost entirely handoffable — it is the shape of work the
    // Delegate lever exists for.
    shareable: true,
    match: [
      'buy', 'pick up', 'groceries', 'laundry', 'detergent', 'return', 'post',
      'bank', 'pharmacy', 'shop', 'collect',
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    icon: 'Heart',
    // Your appointments, your body, your family. Not transferable.
    shareable: false,
    match: ['gym', 'run', 'workout', 'doctor', 'dentist', 'appointment', 'call home', 'rent'],
  },
];

/** The category a new user's uncategorised work falls into. */
export const FALLBACK_CATEGORY: CategoryId = 'personal';

/** Icons offered when creating a category. Every one is in `IconName`. */
export const CATEGORY_ICONS: IconName[] = [
  'BookOpen',
  'Users',
  'Briefcase',
  'ShoppingCart',
  'Heart',
  'Home',
  'Code',
  'Dumbbell',
  'CalendarDays',
  'FileText',
  'Mail',
  'Sparkles',
];

/** The ones still offered on new work. Archived categories keep their history. */
export function activeCategories(categories: Category[]): Category[] {
  return categories.filter((c) => !c.archived);
}

export function findCategory(categories: Category[], id: CategoryId): Category | null {
  return categories.find((c) => c.id === id) ?? null;
}

/**
 * What to call a category id.
 *
 * Falls back to the id rather than to "Unknown": if a task somehow outlives its
 * category, showing `academics` still tells the user what they are looking at,
 * where "Unknown" tells them the app is broken.
 */
export function categoryLabel(categories: Category[], id: CategoryId): string {
  return findCategory(categories, id)?.label ?? id;
}

export function categoryIcon(categories: Category[], id: CategoryId): IconName {
  return findCategory(categories, id)?.icon ?? 'Sparkles';
}

/**
 * A stable id from a label the user typed.
 *
 * Suffixed on collision rather than rejected — "Work" and "work" are two names
 * for the same thing to a slug function and two different things to a person,
 * and refusing the second with a validation error over an implementation detail
 * would be the app being difficult about its own filing system.
 */
export function slugify(label: string, taken: CategoryId[] = []): CategoryId {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'category';

  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Which category a fresh capture belongs to.
 *
 * Deliberately a visible keyword table rather than a model: the point is that
 * the Review sheet reflects what was actually typed, so the mapping has to be
 * inspectable when it guesses wrong — and fixable, since the keywords are the
 * user's own data now.
 *
 * Scored by how much of the note a category's keywords account for, so a note
 * mentioning one club word and three academic ones lands in Academics rather
 * than wherever the iteration order happened to hit first. Ties fall to the
 * earlier category, which is the user's own ordering.
 */
export function matchCategory(
  categories: Category[],
  text: string,
  fallback: CategoryId = FALLBACK_CATEGORY,
): CategoryId {
  const haystack = text.toLowerCase();
  let best: CategoryId | null = null;
  let bestScore = 0;

  for (const category of activeCategories(categories)) {
    let score = 0;
    for (const keyword of category.match) {
      // Word-boundary on both ends so "post" does not match "postpone" and
      // "lab" does not match "collaborate".
      const pattern = new RegExp(`\\b${escapeRegExp(keyword.toLowerCase())}\\b`);
      if (pattern.test(haystack)) score += keyword.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = category.id;
    }
  }

  // An unmatched note is not an error — it goes somewhere the user can see and
  // move it, rather than being refused at the door.
  if (best) return best;
  const active = activeCategories(categories);
  return active.some((c) => c.id === fallback) ? fallback : (active[0]?.id ?? fallback);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
