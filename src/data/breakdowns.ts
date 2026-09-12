/**
 * Hand-authored breakdowns for the seeded captures.
 *
 * `parseNote` in `./api.ts` splits a sentence into clauses. That is honest, and
 * it keeps working for anything the user types — but it cannot know that
 * booking a venue is pointless before the faculty approves the proposal, or
 * that reading the guidelines gates everything else. Dependencies are a claim
 * about the world, not about the grammar of the sentence.
 *
 * So the four seeded captures resolve to these, and everything else still falls
 * through to the parser. When a real model does the structuring, this file is
 * what its output has to look like.
 *
 * The shapes are varied deliberately, so every affordance has somewhere to
 * show itself: a fan-out/fan-in, a straight chain, a diamond with a delegatable
 * step, and one task with no steps at all.
 */
import type { CaptureId, ProposedTask } from '@/types';
import { startOfDay } from './format';

/** `due(5, 17)` → five days from today at 17:00. */
function due(dayOffset: number, hour: number, minute = 0): string {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * Proposals keyed by the capture they come from.
 *
 * Sub-task ids are local to the proposal — `materialise()` in the store swaps
 * them for real `SubTaskId`s at commit, rewriting `dependsOn` as it goes.
 */
export const SEEDED_BREAKDOWNS: Record<CaptureId, ProposedTask[]> = {
  // Fan-out then fan-in: reading the guidelines gates both the shortlist and
  // the outline, and the email needs both of those in hand.
  cap1: [
    {
      id: 'p_cap1',
      sourceId: 'cap1',
      title: 'Pitch FYP direction to a supervisor',
      context: '@academics',
      dueAt: due(5, 17),
      estimateMin: 150,
      load: 'high',
      icon: 'FileText',
      subtasks: [
        { id: 's1', title: 'Read the FYP project guidelines', estimateMin: 45, dependsOn: [] },
        {
          id: 's2',
          title: 'Shortlist supervisors in applied AI',
          estimateMin: 30,
          dependsOn: ['s1'],
        },
        {
          id: 's3',
          title: 'Draft proposal outline with two ideas',
          estimateMin: 60,
          dependsOn: ['s1'],
        },
        {
          id: 's4',
          title: 'Email shortlisted supervisors for a consultation',
          estimateMin: 15,
          dependsOn: ['s2', 's3'],
        },
      ],
    },
  ],

  // A straight chain — each step genuinely needs the one before it.
  cap2: [
    {
      id: 'p_cap2',
      sourceId: 'cap2',
      title: "Apply for next semester's exchange",
      context: '@academics',
      dueAt: due(7, 17),
      estimateMin: 90,
      load: 'medium',
      icon: 'CalendarDays',
      subtasks: [
        { id: 's1', title: 'Read the exchange briefing document', estimateMin: 30, dependsOn: [] },
        {
          id: 's2',
          title: 'Check CGPA and prerequisite eligibility',
          estimateMin: 20,
          dependsOn: ['s1'],
        },
        {
          id: 's3',
          title: 'Draft email to the mobility office about grants',
          estimateMin: 15,
          dependsOn: ['s2'],
        },
        {
          id: 's4',
          title: 'Total up out-of-pocket cost before committing',
          estimateMin: 25,
          dependsOn: ['s3'],
        },
      ],
    },
  ],

  // A diamond. Booking and permits both unblock on approval and can run in
  // parallel; the announcement waits on BOTH, which is the capture's own line —
  // "nothing else can move forward until the venue and permits are secured".
  //
  // Step 1 is the heaviest single item in the whole seed, which is exactly why
  // it is the one marked delegatable: this is team work, and 90 minutes is a
  // real thing to hand someone.
  cap3: [
    {
      id: 'p_cap3',
      sourceId: 'cap3',
      title: 'Get the club event approved and venue booked',
      context: '@club',
      dueAt: due(3, 18),
      estimateMin: 160,
      load: 'high',
      icon: 'Users',
      subtasks: [
        {
          id: 's1',
          title: 'Write the event proposal',
          estimateMin: 90,
          dependsOn: [],
          delegatable: true,
        },
        {
          id: 's2',
          title: 'Submit proposal for faculty approval',
          estimateMin: 15,
          dependsOn: ['s1'],
        },
        { id: 's3', title: 'Book the venue', estimateMin: 20, dependsOn: ['s2'] },
        { id: 's4', title: 'Confirm permits', estimateMin: 20, dependsOn: ['s2'] },
        {
          id: 's5',
          title: 'Announce the event to members',
          estimateMin: 15,
          dependsOn: ['s3', 's4'],
        },
      ],
    },
  ],

  // Atomic. A cart that is already full is one action, and inventing "open the
  // app" / "review items" steps to pad it out would be busywork dressed as
  // planning. It carries the 2-minute flag instead.
  cap4: [
    {
      id: 'p_cap4',
      sourceId: 'cap4',
      title: 'Check out the Shopee cart',
      context: '@errands',
      dueAt: due(0, 21),
      estimateMin: 2,
      load: 'low',
      icon: 'ShoppingCart',
      subtasks: [],
      twoMinute: true,
    },
  ],
};
