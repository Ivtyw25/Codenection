/**
 * Mock content, transcribed from the Figma screens so the rebuilt flows render
 * with their designed copy rather than lorem placeholder.
 */
import type {
  CaptureReview,
  PipProfile,
  Task,
  TaskContext,
} from '@/types';

export const USER_NAME = 'Ivan';

export const PIP: PipProfile = {
  name: 'pip',
  level: 4,
  sparks: 420,
  state: {
    name: 'balanced',
    label: 'Balanced',
    blurb: 'Pip feels steady today. Your workloads and vitality are in healthy equilibrium.',
  },
  capacity: {
    pressure: 38,
    vitality: 76,
    pressureNote: 'Manageable load with 3 active course deliverables today.',
    vitalityNote: 'High recovery reserves thanks to 7.8 hrs sleep.',
  },
  vitals: [
    { id: 'sleep', label: 'Sleep', value: 84, icon: 'Moon' },
    { id: 'focus', label: 'Focus', value: 72, icon: 'Coffee' },
  ],
  streakDays: 5,
  streakGoal: 7,
};

export const TASK_CONTEXTS: { value: TaskContext | 'all'; label: string; count?: number }[] = [
  { value: 'all', label: 'All', count: 3 },
  { value: '@club', label: '@Club' },
  { value: '@academics', label: '@Academics' },
  { value: '@internship', label: '@Internship' },
];

export const TASKS: Task[] = [
  {
    id: 't1',
    title: 'Submit venue booking request for Main Hall workshop',
    done: false,
    context: '@errands',
    tag: '#Leadership',
    due: 'Today, 4:00 PM',
    estimate: '15 min',
    load: 'low',
    loadDelta: 3,
    icon: 'CalendarDays',
    subtasks: [
      { id: 't1s1', title: 'Confirm target dates with club executive committee', done: false, nextAction: true },
      { id: 't1s2', title: 'Complete and submit Student Affairs venue form', done: false },
    ],
    notes: 'Bookings require 2 weeks notice minimum. Sound technician needed for Main Hall acoustics.',
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
    done: false,
    context: '@academics',
    tag: '#Academics',
    due: 'Today, 8:00 PM',
    estimate: '1h',
    load: 'medium',
    loadDelta: 8,
    icon: 'Code',
    subtasks: [
      { id: 't2s1', title: 'Inspect failed layer log in the local build cache', done: false, nextAction: true },
      { id: 't2s2', title: 'Pin base image digest and re-run CI', done: false },
    ],
    notes: 'Build fails at the dependency install layer after the base image bumped.',
    resources: [],
  },
  {
    id: 't3',
    title: 'Update resume with latest full-stack internship work',
    done: false,
    context: '@internship',
    tag: '#Internship',
    due: 'Tomorrow, 6:00 PM',
    estimate: '45 min',
    load: 'medium',
    loadDelta: 5,
    icon: 'FileText',
    subtasks: [{ id: 't3s1', title: 'Draft bullet points for the payments project', done: false, nextAction: true }],
    resources: [],
  },
];

/** The date strip on Today's Manifest. */
export const WEEK = [
  { dow: 'M', day: 23 },
  { dow: 'T', day: 24 },
  { dow: 'W', day: 25, today: true },
  { dow: 'T', day: 26 },
  { dow: 'F', day: 27 },
  { dow: 'S', day: 28 },
  { dow: 'S', day: 29 },
];

export const RANGE_FILTERS = [
  { value: 'today', label: 'Today · Oct 25' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'This Week' },
  { value: 'custom', label: 'Custom' },
];

/** SCR-21 — what the AI proposes after processing a capture. */
export const REVIEW: CaptureReview = {
  proposed: [
    {
      id: 'p1',
      title: 'Complete CS420 Problem Set 4',
      context: '@academics',
      due: 'Today, 5:00 PM',
      estimate: '90m',
      load: 'high',
      subtasks: ['Q1–Q3 Proof derivations', 'Python benchmark scripts'],
    },
    {
      id: 'p2',
      title: 'Email Prof. Miller re: office hours',
      context: '@academics',
      due: 'Thu Oct 25',
      estimate: '15m',
      load: 'low',
      subtasks: [],
      calibrateLater: true,
    },
    {
      id: 'p3',
      title: 'Pick up cold brew beans & laundry detergent',
      context: '@errands',
      due: 'Today, 7:30 PM',
      estimate: '30m',
      load: 'medium',
      subtasks: [],
    },
  ],
  quickWin: {
    id: 'q1',
    title: 'Reply "Got it!" to lab partner\'s text',
    note: 'Under 2 mins · Don\'t schedule, just clear it',
    done: false,
  },
  budgetRemaining: 45,
  sparksReward: 25,
};

/** Pre-filled capture text on SCR-20. */
export const CAPTURE_DRAFT = 'Submit venue booking request for Main Hall workshop';
