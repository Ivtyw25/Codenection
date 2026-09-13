/**
 * The clarification pass — what Pip asks before it commits to a breakdown.
 *
 * A capture is a sentence someone typed in three seconds. It reliably omits
 * the one fact that decides the shape of the work: whether the deadline is
 * real, whether a step is already done, whether anyone else can take it. Guess
 * wrong and the breakdown is confidently incorrect, which is worse than a
 * vague one — the student now has to un-plan it.
 *
 * So triage asks first. Every answer below changes the proposal it belongs to:
 * dropping a step and rewiring what depended on it, moving a due date, marking
 * something delegatable, collapsing a task to a two-minute job. Nothing here is
 * decoration — if an option had no effect it would not be worth the question.
 *
 * Scripted per seeded capture. Captures the user typed themselves skip
 * straight through, because there is nothing authored to ask about them.
 */
import type { CaptureId, ClarifyQuestion, ProposedSubTask, ProposedTask } from '@/types';
import { startOfDay } from './format';

function due(dayOffset: number, hour: number, minute = 0): string {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** One question per capture. More than that and triage costs more than it saves. */
export const CLARIFY_SCRIPT: Record<CaptureId, ClarifyQuestion> = {
  cap1: {
    id: 'q_fyp',
    sourceId: 'cap1',
    about: 'Your FYP direction',
    prompt:
      "You want to read the guidelines before pitching — that part's clear. When does the proposal actually need to be in?",
    options: [
      { id: 'friday', label: 'End of this week', reply: "Tight. I'll front-load the reading." },
      { id: 'next-week', label: 'Sometime next week', reply: "Fine — that's a comfortable run." },
      {
        id: 'unsure',
        label: "I don't know yet",
        reply: "Then I won't invent one. I'll flag it to calibrate later.",
      },
    ],
  },

  cap2: {
    id: 'q_exchange',
    sourceId: 'cap2',
    about: 'The exchange application',
    prompt:
      'For the exchange — do you already know whether you clear the CGPA cutoff, or is that still to check?',
    options: [
      {
        id: 'eligible',
        label: "I've checked, I'm eligible",
        reply: "Then I'll drop that step and move the email up behind the reading.",
      },
      {
        id: 'need-check',
        label: 'Still need to check',
        reply: "Keeping it in, ahead of the email — no point asking about grants you can't use.",
      },
    ],
  },

  cap3: {
    id: 'q_club',
    sourceId: 'cap3',
    about: 'The club event',
    prompt:
      "Writing the proposal is the heavy one here — about 90 minutes, and everything else waits on it. Is that yours alone, or could someone on the team take it?",
    options: [
      {
        id: 'shared',
        label: 'Someone could take it',
        reply: "Good. I'll surface it for delegation before you commit the batch.",
      },
      {
        id: 'mine',
        label: "It has to be me",
        reply: "Understood — it stays on your plate, and it's your first step.",
      },
    ],
  },

  cap4: {
    id: 'q_shopee',
    sourceId: 'cap4',
    about: 'The Shopee order',
    prompt: 'Is that cart already filled and just waiting on payment?',
    options: [
      {
        id: 'ready',
        label: 'Just need to pay',
        reply: "Two-minute job, then. I won't clutter your Manifest with steps for it.",
      },
      {
        id: 'still-picking',
        label: 'Still picking items',
        reply: "Then it's a real errand, not a two-minute one. I'll give it steps.",
      },
    ],
  },
};

/** Questions for the captures in this batch, in the order they were captured. */
export function questionsFor(sourceIds: CaptureId[]): ClarifyQuestion[] {
  return sourceIds.map((id) => CLARIFY_SCRIPT[id]).filter((q): q is ClarifyQuestion => Boolean(q));
}

/**
 * Drop a step and heal the graph around it.
 *
 * Anything that waited on the removed step inherits what *it* was waiting on,
 * so the chain closes up instead of breaking. Without this, removing a
 * middle step would orphan its dependents into looking startable when they
 * are not — or worse, leave them pointing at an id that no longer exists.
 */
function removeStep(task: ProposedTask, stepId: string): ProposedTask {
  const removed = task.subtasks.find((s) => s.id === stepId);
  if (!removed) return task;

  const subtasks: ProposedSubTask[] = task.subtasks
    .filter((s) => s.id !== stepId)
    .map((s) =>
      s.dependsOn.includes(stepId)
        ? {
            ...s,
            dependsOn: [
              ...new Set([...s.dependsOn.filter((d) => d !== stepId), ...removed.dependsOn]),
            ],
          }
        : s,
    );

  // Parent estimate stays the sum of its steps, or the pressure maths lies.
  return { ...task, subtasks, estimateMin: task.estimateMin - removed.estimateMin };
}

function patchStep(
  task: ProposedTask,
  stepId: string,
  patch: Partial<ProposedSubTask>,
): ProposedTask {
  return {
    ...task,
    subtasks: task.subtasks.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
  };
}

/**
 * Fold the answers into the proposals.
 *
 * Keyed by question id rather than by capture, so a proposal that came from a
 * capture nobody was asked about passes through untouched.
 */
export function applyAnswers(
  proposed: ProposedTask[],
  answers: Record<string, string>,
): ProposedTask[] {
  return proposed.map((task) => {
    switch (task.sourceId) {
      case 'cap1': {
        const a = answers['q_fyp'];
        if (a === 'friday') return { ...task, dueAt: due(5, 17) };
        if (a === 'next-week') return { ...task, dueAt: due(9, 17) };
        if (a === 'unsure') return { ...task, dueAt: null };
        return task;
      }

      case 'cap2': {
        // "Already eligible" makes the check redundant; drafting the email then
        // only waits on having read the briefing.
        if (answers['q_exchange'] === 'eligible') return removeStep(task, 's2');
        return task;
      }

      case 'cap3': {
        const shared = answers['q_club'] !== 'mine';
        return patchStep(task, 's1', { delegatable: shared });
      }

      case 'cap4': {
        if (answers['q_shopee'] !== 'still-picking') return task;
        // A cart still being assembled is not a two-minute job, and pretending
        // otherwise is how a planner quietly teaches you to distrust it.
        return {
          ...task,
          twoMinute: false,
          title: 'Finish and place the Shopee order',
          estimateMin: 30,
          load: 'low',
          subtasks: [
            { id: 's1', title: 'Finish picking the items', estimateMin: 15, dependsOn: [] },
            {
              id: 's2',
              title: 'Compare prices and apply vouchers',
              estimateMin: 10,
              dependsOn: ['s1'],
            },
            { id: 's3', title: 'Check out and pay', estimateMin: 5, dependsOn: ['s2'] },
          ],
        };
      }

      default:
        return task;
    }
  });
}
