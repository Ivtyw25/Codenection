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
import type { AppData, DayRecord, ShopItem, Task, Teammate, VitalId } from '@/types';
import { EMPTY_CALIBRATION } from './calibration';
import { DEFAULT_CATEGORIES } from './categories';
import { DEFAULT_VITALITY_MODEL, derivePipState } from './derive';
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
 * A student's week, mid-flight.
 *
 * Four tasks, because a schedule is only interesting once two things compete
 * for the same Tuesday afternoon: with one task on the list every plan is
 * trivially "do it in order", and the thing this app has to get right — a
 * midterm, a group deadline and a club night sharing one clock — never shows.
 *
 * Deliberately mid-flight rather than pristine. One step is already ticked
 * (with a real `completedAt`, so today's rail can draw it in its own slot), one
 * is handed to Arif, and the errand is due tonight. The four captures in
 * `inbox` are untouched, so Capture → Inbox → Clarify → Review still runs
 * end-to-end and commits its tasks *around* these.
 *
 * Shapes are varied on purpose so every affordance has somewhere to appear: a
 * diamond, a straight chain with a delegated head, a second diamond, and one
 * task with no steps at all.
 */
const TASKS: Task[] = [
  {
    id: 't_ds',
    title: 'Study for the Data Structures midterm',
    status: 'open',
    categoryId: 'academics',
    tag: '#Academics',
    // The night before the paper. Everything under it has to be done by then —
    // which is the whole reason the steps need dates of their own.
    dueAt: at(6, 21),
    estimateMin: 180,
    load: 'high',
    icon: 'BookOpen',
    // Almost pure thinking against a clock. Nobody else can revise for you,
    // which is why this task has no Delegate lever worth offering.
    createdAt: at(-2, 19, 30),
    completedAt: null,
    subtasks: [
      {
        id: 'ds1',
        title: 'Re-read lecture notes, weeks 1–6',
        done: true,
        // Ticked this morning, so Today's Focus opens with a finished block
        // above the "now" line rather than a rail that starts in the future.
        completedAt: at(0, 9, 40),
        estimateMin: 45,
        dependsOn: [],
        delegatedTo: null,
      },
      {
        id: 'ds2',
        title: 'Redo the tutorial problem sets',
        done: false,
        completedAt: null,
        estimateMin: 50,
        dependsOn: ['ds1'],
        delegatedTo: null,
      },
      {
        id: 'ds3',
        title: 'Write a one-page cheat sheet',
        done: false,
        completedAt: null,
        estimateMin: 35,
        dependsOn: ['ds1'],
        delegatedTo: null,
      },
      {
        id: 'ds4',
        // The one step that is worthless done early: it only measures anything
        // once the revision and the cheat sheet are both behind it.
        title: 'Sit a past-year paper under timed conditions',
        done: false,
        completedAt: null,
        estimateMin: 50,
        dependsOn: ['ds2', 'ds3'],
        delegatedTo: null,
      },
    ],
    notes: 'Closed book, one A4 sheet allowed. Trees and hashing carry the most marks.',
    /*
     * Real context, carried on the task.
     *
     * Every seeded resource here is the kind of file a student would genuinely
     * have open beside this work — a past paper, a slide deck, a marking rubric.
     * They deliberately have no `uri`: there is no file storage behind this
     * build, so `ResourceRow` renders them without an open affordance rather
     * than offering a button that does nothing. Listing what a task depends on
     * is useful on its own; pretending to hold it would not be.
     */
    resources: [
      {
        id: 'r_ds_paper',
        name: 'DS_past_year_2024.pdf',
        kind: 'PDF',
        size: '2.4 MB',
        attachmentKind: 'document',
      },
      {
        id: 'r_ds_slides',
        name: 'Week 7–10 — Trees & Hashing.pdf',
        kind: 'PDF',
        size: '8.1 MB',
        attachmentKind: 'document',
      },
      {
        id: 'r_ds_sheet',
        name: 'cheatsheet_draft.docx',
        kind: 'Doc',
        size: '48 KB',
        attachmentKind: 'document',
      },
    ],
    pipNote:
      'The past-year paper is the only step that tells you anything — everything before it is setup. Guard the slot for it.',
  },
  {
    id: 't_se',
    title: 'Finish the Software Engineering group assignment',
    status: 'open',
    categoryId: 'academics',
    tag: '#Coursework',
    dueAt: at(3, 17),
    estimateMin: 125,
    load: 'medium',
    icon: 'Code',
    // Group work: a third of its weight is other people. That social share is
    // what makes Delegate the right lever here and the wrong one for the midterm.
    createdAt: at(-3, 14),
    completedAt: null,
    subtasks: [
      {
        id: 'se1',
        title: 'Write the API design section',
        done: false,
        completedAt: null,
        estimateMin: 60,
        dependsOn: [],
        // Handed to Arif, the one balanced teammate. His hours leave the
        // student's Pressure, but the section still gates the merge.
        delegatedTo: 'tm1',
      },
      {
        id: 'se2',
        title: "Merge everyone's sections into one document",
        done: false,
        completedAt: null,
        estimateMin: 25,
        dependsOn: ['se1'],
        delegatedTo: null,
      },
      {
        id: 'se3',
        title: 'Proofread against the marking rubric',
        done: false,
        completedAt: null,
        estimateMin: 30,
        dependsOn: ['se2'],
        delegatedTo: null,
      },
      {
        id: 'se4',
        title: 'Submit to the course portal',
        done: false,
        completedAt: null,
        estimateMin: 10,
        dependsOn: ['se3'],
        delegatedTo: null,
      },
    ],
    resources: [
      {
        id: 'r_se_brief',
        name: 'SE_group_assignment_brief.pdf',
        kind: 'PDF',
        size: '640 KB',
        attachmentKind: 'document',
      },
      {
        id: 'r_se_rubric',
        name: 'marking_rubric.pdf',
        kind: 'PDF',
        size: '212 KB',
        attachmentKind: 'document',
      },
      {
        id: 'r_se_repo',
        name: 'Team repo — sprint-3 branch',
        kind: 'Link',
        size: '—',
        external: true,
      },
    ],
  },
  {
    id: 't_club',
    title: "Run the club's recruitment night",
    status: 'open',
    categoryId: 'club',
    tag: '#Leadership',
    dueAt: at(5, 19),
    estimateMin: 120,
    load: 'medium',
    icon: 'Users',
    // Chasing, confirming, being answerable — the club night is mostly social
    // load wearing a project's clothes.
    createdAt: at(-4, 21),
    completedAt: null,
    subtasks: [
      {
        id: 'cl1',
        title: 'Draft the run-of-show',
        done: false,
        completedAt: null,
        estimateMin: 40,
        dependsOn: [],
        delegatedTo: null,
      },
      {
        id: 'cl2',
        title: 'Book the lecture hall',
        done: false,
        completedAt: null,
        estimateMin: 20,
        dependsOn: ['cl1'],
        delegatedTo: null,
      },
      {
        id: 'cl3',
        title: 'Design the poster',
        done: false,
        completedAt: null,
        estimateMin: 45,
        dependsOn: ['cl1'],
        delegatedTo: null,
      },
      {
        id: 'cl4',
        // Waits on BOTH: announcing a night with no room, or a room with no
        // poster, is how a recruitment night gets eleven people.
        title: 'Post the announcement to the club Instagram',
        done: false,
        completedAt: null,
        estimateMin: 15,
        dependsOn: ['cl2', 'cl3'],
        delegatedTo: null,
      },
    ],
    resources: [],
  },
  {
    id: 't_groceries',
    title: 'Restock groceries for the week',
    status: 'open',
    categoryId: 'errands',
    dueAt: at(0, 19),
    estimateMin: 20,
    load: 'low',
    icon: 'ShoppingCart',
    // Cheap to think about, expensive to actually go and do — which is exactly
    // the shape of work the Delegate lever exists for.
    createdAt: at(0, 7, 50),
    completedAt: null,
    // No steps on purpose. One errand is one block, and it is what proves the
    // rail can carry a whole task rather than only sub-tasks.
    subtasks: [],
    resources: [],
  },

  /*
   * ── Midterm season ──────────────────────────────────────────────────────
   *
   * The three tasks below exist because the fixture was measured and found to
   * be lying about itself. With the four tasks above, the seeded world scores
   * **29 pressure** and opens Balanced — a pleasant Tuesday. Every feature
   * built for a week that has gone wrong (the Rebalancer, the Critical state,
   * the whole recovery arc) was therefore unreachable in the demo: the entry
   * banner is gated on `REBALANCE_THRESHOLD` at 68, and nothing could get near
   * it.
   *
   * These three take it to ~86 with Pip Critical, which is the state the app
   * is actually about. The lever doing most of the work is the overdue lab
   * report: `urgency` weights anything past its deadline at 2.0, double a task
   * due today, because an overdue item is the heaviest thing a student
   * carries.
   *
   * TO DEMO A CALM WEEK INSTEAD, delete these three. Nothing else depends on
   * them — the capture → clarify → review flow runs off `inbox`, and the
   * dependency-graph shapes all live in the tasks above.
   */
  {
    id: 't_lab',
    title: 'Write up the Networks lab report',
    status: 'open',
    categoryId: 'academics',
    tag: '#Coursework',
    // Yesterday. The single heaviest thing in the fixture, and the reason the
    // Rebalancer refuses to postpone it — see `postponeCandidates`.
    dueAt: at(-1, 17),
    estimateMin: 90,
    load: 'medium',
    icon: 'FileText',
    createdAt: at(-5, 11),
    completedAt: null,
    subtasks: [
      {
        id: 't_lab_s1',
        title: 'Plot the throughput results',
        done: false,
        estimateMin: 40,
        dependsOn: [],
        delegatedTo: null,
        completedAt: null,
      },
      {
        id: 't_lab_s2',
        title: 'Write the discussion section',
        done: false,
        estimateMin: 50,
        dependsOn: ['t_lab_s1'],
        delegatedTo: null,
        completedAt: null,
      },
    ],
    resources: [
      {
        id: 'r_lab_data',
        name: 'lab4_capture.pcap',
        kind: 'File',
        size: '14.7 MB',
        attachmentKind: 'document',
      },
      {
        id: 'r_lab_template',
        name: 'Networks_lab_report_template.docx',
        kind: 'Doc',
        size: '96 KB',
        attachmentKind: 'document',
      },
    ],
    pipNote:
      'This one is already late, so it is costing you twice what it would have on Friday. It is the first thing worth clearing.',
  },
  {
    id: 't_essay',
    title: 'Finish the Ethics essay draft',
    status: 'open',
    categoryId: 'academics',
    tag: '#Academics',
    dueAt: at(0, 23),
    estimateMin: 120,
    load: 'high',
    icon: 'BookOpen',
    createdAt: at(-4, 9),
    completedAt: null,
    subtasks: [
      {
        id: 't_essay_s1',
        title: 'Settle on the argument',
        done: false,
        estimateMin: 30,
        dependsOn: [],
        delegatedTo: null,
        completedAt: null,
      },
      {
        id: 't_essay_s2',
        title: 'Draft the three body sections',
        done: false,
        estimateMin: 90,
        dependsOn: ['t_essay_s1'],
        delegatedTo: null,
        completedAt: null,
      },
    ],
    resources: [
      {
        id: 'r_essay_prompt',
        name: 'Ethics_essay_prompt.pdf',
        kind: 'PDF',
        size: '184 KB',
        attachmentKind: 'document',
      },
      {
        id: 'r_essay_reading',
        name: 'Reading list — weeks 1–6.pdf',
        kind: 'PDF',
        size: '1.1 MB',
        attachmentKind: 'document',
      },
    ],
  },
  {
    id: 't_standup',
    title: 'Prep the internship sprint demo',
    status: 'open',
    categoryId: 'internship',
    tag: '#Work',
    dueAt: at(1, 10),
    estimateMin: 120,
    load: 'high',
    icon: 'Briefcase',
    createdAt: at(-2, 14),
    completedAt: null,
    subtasks: [
      {
        id: 't_standup_s1',
        title: 'Pull the sprint metrics',
        done: false,
        estimateMin: 45,
        dependsOn: [],
        delegatedTo: null,
        completedAt: null,
      },
      {
        id: 't_standup_s2',
        title: 'Build the slides',
        done: false,
        estimateMin: 75,
        dependsOn: ['t_standup_s1'],
        delegatedTo: null,
        completedAt: null,
      },
    ],
    resources: [
      {
        id: 'r_demo_deck',
        name: 'sprint3_demo_deck.pptx',
        kind: 'Slides',
        size: '5.2 MB',
        attachmentKind: 'document',
      },
      {
        id: 'r_demo_notes',
        name: 'standup_notes.md',
        kind: 'Text',
        size: '7 KB',
        attachmentKind: 'document',
      },
    ],
    pipNote:
      'Assigned to you by name, so Pip will not offer to hand this one off. Moving it is the only lever here.',
  },
];

/** The four sub-stats blended through the shipped model. */
function blend(v: Record<VitalId, number>): number {
  const w = DEFAULT_VITALITY_MODEL.weights;
  return Math.round(v.rest * w.rest + v.mood * w.mood + v.physical * w.physical + v.social * w.social);
}

/**
 * Six closed days behind today.
 *
 * Authored as SUB-STATS, with the day's Vitality and Pip state computed from
 * them by the same functions the app uses — so the history cannot say something
 * the model would disagree with, and changing a weight re-writes the past
 * correctly instead of leaving six hand-typed numbers behind.
 *
 * The week tells a specific story on purpose: a rough start (two short nights),
 * a solid recovery, and underneath it a Social Connection score sliding from 72
 * to 44 the whole time. That is the shape the detail page exists to catch — the
 * one sub-stat quietly falling while the headline number looks fine.
 */
const HISTORY: DayRecord[] = [
  { offset: -6, pressure: 62, tasksCompleted: 1, vitals: { rest: 62, mood: 58, physical: 66, social: 72 } },
  { offset: -5, pressure: 71, tasksCompleted: 0, vitals: { rest: 51, mood: 52, physical: 64, social: 70 } },
  { offset: -4, pressure: 44, tasksCompleted: 3, vitals: { rest: 74, mood: 70, physical: 67, social: 66 } },
  { offset: -3, pressure: 38, tasksCompleted: 2, vitals: { rest: 80, mood: 76, physical: 70, social: 61 } },
  { offset: -2, pressure: 41, tasksCompleted: 2, vitals: { rest: 77, mood: 78, physical: 69, social: 55 } },
  { offset: -1, pressure: 35, tasksCompleted: 4, vitals: { rest: 75, mood: 79, physical: 70, social: 49 } },
].map(({ offset, vitals, ...rest }) => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + offset);
  const vitality = blend(vitals);
  return {
    date: isoDate(d),
    ...rest,
    vitality,
    vitals,
    state: derivePipState({
      pressure: rest.pressure,
      vitality,
      pressureNote: '',
      vitalityNote: '',
    }).name,
  };
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
    // Cloned, because these are the *initial value* of mutable state and the
    // module-level constant must not be edited out from under a reload.
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, match: [...c.match] })),
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
        // Dictated, not typed. The transcript lives in `text` like any other
        // note, so triage treats it identically — the only difference the app
        // draws is the duration chip on the Inbox row.
        kind: 'voice',
        durationSec: 23,
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
    /**
     * Today's four readings — midterm season.
     *
     * Deliberately not four healthy numbers, and deliberately not the mild set
     * they used to be. The brief's storyline is a student in crunch with "zero
     * physical recovery", and the reserve has to actually show that: a low
     * Vitality is half of what tips `derivePipState` into Critical, and with
     * the old readings (71/76/68/44) the app opened Balanced no matter how
     * heavy the task list got.
     *
     * Every one of the four is now below this user's own mark, but they are
     * below it by different amounts and for different reasons, which is what
     * keeps the detail page worth opening: Physical has collapsed (the first
     * thing to go in a bad week), Rest is badly down, Mood is sagging with it,
     * and Social continues the long quiet slide it has been on all week.
     */
    vitals: [
      {
        id: 'rest',
        label: 'Rest & Sleep',
        value: 38,
        note: '5h 10m last night, and under six hours for four nights running.',
      },
      {
        id: 'mood',
        label: 'Mood & Stress',
        value: 45,
        note: 'Three flat check-ins this week, and none since Tuesday.',
      },
      {
        id: 'physical',
        label: 'Physical Vitality',
        value: 30,
        note: 'No sessions in nine days, and under 2,000 steps on four of them.',
      },
      {
        id: 'social',
        label: 'Social Connection',
        value: 41,
        note: 'No shared time logged in eight days — the longest gap this month.',
      },
    ],
    vitalityModel: DEFAULT_VITALITY_MODEL,
    /*
     * No check-ins yet, and therefore no bias.
     *
     * Seeding a learned correction would be the app claiming to know something
     * about a student it has never met. The calibration card on Home is
     * deliberately the one thing in the seeded world that starts empty — its
     * whole point is that it can only be filled in by being asked.
     */
    calibration: EMPTY_CALIBRATION,
    history: HISTORY,
    shop: SHOP_ITEMS,
    notifications: [
      // Copy stays about the queue rather than about any one task: a nudge
      // that names work the user may already have ticked reads as a bug.
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
