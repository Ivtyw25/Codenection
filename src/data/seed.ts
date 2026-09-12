/**
 * The seed world.
 *
 * Copy is transcribed from the Figma frames — the tasks, the sub-tasks, Pip's
 * notes, the resource filenames are all theirs. What is NOT theirs is the
 * timing: the frames are pinned to "Oct 25, 2023", which would render as a
 * two-year-old overdue pile today. Every instant below is built relative to
 * the moment the app boots, so the seed reads the way the frame did — some
 * things due today, one tomorrow, one already slipping.
 *
 * This is a fixture, not a mock: it is the initial value of real state, and
 * every field of it is mutable from the UI.
 */
import type { AppData, DayRecord, ShopItem, Task, Teammate } from '@/types';
import { isoDate, startOfDay } from './format';

/** `at(0, 16, 0)` → today at 16:00. `at(-1, …)` → yesterday. */
function at(dayOffset: number, hour: number, minute = 0): string {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const SKIN_IMAGES = {
  'forest-leaf': require('../../assets/skins/forest-leaf.png'),
  'pastel-green': require('../../assets/skins/pastel-green.png'),
  streetwear: require('../../assets/skins/streetwear.png'),
  sunhat: require('../../assets/skins/sunhat.png'),
  'winter-scarf': require('../../assets/skins/winter-scarf.png'),
  galaxy: require('../../assets/skins/galaxy.png'),
} as const;

export type SkinId = keyof typeof SKIN_IMAGES;

/** Pip's default, unskinned body — the hero on the Pip tab. */
export const PIP_BASE = require('../../assets/pip.png');

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'forest-leaf', name: 'Forest Leaf Skin', price: 100, category: 'skins', image: SKIN_IMAGES['forest-leaf'] },
  { id: 'pastel-green', name: 'Pastel Green Skin', price: 150, category: 'skins', image: SKIN_IMAGES['pastel-green'] },
  { id: 'streetwear', name: 'Streetwear Skin', price: 200, category: 'skins', image: SKIN_IMAGES.streetwear },
  { id: 'sunhat', name: 'Sunhat Skin', price: 200, category: 'skins', image: SKIN_IMAGES.sunhat },
  { id: 'winter-scarf', name: 'Winter Scarf Skin', price: 250, category: 'skins', image: SKIN_IMAGES['winter-scarf'] },
  { id: 'galaxy', name: 'Galaxy Skin', price: 300, category: 'skins', image: SKIN_IMAGES.galaxy },
];

/**
 * No seeded tasks, deliberately.
 *
 * The Manifest starts empty because work in this app is supposed to ARRIVE —
 * captured, then processed, then committed. Shipping a pre-populated task list
 * would hand a first-time user five things they never wrote down, and quietly
 * skip the one flow the product is actually about. Everything below in `inbox`
 * is what a new user has instead.
 */
const TASKS: Task[] = [];

/**
 * Six closed days behind today. Four consecutive balanced days sit at the end,
 * which is what the streak row reads — the frame's "5 consecutive days" is that
 * run plus today, and it now goes up or down with what actually happens.
 */
const HISTORY: DayRecord[] = [
  { offset: -6, pressure: 62, vitality: 58, tasksCompleted: 1, state: 'strained' as const },
  { offset: -5, pressure: 71, vitality: 52, tasksCompleted: 0, state: 'wilting' as const },
  { offset: -4, pressure: 44, vitality: 74, tasksCompleted: 3, state: 'balanced' as const },
  { offset: -3, pressure: 38, vitality: 79, tasksCompleted: 2, state: 'balanced' as const },
  { offset: -2, pressure: 41, vitality: 77, tasksCompleted: 2, state: 'balanced' as const },
  { offset: -1, pressure: 35, vitality: 81, tasksCompleted: 4, state: 'balanced' as const },
].map(({ offset, ...rest }) => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + offset);
  return { date: isoDate(d), ...rest };
});

/** Seven closed days ending yesterday, oldest first — a teammate's week. */
function week(rows: Omit<DayRecord, 'date'>[]): DayRecord[] {
  return rows.map((row, i) => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - (rows.length - i));
    return { date: isoDate(d), ...row };
  });
}

/**
 * The people a step can be handed to.
 *
 * Spread across the state range on purpose. Delegation is only a real decision
 * if some answers are visibly worse than others: Jia Wen is depleted and Nadia
 * is fraying, so "who takes this" has an obviously kind answer and an obviously
 * unkind one. Shanmugam hasn't opted into sharing and therefore shows nothing
 * at all — the screen has to stay usable without that signal.
 */
const TEAMMATES: Teammate[] = [
  {
    id: 'tm1',
    name: 'Arif',
    initials: 'AR',
    sharesState: true,
    state: 'balanced',
    week: week([
      { pressure: 38, vitality: 78, tasksCompleted: 2, state: 'balanced' },
      { pressure: 41, vitality: 75, tasksCompleted: 3, state: 'balanced' },
      { pressure: 35, vitality: 80, tasksCompleted: 2, state: 'balanced' },
      { pressure: 44, vitality: 74, tasksCompleted: 1, state: 'balanced' },
      { pressure: 39, vitality: 79, tasksCompleted: 3, state: 'balanced' },
      { pressure: 33, vitality: 82, tasksCompleted: 2, state: 'balanced' },
      { pressure: 36, vitality: 80, tasksCompleted: 3, state: 'balanced' },
    ]),
  },
  {
    id: 'tm2',
    name: 'Nadia',
    initials: 'NL',
    sharesState: true,
    state: 'strained',
    week: week([
      { pressure: 45, vitality: 71, tasksCompleted: 2, state: 'balanced' },
      { pressure: 52, vitality: 66, tasksCompleted: 2, state: 'strained' },
      { pressure: 58, vitality: 62, tasksCompleted: 1, state: 'strained' },
      { pressure: 61, vitality: 59, tasksCompleted: 1, state: 'strained' },
      { pressure: 57, vitality: 63, tasksCompleted: 2, state: 'strained' },
      { pressure: 63, vitality: 58, tasksCompleted: 0, state: 'strained' },
      { pressure: 60, vitality: 60, tasksCompleted: 1, state: 'strained' },
    ]),
  },
  {
    id: 'tm3',
    name: 'Jia Wen',
    initials: 'JW',
    sharesState: true,
    state: 'depleted',
    week: week([
      { pressure: 64, vitality: 55, tasksCompleted: 1, state: 'wilting' },
      { pressure: 71, vitality: 48, tasksCompleted: 1, state: 'wilting' },
      { pressure: 78, vitality: 42, tasksCompleted: 0, state: 'depleted' },
      { pressure: 82, vitality: 38, tasksCompleted: 0, state: 'depleted' },
      { pressure: 79, vitality: 40, tasksCompleted: 1, state: 'depleted' },
      { pressure: 85, vitality: 35, tasksCompleted: 0, state: 'depleted' },
      { pressure: 83, vitality: 37, tasksCompleted: 0, state: 'depleted' },
    ]),
  },
  {
    id: 'tm4',
    name: 'Shanmugam',
    initials: 'SH',
    sharesState: false,
    state: null,
    week: [],
  },
];

/**
 * A fresh copy of the seed world.
 *
 * Deliberately a function, not a constant: the reducer owns this object and
 * mutates derived copies of it, and `at()` must be evaluated at boot so
 * "today" means the day the app is opened rather than the day it was built.
 */
export function seedData(): AppData {
  return {
    user: { name: 'Ivan' },
    pip: {
      name: 'Pip',
      level: 4,
      sparks: 420,
      owned: [],
      equipped: null,
      streakGoal: 7,
    },
    tasks: TASKS.map((t) => ({ ...t, subtasks: t.subtasks.map((s) => ({ ...s })) })),
    teammates: TEAMMATES.map((m) => ({ ...m, week: m.week.map((d) => ({ ...d })) })),
    /**
     * Four unprocessed captures \u2014 the app's entire starting content.
     *
     * Written as things a student would actually type, which is why three of
     * them narrate their own ordering ("once I read through it, I'll\u2026",
     * "nothing else can move forward until\u2026"). That ordering is what the
     * breakdowns in `src/data/breakdowns.ts` turn into real dependencies.
     *
     * The fourth is deliberately trivial: not every thought deserves a
     * breakdown, and padding a two-minute errand with invented steps is how a
     * planner starts feeling like homework.
     */
    inbox: [
      {
        id: 'cap1',
        text:
          'I really want to focus on AI engineering for my FYP, but before pitching anything, ' +
          'I need to thoroughly review the project guidelines so my scope fits the faculty ' +
          "requirements. Once I read through it, I'll identify supervisors doing research in " +
          'applied AI, draft a quick proposal outline with a couple of strong ideas, and email ' +
          'them to set up a consultation.',
        kind: 'text',
        // A document attachment renders from its metadata alone, so the seed can
        // demonstrate the tray without shipping a real file to point `uri` at.
        attachments: [
          {
            id: 'att1',
            name: 'fyp_project_guidelines.pdf',
            kind: 'document',
            uri: 'file:///seed/fyp_project_guidelines.pdf',
            sizeBytes: 412_000,
            mimeType: 'application/pdf',
          },
        ],
        createdAt: at(0, 9, 20),
      },
      {
        id: 'cap2',
        text:
          'I need to check my eligibility against the CGPA cutoffs and prerequisite rules in ' +
          'this briefing document for next semester\u2019s exchange. I also need to draft an email ' +
          'to the mobility office to ask if there are any university scholarships or travel ' +
          'grants available so I know what my out-of-pocket costs look like before committing.',
        kind: 'text',
        attachments: [
          {
            id: 'att2',
            name: 'exchange_program_guideline.pdf',
            kind: 'document',
            uri: 'file:///seed/exchange_program_guideline.pdf',
            sizeBytes: 287_000,
            mimeType: 'application/pdf',
          },
        ],
        createdAt: at(0, 8, 5),
      },
      {
        id: 'cap3',
        text:
          'Our team finalized the event concept, but none of the paperwork is handled yet. ' +
          'I need to write the event proposal, submit it for formal faculty approval, and book ' +
          'the venue before other clubs take the slots. Nothing else can move forward until the ' +
          'venue and permits are secured.',
        kind: 'text',
        attachments: [],
        createdAt: at(-1, 21, 10),
      },
      {
        id: 'cap4',
        text:
          'Need to purchase these items on Shopee before stock runs out or shipping gets delayed:\n' +
          'https://shopee.com.my/product/1829304/mechanical-keyboard-switches\n' +
          'https://shopee.com.my/product/4471902/laptop-stand-aluminium\n' +
          'https://shopee.com.my/product/9930211/usb-c-hub-7-in-1\n' +
          'https://shopee.com.my/product/2245780/a4-refill-pad-5pack\n' +
          'https://shopee.com.my/product/6610934/desk-lamp-warm-led',
        kind: 'text',
        attachments: [],
        createdAt: at(-1, 22, 35),
      },
    ],
    vitals: [
      { id: 'sleep', label: 'Sleep', value: 84, note: 'High recovery reserves thanks to 7.8 hrs sleep.' },
      { id: 'focus', label: 'Focus', value: 72, note: 'Two deep-work blocks logged before noon.' },
    ],
    history: HISTORY,
    shop: SHOP_ITEMS,
    notifications: [
      // Copy here must not name tasks: the Manifest starts empty, and a nudge
      // about overdue library books with nothing on the list reads as a bug.
      {
        id: 'n1',
        kind: 'nudge',
        title: 'Four things are waiting',
        body: 'Your inbox has been filling up. Processing it takes about a minute.',
        createdAt: at(0, 8),
        read: false,
      },
      {
        id: 'n2',
        kind: 'reward',
        title: '+40 Sparks',
        body: 'A balanced week so far — Pip has been steady four days running.',
        createdAt: at(-1, 21),
        read: false,
      },
      {
        id: 'n3',
        kind: 'system',
        title: 'Calendar connected',
        body: 'Pip can now read due dates straight off your timetable.',
        createdAt: at(-2, 12),
        read: true,
      },
    ],
    settings: { theme: null, notificationsEnabled: true, reduceMotion: false },
  };
}
