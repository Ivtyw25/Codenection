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
import { isoDate } from '@/data/format';
import type {
  AppData,
  AsyncState,
  CaptureMode,
  CaptureReview,
  ProposedTask,
  Settings,
  ShopItemId,
  SubTaskId,
  Task,
  TaskId,
  TaskQuery,
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
    context: 'all',
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
  | { type: 'task/toggleSub'; id: TaskId; subId: SubTaskId }
  | { type: 'task/addSub'; id: TaskId; title: string }
  | { type: 'task/patch'; id: TaskId; patch: Partial<Task> }
  | { type: 'task/remove'; id: TaskId }
  | { type: 'task/add'; tasks: Task[] }
  | { type: 'query/set'; patch: Partial<TaskQuery> }
  | { type: 'inbox/add'; text: string; mode: CaptureMode }
  | { type: 'inbox/remove'; id: string }
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
            ? { ...t, status: 'open', completedAt: null }
            : {
                ...t,
                status: 'done',
                completedAt: action.at,
                // Closing a parent closes what is left under it.
                subtasks: t.subtasks.map((s) => ({ ...s, done: true })),
              },
        ),
      };

    case 'task/toggleSub': {
      const next = mapTask(data, action.id, (t) => ({
        ...t,
        subtasks: t.subtasks.map((s) => (s.id === action.subId ? { ...s, done: !s.done } : s)),
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
          subtasks: [...t.subtasks, { id: uid('s'), title: action.title, done: false }],
        })),
      };

    case 'task/patch':
      return { ...state, data: mapTask(data, action.id, (t) => ({ ...t, ...action.patch })) };

    case 'task/remove':
      return { ...state, data: { ...data, tasks: data.tasks.filter((t) => t.id !== action.id) } };

    case 'task/add':
      return { ...state, data: { ...data, tasks: [...data.tasks, ...action.tasks] } };

    case 'query/set':
      return { ...state, query: { ...state.query, ...action.patch } };

    case 'inbox/add':
      return {
        ...state,
        data: {
          ...data,
          inbox: [
            { id: uid('cap'), text: action.text, mode: action.mode, createdAt: new Date().toISOString() },
            ...data.inbox,
          ],
        },
      };

    case 'inbox/remove':
      return { ...state, data: { ...data, inbox: data.inbox.filter((c) => c.id !== action.id) } };

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
  addSubtask: (taskId: TaskId, title: string) => void;
  patchTask: (id: TaskId, patch: Partial<Task>) => void;
  removeTask: (id: TaskId) => void;

  setQuery: (patch: Partial<TaskQuery>) => void;

  setReview: (review: CaptureReview | null) => void;
  saveForLater: (text: string, mode: CaptureMode) => void;
  discardCapture: (id: string) => void;
  /** Commits a reviewed capture: creates tasks, awards Sparks, clears inbox. */
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
function materialise(p: ProposedTask): Task {
  return {
    id: uid('t'),
    title: p.title,
    status: 'open',
    context: p.context,
    dueAt: p.dueAt,
    estimateMin: p.estimateMin,
    load: p.load,
    icon: p.icon,
    createdAt: new Date().toISOString(),
    completedAt: null,
    subtasks: p.subtasks.map((title) => ({ id: uid('s'), title, done: false })),
    resources: [],
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
      toggleSubtask: (taskId, subId) => dispatch({ type: 'task/toggleSub', id: taskId, subId }),
      addSubtask: (taskId, title) => dispatch({ type: 'task/addSub', id: taskId, title }),
      patchTask: (id, patch) => dispatch({ type: 'task/patch', id, patch }),
      removeTask: (id) => dispatch({ type: 'task/remove', id }),

      setQuery: (patch) => dispatch({ type: 'query/set', patch }),

      setReview: (review) => dispatch({ type: 'review/set', review }),
      saveForLater: (text, mode) => dispatch({ type: 'inbox/add', text, mode }),
      discardCapture: (id) => dispatch({ type: 'inbox/remove', id }),

      commitReview: (review, accepted) => {
        const tasks = accepted.map(materialise);
        dispatch({ type: 'task/add', tasks });
        dispatch({ type: 'sparks/add', amount: review.sparksReward });
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
