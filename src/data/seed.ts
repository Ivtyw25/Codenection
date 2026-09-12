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
import type { AppData, DayRecord, ShopItem, Task } from '@/types';
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

const TASKS: Task[] = [
  {
    id: 't1',
    title: 'Submit venue booking request for Main Hall workshop',
    status: 'open',
    context: '@club',
    tag: '#Leadership',
    dueAt: at(0, 16),
    estimateMin: 15,
    load: 'low',
    icon: 'CalendarDays',
    createdAt: at(-2, 9),
    completedAt: null,
    subtasks: [
      { id: 't1s1', title: 'Confirm target dates with club executive committee', done: false },
      { id: 't1s2', title: 'Complete and submit Student Affairs venue form', done: false },
    ],
    notes:
      'Bookings require 2 weeks notice minimum. Sound technician needed for Main Hall acoustics.',
    resources: [
      { id: 'r1', name: 'Venue_Booking_Handbook_2026.pdf', kind: 'PDF', size: '1.2 MB' },
      { id: 'r2', name: 'GDSC_Club_Registration_Info.gdoc', kind: 'Doc', size: '480 KB', external: true },
    ],
    pipNote:
      'Quick 15m errand. Completing this before 4:00 PM will free up cognitive space for evening study.',
  },
  {
    id: 't2',
    title: 'Fix Docker build issue with backend image',
    status: 'open',
    context: '@academics',
    tag: '#Academics',
    dueAt: at(0, 20),
    estimateMin: 60,
    load: 'medium',
    icon: 'Code',
    createdAt: at(-1, 14),
    completedAt: null,
    subtasks: [
      { id: 't2s1', title: 'Inspect failed layer log in the local build cache', done: false },
      { id: 't2s2', title: 'Pin base image digest and re-run CI', done: false },
    ],
    notes: 'Build fails at the dependency install layer after the base image bumped.',
    resources: [],
  },
  {
    id: 't3',
    title: 'Update resume with latest full-stack internship work',
    status: 'open',
    context: '@internship',
    tag: '#Internship',
    dueAt: at(1, 18),
    estimateMin: 45,
    load: 'medium',
    icon: 'FileText',
    createdAt: at(-3, 11),
    completedAt: null,
    subtasks: [{ id: 't3s1', title: 'Draft bullet points for the payments project', done: false }],
    resources: [],
  },
  {
    id: 't4',
    title: 'Return library books before the renewal window closes',
    status: 'open',
    context: '@errands',
    dueAt: at(-1, 17),
    estimateMin: 20,
    load: 'low',
    icon: 'BookOpen',
    createdAt: at(-6, 10),
    completedAt: null,
    subtasks: [],
    resources: [],
    pipNote: 'This one slipped past its date. Twenty minutes clears it and the guilt with it.',
  },
  {
    id: 't5',
    title: 'Read CS420 lecture notes on distributed consensus',
    status: 'done',
    context: '@academics',
    tag: '#Academics',
    dueAt: at(0, 9),
    estimateMin: 30,
    load: 'low',
    icon: 'BookOpen',
    createdAt: at(-1, 20),
    completedAt: at(0, 8, 40),
    subtasks: [{ id: 't5s1', title: 'Skim the Raft paper summary', done: true }],
    resources: [],
  },
];

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
    inbox: [],
    vitals: [
      { id: 'sleep', label: 'Sleep', value: 84, note: 'High recovery reserves thanks to 7.8 hrs sleep.' },
      { id: 'focus', label: 'Focus', value: 72, note: 'Two deep-work blocks logged before noon.' },
    ],
    history: HISTORY,
    shop: SHOP_ITEMS,
    notifications: [
      {
        id: 'n1',
        kind: 'nudge',
        title: 'One thing is overdue',
        body: 'The library books slipped past yesterday. Twenty minutes clears it.',
        createdAt: at(0, 8),
        read: false,
      },
      {
        id: 'n2',
        kind: 'reward',
        title: '+40 Sparks',
        body: 'Four tasks closed yesterday — your best day this week.',
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
