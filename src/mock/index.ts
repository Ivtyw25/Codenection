/**
 * Mock data — FRONTEND STAGE ONLY.
 *
 * None of this is computed. It is hand-authored to match the Week-4 beat of the
 * end-to-end storyline in `pip-product-spec.md` §4: Amara has three assignments
 * and a part-time shift converging, so she sits in Strained with Rest as her
 * lowest sub-stat. Every screen reads from here so the whole app tells one
 * coherent story rather than showing lorem ipsum.
 *
 * The scoring engine (§5) replaces this wholesale. Nothing outside `src/mock`
 * should hard-code a score.
 */

import { brand, colors } from '@/theme';
import type {
  CapacityState,
  LedgerEntry,
  LifeDomain,
  Task,
  UserProfile,
} from '@/types';

export const domains: LifeDomain[] = [
  {
    id: 'd1',
    name: 'Final-Year Thesis',
    categories: ['mental'],
    hoursPerWeek: 14,
    fulfillment: 0.35,
    volatility: 'spiky',
    tint: brand.primarySoft,
  },
  {
    id: 'd2',
    name: 'Debate Club President',
    categories: ['social', 'time', 'mental'],
    hoursPerWeek: 8,
    fulfillment: 0.7,
    volatility: 'spiky',
    tint: brand.secondarySoft,
  },
  {
    id: 'd3',
    name: 'Barista Shifts',
    categories: ['time', 'physical'],
    hoursPerWeek: 12,
    fulfillment: -0.6,
    volatility: 'steady',
    tint: colors.semantic.warning.fill,
  },
  {
    id: 'd4',
    name: 'Varsity Swim',
    categories: ['physical', 'time'],
    hoursPerWeek: 9,
    fulfillment: 0.5,
    volatility: 'steady',
    tint: colors.semantic.info.fill,
  },
];

export function domainById(id?: string): LifeDomain | undefined {
  return domains.find((d) => d.id === id);
}

/** Week 4 — Strained, with Rest as the lowest sub-stat. */
export const capacity: CapacityState = {
  pressure: 68,
  vitality: 44,
  subStats: { rest: 22, physical: 58, mood: 47, connection: 51 },
  trend: 'up',
  isColdStart: false,
};

export const profile: UserProfile = {
  firstName: 'Amara',
  pipName: 'Pip',
  skinIndex: 0,
  domains,
  wallet: {
    sparks: 240,
    xp: 415,
    carePoints: 37,
    balanceStreak: 5,
    tier: 'sprout',
  },
};

/** Today's Manifest — deliberately short, because Pressure is already high. */
export const manifest: Task[] = [
  {
    id: 't1',
    title: 'Draft thesis methodology section',
    status: 'active',
    domainId: 'd1',
    context: '@library',
    due: 'Today',
    effortMinutes: 90,
    notes: 'Focus on the sampling rationale — the rest is already outlined.',
    subTasks: [
      { id: 's1', title: 'Re-read supervisor feedback', done: true },
      { id: 's2', title: 'Outline sampling rationale', done: false },
      { id: 's3', title: 'Write first pass', done: false },
    ],
  },
  {
    id: 't2',
    title: 'Email venue about finals night',
    status: 'active',
    domainId: 'd2',
    context: '@online',
    due: 'Today',
    effortMinutes: 10,
  },
  {
    id: 't3',
    title: 'Pick up dry cleaning',
    status: 'active',
    domainId: 'd3',
    context: '@errands',
    due: 'Today',
    effortMinutes: 20,
    lowConfidenceEstimate: true,
  },
  {
    id: 't4',
    title: 'Review debate motion briefs',
    status: 'active',
    domainId: 'd2',
    context: '@low-energy',
    due: 'Thu',
    effortMinutes: 30,
  },
];

/** The full backlog count, so the Manifest can say "4 of 9 shown". */
export const TOTAL_ACTIVE_TASKS = 9;

/** SCR-21 — what the AI pass proposes back from a mind-dump. */
export const proposedTasks: Task[] = [
  {
    id: 'p1',
    title: 'Book the debate finals venue',
    status: 'ai-proposed',
    domainId: 'd2',
    due: 'Fri',
    effortMinutes: 15,
    subTasks: [
      { id: 'ps1', title: 'Confirm headcount with committee', done: false },
      { id: 'ps2', title: 'Email venue with the date', done: false },
    ],
  },
  {
    id: 'p2',
    title: 'Swap Saturday barista shift',
    status: 'ai-proposed',
    domainId: 'd3',
    due: 'Wed',
    effortMinutes: 10,
    lowConfidenceEstimate: true,
  },
  {
    id: 'p3',
    title: 'Read two papers for the lit review',
    status: 'ai-proposed',
    domainId: 'd1',
    due: 'Mon',
    effortMinutes: 120,
  },
];

/** 2-minute rule — surfaced separately rather than scheduled (§B.2 step 3). */
export const trivialTasks: Task[] = [
  { id: 'q1', title: 'Reply to Jordan about Thursday', status: 'ai-proposed', trivial: true },
  { id: 'q2', title: 'Add swim gala to calendar', status: 'ai-proposed', trivial: true },
];

export const ledger: LedgerEntry[] = [
  { id: 'l1', xp: 15, sparks: 10, reason: 'Ended the day Balanced', when: 'Yesterday' },
  { id: 'l2', xp: 8, sparks: 5, reason: 'Strained, with a recovery action logged', when: 'Mon' },
  { id: 'l3', xp: 0, sparks: 0, reason: 'Care Point — logged a walk', when: 'Mon' },
  { id: 'l4', xp: 15, sparks: 10, reason: 'Ended the day Balanced', when: 'Sun' },
  { id: 'l5', xp: 10, sparks: 0, reason: 'Comeback Bonus', when: 'Sat' },
];

/** Weekly Reflect — sub-stat trend across 7 days. */
export const weekTrend = {
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  rest: [55, 48, 40, 33, 28, 24, 22],
  physical: [62, 60, 64, 58, 55, 57, 58],
  mood: [58, 55, 52, 49, 51, 48, 47],
  connection: [60, 58, 54, 52, 50, 53, 51],
};

export const weekSummary = {
  completed: 18,
  deferred: 4,
  streakResetThisWeek: false,
  range: '4–10 Nov',
};

/** Calibration proposals — never auto-applied (§B.4). */
export const calibrationProposals = [
  {
    id: 'c1',
    domainId: 'd3',
    copy: 'Barista shifts have been draining you more than you expected — want Pip to weigh them accordingly?',
  },
];

/** Forecast — risk days flagged at least 48h ahead. */
export const forecast = [
  { day: 'Mon', risk: false, contributors: [] as string[] },
  { day: 'Tue', risk: false, contributors: [] },
  { day: 'Wed', risk: false, contributors: [] },
  { day: 'Thu', risk: true, contributors: ['Final-Year Thesis', 'Barista Shifts'] },
  { day: 'Fri', risk: false, contributors: [] },
  { day: 'Sat', risk: false, contributors: [] },
  { day: 'Sun', risk: false, contributors: [] },
];

export const friends = [
  { id: 'f1', name: 'Jordan', state: 'strained' as const },
  { id: 'f2', name: 'Priya', state: 'balanced' as const },
  { id: 'f3', name: 'Sam', state: 'wilting' as const },
];

export const shopItems = [
  { id: 'i1', name: 'Knit scarf', cost: 60, category: 'Hats', owned: true },
  { id: 'i2', name: 'Paper lantern', cost: 90, category: 'Habitat', owned: false },
  { id: 'i3', name: 'Moss patch', cost: 45, category: 'Habitat', owned: false },
  { id: 'i4', name: 'Dawn aura', cost: 320, category: 'Auras', owned: false },
  { id: 'i5', name: 'Speckled skin', cost: 120, category: 'Skins', owned: false },
  { id: 'i6', name: 'Rain cloud', cost: 150, category: 'Habitat', owned: false },
  // Enough per category that the 2-col grid is actually exercised.
  { id: 'i7', name: 'Dusk skin', cost: 140, category: 'Skins', owned: false },
  { id: 'i8', name: 'Moss skin', cost: 140, category: 'Skins', owned: true },
  { id: 'i9', name: 'Sand skin', cost: 110, category: 'Skins', owned: false },
  { id: 'i10', name: 'Bobble hat', cost: 80, category: 'Hats', owned: false },
  { id: 'i11', name: 'Sun hat', cost: 95, category: 'Hats', owned: false },
  { id: 'i12', name: 'Dusk aura', cost: 400, category: 'Auras', owned: false },
];

export const SHOP_CATEGORIES = ['Skins', 'Hats', 'Habitat', 'Auras'] as const;

/** SCR-02 starter skin swatches. Selection never affects mechanics. */
export const starterSkins = [
  { name: 'Clay', color: '#E8734A' },
  { name: 'Moss', color: '#7BA05B' },
  { name: 'Dusk', color: '#8E7CC3' },
  { name: 'Sand', color: '#D9A05B' },
];

/** SCR-03 — the scripted domain-discovery exchange. */
export const discoveryScript = [
  {
    role: 'assistant' as const,
    text: 'Tell me what a normal week looks like — classes, work, clubs, sport, anything that takes your time or energy.',
  },
  {
    role: 'user' as const,
    text: "Final year so mostly my thesis. I run the debate society, swim four mornings a week, and I do barista shifts twice a week.",
  },
  {
    role: 'assistant' as const,
    text: "That's a full week. Anything quieter that still takes something out of you — commuting, family, admin?",
  },
];

/** SCR-06 — the adaptive whole-person questions. */
export const wholePersonQuestions = [
  {
    id: 'w1',
    label: 'How many hours do you usually sleep?',
    helper: 'Roughly, on a normal night.',
    format: (v: number) => `${(4 + v * 6).toFixed(1)} hrs`,
    /** Always asked — it's foundational (§A.5). */
    always: true,
  },
  {
    id: 'w2',
    label: 'How are you feeling about the term ahead?',
    helper: 'One question only — real check-ins take over from here.',
    format: (v: number) => (v < 0.33 ? 'Anxious' : v < 0.66 ? 'Neutral' : 'Optimistic'),
    always: true,
  },
];
