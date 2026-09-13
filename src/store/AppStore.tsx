/**
 * The single source of truth.
 *
 * Every screen reads from here and writes through here; no screen owns domain
 * state of its own. That is the whole difference between the frames and an
 * application — ticking a checkbox on Home moves the gauge on Pip, because
 * both are views of this one object rather than two drawings of it.
 *
 * Stored state is deliberately small (see `AppData`). Anything computable —
 * capacity, Pip's expression, the streak, filtered lists — is derived on read
 * in `selectors.ts`, so it cannot fall out of sync with what produced it.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import * as api from '@/data/api';
import { uid } from '@/data/api';
import { formatBytes } from '@/data/attachments';
import { isBlocked } from '@/data/derive';
import { slugify } from '@/data/categories';
import { isoDate } from '@/data/format';
import type {
  AppData,
  AsyncState,
  CaptureAttachment,
  CaptureId,
  CaptureKind,
  CaptureReview,
  Category,
  CategoryId,
  IconName,
  ProposedTask,
  Resource,
  Settings,
  ShopItemId,
  SubTask,
  SubTaskId,
  Task,
  TaskId,
  TaskQuery,
  TeammateId,
} from '@/types';

// ── Toast ───────────────────────────────────────────────────────────────────

export interface Toast {
  id: string;
  message: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  /** Optional single undo affordance. */
  action?: { label: string; run: () => void };
}

// ── State ───────────────────────────────────────────────────────────────────

export interface AppState {
  /** The bootstrap read. `data` is null until it succeeds. */
  boot: AsyncState<AppData>;
  data: AppData | null;
  query: TaskQuery;
  /** Item ids with an in-flight purchase — drives per-card loading state. */
  pending: string[];
  /**
   * The parse handed from Capture to Review.
   *
   * It lives here rather than in route params because it is a structured
   * object, not a string, and because Review has to survive a back-navigation
   * to Capture and forward again without re-running the extraction.
   */
  review: CaptureReview | null;
  toast: Toast | null;
}

function initialQuery(): TaskQuery {
  return {
    categoryId: 'all',
    range: 'today',
    sort: 'due',
    hideDone: false,
    anchor: isoDate(new Date()),
  };
}

const initialState: AppState = {
  boot: { status: 'idle', data: null, error: null },
  data: null,
  query: initialQuery(),
  pending: [],
  review: null,
  toast: null,
};

// ── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'boot/start' }
  | { type: 'boot/ok'; data: AppData }
  | { type: 'boot/fail'; error: string }
  | { type: 'task/toggle'; id: TaskId; at: string }
  | { type: 'task/toggleSub'; id: TaskId; subId: SubTaskId; at: string }
  | {
      type: 'task/addSub';
      id: TaskId;
      title: string;
      estimateMin: number;
      dependsOn: SubTaskId[];
    }
  | { type: 'task/delegateSub'; id: TaskId; subId: SubTaskId; to: TeammateId | null }
  | { type: 'review/delegate'; proposalId: string; subId: string; to: TeammateId | null }
  | { type: 'task/patch'; id: TaskId; patch: Partial<Task> }
  | { type: 'task/remove'; id: TaskId }
  | { type: 'task/add'; tasks: Task[] }
  | { type: 'category/add'; label: string; icon: IconName }
  | { type: 'category/patch'; id: CategoryId; patch: Partial<Omit<Category, 'id'>> }
  | { type: 'category/archive'; id: CategoryId; on: boolean }
  | { type: 'query/set'; patch: Partial<TaskQuery> }
  | {
      type: 'inbox/add';
      text: string;
      kind: CaptureKind;
      durationSec?: number;
      attachments: CaptureAttachment[];
    }
  | { type: 'inbox/removeMany'; ids: CaptureId[] }
  | { type: 'sparks/add'; amount: number }
  | { type: 'shop/pending'; id: string; on: boolean }
  | { type: 'shop/own'; id: ShopItemId; price: number }
  | { type: 'shop/equip'; id: ShopItemId | null }
  | { type: 'review/set'; review: CaptureReview | null }
  | { type: 'notify/readAll' }
  | { type: 'settings/patch'; patch: Partial<Settings> }
  | { type: 'toast/show'; toast: Toast }
  | { type: 'toast/hide' };

/** Applies `fn` to one task, leaving every other reference untouched. */
function mapTask(data: AppData, id: TaskId, fn: (t: Task) => Task): AppData {
  return { ...data, tasks: data.tasks.map((t) => (t.id === id ? fn(t) : t)) };
}

function reducer(state: AppState, action: Action): AppState {
  // Everything below the bootstrap needs data; guard once rather than per case.
  if (
    state.data == null &&
    !action.type.startsWith('boot/') &&
    action.type !== 'toast/hide' &&
    action.type !== 'review/set'
  ) {
    return state;
  }
  const data = state.data as AppData;

  switch (action.type) {
    case 'boot/start':
      return { ...state, boot: { status: 'loading', data: null, error: null } };

    case 'boot/ok':
      return {
        ...state,
        boot: { status: 'success', data: action.data, error: null },
        data: action.data,
      };

    case 'boot/fail':
      return { ...state, boot: { status: 'error', data: null, error: action.error } };

    case 'task/toggle':
      return {
        ...state,
        data: mapTask(data, action.id, (t) =>
          t.status === 'done'
            ? {
                ...t,
                status: 'open',
                completedAt: null,
                // Re-opening clears the step stamps too, or the timeline would
                // go on drawing an open task's work in this morning's slots.
                subtasks: t.subtasks.map((s) => ({ ...s, done: false, completedAt: null })),
              }
            : {
                ...t,
                status: 'done',
                completedAt: action.at,
                // Closing a parent closes what is left under it.
                subtasks: t.subtasks.map((s) =>
                  s.done ? s : { ...s, done: true, completedAt: action.at },
                ),
              },
        ),
      };

    case 'task/toggleSub': {
      const owner = data.tasks.find((t) => t.id === action.id);
      const target = owner?.subtasks.find((s) => s.id === action.subId);
      if (!owner || !target) return state;

      // Ticking something still waiting on unfinished work is refused here as
      // well as in the UI. The screen already hides the control, but the store
      // owns the invariant and shouldn't depend on a view to hold it.
      if (!target.done && isBlocked(owner, target)) return state;

      const next = mapTask(data, action.id, (t) => ({
        ...t,
        subtasks: reopenDependents(
          t.subtasks.map((s) =>
            s.id === action.subId
              ? { ...s, done: !s.done, completedAt: s.done ? null : action.at }
              : s,
          ),
          target.done ? [action.subId] : [],
        ),
      }));
      // Re-opening a sub-task re-opens its parent: a "done" task with open work
      // under it is the kind of lie that makes a checklist useless.
      return {
        ...state,
        data: mapTask(next, action.id, (t) =>
          t.status === 'done' && t.subtasks.some((s) => !s.done)
            ? { ...t, status: 'open', completedAt: null }
            : t,
        ),
      };
    }

    case 'task/addSub':
      return {
        ...state,
        data: mapTask(data, action.id, (t) => ({
          ...t,
          // Appended, and only ever able to depend on steps that already exist
          // — which is why the graph cannot develop a cycle without a reorder
          // feature to introduce one.
          subtasks: [
            ...t.subtasks,
            {
              id: uid('s'),
              title: action.title,
              done: false,
              estimateMin: action.estimateMin,
              dependsOn: action.dependsOn,
              delegatedTo: null,
              completedAt: null,
            },
          ],
        })),
      };

    case 'task/delegateSub':
      return {
        ...state,
        data: mapTask(data, action.id, (t) => ({
          ...t,
          subtasks: t.subtasks.map((s) =>
            s.id === action.subId ? { ...s, delegatedTo: action.to } : s,
          ),
        })),
      };

    // Delegation happens during triage, before any task exists, so it has to
    // be recorded against the pending review and carried through the commit.
    case 'review/delegate': {
      if (!state.review) return state;
      return {
        ...state,
        review: {
          ...state.review,
          proposed: state.review.proposed.map((p) =>
            p.id !== action.proposalId
              ? p
              : {
                  ...p,
                  subtasks: p.subtasks.map((s) =>
                    s.id === action.subId ? { ...s, delegatedTo: action.to } : s,
                  ),
                },
          ),
        },
      };
    }

    case 'task/patch':
      return { ...state, data: mapTask(data, action.id, (t) => ({ ...t, ...action.patch })) };

    case 'task/remove':
      return { ...state, data: { ...data, tasks: data.tasks.filter((t) => t.id !== action.id) } };

    case 'task/add':
      return { ...state, data: { ...data, tasks: [...data.tasks, ...action.tasks] } };

    case 'category/add': {
      const id = slugify(
        action.label,
        data.categories.map((c) => c.id),
      );
      return {
        ...state,
        data: {
          ...data,
          categories: [
            ...data.categories,
            {
              id,
              label: action.label.trim(),
              icon: action.icon,
              match: [],
              // A new category starts un-shareable. Offering to hand someone's
              // work to a friend before they have said the work is handoffable
              // is the wrong direction to be wrong in.
              shareable: false,
            },
          ],
        },
      };
    }

    case 'category/patch':
      return {
        ...state,
        data: {
          ...data,
          // The id never moves. A rename changes what the category is CALLED,
          // and every task pointing at it keeps pointing at it — which is the
          // whole reason tasks store an id and not a label.
          categories: data.categories.map((c) =>
            c.id === action.id ? { ...c, ...action.patch } : c,
          ),
        },
      };

    case 'category/archive': {
      /*
       * Retiring, not deleting.
       *
       * Deleting a category with history under it would silently rewrite what
       * the user's last month was made of — Reflect would show a September
       * that never happened. Archiving stops it being offered on new work and
       * drops it out of the breakdown once nothing open carries it, while the
       * record stays intact.
       *
       * The filter is reset if it was pointing here, or the Manifest would sit
       * on an empty list with no visible reason why.
       */
      const query =
        action.on && state.query.categoryId === action.id
          ? { ...state.query, categoryId: 'all' as const }
          : state.query;

      return {
        ...state,
        query,
        data: {
          ...data,
          categories: data.categories.map((c) =>
            c.id === action.id ? { ...c, archived: action.on } : c,
          ),
        },
      };
    }

    case 'query/set':
      return { ...state, query: { ...state.query, ...action.patch } };

    case 'inbox/add':
      return {
        ...state,
        data: {
          ...data,
          // Newest first: the Inbox is a stack you work down, not a log.
          inbox: [
            {
              id: uid('cap'),
              text: action.text,
              kind: action.kind,
              durationSec: action.durationSec,
              attachments: action.attachments,
              createdAt: new Date().toISOString(),
            },
            ...data.inbox,
          ],
        },
      };

    case 'inbox/removeMany': {
      const gone = new Set(action.ids);
      return { ...state, data: { ...data, inbox: data.inbox.filter((c) => !gone.has(c.id)) } };
    }

    case 'sparks/add':
      return {
        ...state,
        data: { ...data, pip: { ...data.pip, sparks: Math.max(0, data.pip.sparks + action.amount) } },
      };

    case 'shop/pending':
      return {
        ...state,
        pending: action.on
          ? [...state.pending, action.id]
          : state.pending.filter((p) => p !== action.id),
      };

    case 'shop/own':
      return {
        ...state,
        data: {
          ...data,
          pip: {
            ...data.pip,
            sparks: data.pip.sparks - action.price,
            owned: [...data.pip.owned, action.id],
            // First purchase equips itself — nobody buys a skin to not wear it.
            equipped: data.pip.equipped ?? action.id,
          },
        },
      };

    case 'shop/equip':
      return { ...state, data: { ...data, pip: { ...data.pip, equipped: action.id } } };

    case 'review/set':
      return { ...state, review: action.review };

    case 'notify/readAll':
      return {
        ...state,
        data: { ...data, notifications: data.notifications.map((n) => ({ ...n, read: true })) },
      };

    case 'settings/patch':
      return { ...state, data: { ...data, settings: { ...data.settings, ...action.patch } } };

    case 'toast/show':
      return { ...state, toast: action.toast };

    case 'toast/hide':
      return { ...state, toast: null };

    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────────────────────────────

export interface AppApi {
  state: AppState;
  /** Non-null inside `<AppGate>`; screens render only once boot succeeded. */
  data: AppData;

  reload: () => void;

  toggleTask: (id: TaskId) => void;
  toggleSubtask: (taskId: TaskId, subId: SubTaskId) => void;
  addSubtask: (
    taskId: TaskId,
    title: string,
    options?: { estimateMin?: number; dependsOn?: SubTaskId[] },
  ) => void;
  /** Hand a committed step to a teammate, or pass null to take it back. */
  delegateSubtask: (taskId: TaskId, subId: SubTaskId, to: TeammateId | null) => void;
  /** The same, for a step that is still only a proposal in the review sheet. */
  delegateProposedSubtask: (proposalId: string, subId: string, to: TeammateId | null) => void;
  patchTask: (id: TaskId, patch: Partial<Task>) => void;
  removeTask: (id: TaskId) => void;

  /** Categories are the user's own — they can add, rename and retire them. */
  addCategory: (label: string, icon: IconName) => void;
  patchCategory: (id: CategoryId, patch: Partial<Omit<Category, 'id'>>) => void;
  /** Retire (or restore) a category without touching the work filed under it. */
  archiveCategory: (id: CategoryId, on: boolean) => void;

  setQuery: (patch: Partial<TaskQuery>) => void;

  setReview: (review: CaptureReview | null) => void;
  /**
   * The only thing the capture screen does.
   *
   * The entry and its attachments land as ONE inbox item. Nothing is parsed,
   * categorised or turned into a task on the way in.
   */
  capture: (
    text: string,
    kind: CaptureKind,
    options?: { durationSec?: number; attachments?: CaptureAttachment[] },
  ) => void;
  discardCaptures: (ids: CaptureId[]) => void;
  /**
   * Commits a triaged batch: creates the accepted tasks, awards Sparks, and
   * retires every note in the batch from the Inbox — including ones the user
   * dropped, since they have now been looked at and decided on.
   */
  commitReview: (review: CaptureReview, accepted: ProposedTask[]) => Task[];

  buy: (itemId: ShopItemId) => Promise<void>;
  equip: (itemId: ShopItemId | null) => void;

  markNotificationsRead: () => void;
  patchSettings: (patch: Partial<Settings>) => void;

  toast: (message: string, tone?: Toast['tone'], action?: Toast['action']) => void;
  hideToast: () => void;
}

const Ctx = createContext<AppApi | null>(null);

/** Converts a reviewed proposal into a real task. */
/** Attachment kind → the short label Task Detail's resource rows show. */
const RESOURCE_LABEL: Record<CaptureAttachment['kind'], string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  document: 'File',
};

/**
 * Re-open every step that transitively depended on one just un-ticked.
 *
 * Without this, un-ticking a prerequisite leaves its dependents "done" while
 * the thing they were waiting for is open again — a state the lock UI cannot
 * draw and the user cannot fix, because a done row shows no lock. Cascading
 * keeps the one invariant worth holding: a done step never has an open
 * dependency.
 *
 * Iterates to a fixed point rather than recursing, so a chain of any depth
 * settles in one call.
 */
function reopenDependents(subtasks: SubTask[], reopened: SubTaskId[]): SubTask[] {
  if (reopened.length === 0) return subtasks;

  const open = new Set(reopened);
  let out = subtasks;
  let changed = true;

  while (changed) {
    changed = false;
    out = out.map((s) => {
      if (!s.done || !s.dependsOn.some((d) => open.has(d))) return s;
      open.add(s.id);
      changed = true;
      return { ...s, done: false, completedAt: null };
    });
  }

  return out;
}

function materialise(p: ProposedTask, resources: Resource[]): Task {
  const now = new Date().toISOString();
  return {
    id: uid('t'),
    title: p.title,
    status: p.completeNow ? 'done' : 'open',
    categoryId: p.categoryId,
    dueAt: p.dueAt,
    estimateMin: p.estimateMin,
    load: p.load,
    icon: p.icon,
    createdAt: now,
    completedAt: p.completeNow ? now : null,
    // Proposal-local ids exist only so a proposal can express "this waits on
    // that". Mint the real ids first, then rewrite the edges through that map,
    // so dependencies survive the crossing from proposal to task.
    subtasks: (() => {
      const realId = new Map(p.subtasks.map((s) => [s.id, uid('s')]));
      return p.subtasks.map((s) => ({
        id: realId.get(s.id)!,
        title: s.title,
        done: Boolean(p.completeNow),
        estimateMin: s.estimateMin,
        dependsOn: s.dependsOn
          .map((d) => realId.get(d))
          .filter((id): id is string => Boolean(id)),
        delegatedTo: s.delegatedTo ?? null,
        completedAt: p.completeNow ? now : null,
      }));
    })(),
    resources,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(() => {
    dispatch({ type: 'boot/start' });
    api
      .bootstrap()
      .then((data) => dispatch({ type: 'boot/ok', data }))
      .catch((e: Error) => dispatch({ type: 'boot/fail', error: e.message }));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const hideToast = useCallback(() => dispatch({ type: 'toast/hide' }), []);

  const toast = useCallback<AppApi['toast']>((message, tone = 'neutral', action) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    dispatch({ type: 'toast/show', toast: { id: uid('toast'), message, tone, action } });
    toastTimer.current = setTimeout(() => dispatch({ type: 'toast/hide' }), 3600);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const api_: AppApi = useMemo(() => {
    const data = state.data as AppData;

    return {
      state,
      data,
      reload,

      toggleTask: (id) => dispatch({ type: 'task/toggle', id, at: new Date().toISOString() }),
      toggleSubtask: (taskId, subId) =>
        dispatch({ type: 'task/toggleSub', id: taskId, subId, at: new Date().toISOString() }),
      addSubtask: (taskId, title, options) =>
        dispatch({
          type: 'task/addSub',
          id: taskId,
          title,
          estimateMin: options?.estimateMin ?? 15,
          dependsOn: options?.dependsOn ?? [],
        }),
      delegateSubtask: (taskId, subId, to) =>
        dispatch({ type: 'task/delegateSub', id: taskId, subId, to }),
      delegateProposedSubtask: (proposalId, subId, to) =>
        dispatch({ type: 'review/delegate', proposalId, subId, to }),
      patchTask: (id, patch) => dispatch({ type: 'task/patch', id, patch }),
      removeTask: (id) => dispatch({ type: 'task/remove', id }),

      addCategory: (label, icon) => dispatch({ type: 'category/add', label, icon }),
      patchCategory: (id, patch) => dispatch({ type: 'category/patch', id, patch }),
      archiveCategory: (id, on) => dispatch({ type: 'category/archive', id, on }),

      setQuery: (patch) => dispatch({ type: 'query/set', patch }),

      setReview: (review) => dispatch({ type: 'review/set', review }),
      capture: (text, kind, options) =>
        dispatch({
          type: 'inbox/add',
          text,
          kind,
          durationSec: options?.durationSec,
          attachments: options?.attachments ?? [],
        }),
      discardCaptures: (ids) => dispatch({ type: 'inbox/removeMany', ids }),

      commitReview: (review, accepted) => {
        /*
         * Attachments follow their note into the first task it produces.
         *
         * They belong to the capture, not to any one proposal, so copying them
         * onto every task a note yields would duplicate the same file across
         * three rows. Attaching them to the first — and dropping them on the
         * floor if that task was dropped — is the only reading that neither
         * duplicates nor silently discards what the user attached.
         */
        const claimed = new Set<CaptureId>();
        const tasks = accepted.map((proposal) => {
          const note = data.inbox.find((n) => n.id === proposal.sourceId);
          const first = note != null && !claimed.has(proposal.sourceId);
          if (first) claimed.add(proposal.sourceId);

          const resources: Resource[] =
            first && note
              ? note.attachments.map((a) => ({
                  id: a.id,
                  name: a.name,
                  kind: RESOURCE_LABEL[a.kind],
                  size: formatBytes(a.sizeBytes),
                }))
              : [];

          return materialise(proposal, resources);
        });
        dispatch({ type: 'task/add', tasks });
        dispatch({ type: 'sparks/add', amount: review.sparksReward });
        dispatch({ type: 'inbox/removeMany', ids: review.sourceIds });
        dispatch({ type: 'review/set', review: null });
        return tasks;
      },

      buy: async (itemId) => {
        const item = data.shop.find((i) => i.id === itemId);
        if (!item || data.pip.owned.includes(itemId)) return;
        dispatch({ type: 'shop/pending', id: itemId, on: true });
        try {
          await api.purchase(itemId, item.price, data.pip.sparks);
          dispatch({ type: 'shop/own', id: itemId, price: item.price });
          toast(`${item.name} unlocked · −${item.price} Sparks`, 'success');
        } catch (e) {
          toast((e as Error).message, 'danger');
          throw e;
        } finally {
          dispatch({ type: 'shop/pending', id: itemId, on: false });
        }
      },

      equip: (itemId) => dispatch({ type: 'shop/equip', id: itemId }),

      markNotificationsRead: () => dispatch({ type: 'notify/readAll' }),
      patchSettings: (patch) => dispatch({ type: 'settings/patch', patch }),

      toast,
      hideToast,
    };
  }, [state, reload, toast, hideToast]);

  return <Ctx.Provider value={api_}>{children}</Ctx.Provider>;
}

export function useApp(): AppApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
