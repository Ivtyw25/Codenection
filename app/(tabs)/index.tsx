import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  AlarmClock,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Inbox,
  Leaf,
  SlidersHorizontal,
  User,
} from 'lucide-react-native';

import {
  ForecastRow,
  ForestHeader,
  Gauge,
  NotificationsDrawer,
  PipMascot,
  StatTile,
  StreakDrawer,
  Timeline,
  onForest,
} from '@/components/app';
import { Button, Card, Chip, EmptyState, IconButton, Interactive, Sheet, Txt } from '@/components/ui';
import { FELT_OPTIONS } from '@/data/calibration';
import { formatDue, formatEstimate, isOverdue, startOfDay } from '@/data/format';
import { useApp } from '@/store/AppStore';
import type { Slot } from '@/store/selectors';
import {
  useCapacity,
  useCheckIn,
  useForecast,
  useInboxCount,
  useNow,
  usePipState,
  useStreak,
  useTodayTimeline,
  useUnreadCount,
  useWeekSeries,
} from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { PipState, PipStateName, Task } from '@/types';

/**
 * Home — SCR-10.
 *
 * Every figure on this screen is derived. The state card reads whatever the
 * open task list currently adds up to; ticking a row here moves the gauges
 * above it and the mascot in the tab bar below it in the same frame.
 */
export default function HomeScreen() {
  const scheme = useScheme();
  const router = useRouter();
  const now = useNow();

  const { data, toggleTask, toggleSubtask, patchTask, recordFeeling, reload, toast } = useApp();
  const capacity = useCapacity();
  const forecast = useForecast();
  const pip = usePipState();
  const streak = useStreak();
  const today = useTodayTimeline();
  const week = useWeekSeries();
  const unread = useUnreadCount();
  const inboxCount = useInboxCount();
  const checkIn = useCheckIn();

  const [notifOpen, setNotifOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** The task whose deadline is being moved, or null while the sheet is shut. */
  const [reassigning, setReassigning] = useState<Task | null>(null);

  /**
   * Open work whose deadline has already passed.
   *
   * Sorted oldest-first, so the thing that has been late longest is the thing
   * asked about first — a list ordered any other way makes the student scan for
   * the worst item, which is work the app should be doing for them.
   */
  const overdue = useMemo(
    () =>
      data.tasks
        .filter((t) => t.status === 'open' && isOverdue(t.dueAt, now))
        .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()),
    [data.tasks, now],
  );

  /**
   * Give an overdue task a new deadline.
   *
   * This is the whole mechanism: a task is overdue because its date is in the
   * past and for no other reason, so writing a future date is what ends the
   * state. There is no separate "acknowledged" flag to get out of step with the
   * date — which is exactly the bug that a flag would eventually produce, a
   * task showing as fine while its deadline sat two weeks behind it.
   */
  const reassign = useCallback(
    (task: Task, to: Date) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const previous = task.dueAt;
      patchTask(task.id, {
        dueAt: to.toISOString(),
        // Counted like any other deferral. A task that keeps being reassigned
        // is a task that is not going to happen, and the Rebalancer reads this
        // to stop offering to move it for a fourth time.
        postponedFrom: previous,
        postponeCount: (task.postponeCount ?? 0) + 1,
      });
      setReassigning(null);
      toast(`“${task.title.slice(0, 28)}${task.title.length > 28 ? '…' : ''}” → ${formatDue(to.toISOString(), now)}`, 'success', {
        label: 'Undo',
        run: () =>
          patchTask(task.id, {
            dueAt: previous,
            postponedFrom: task.postponedFrom ?? null,
            postponeCount: task.postponeCount ?? 0,
          }),
      });
    },
    [patchTask, toast, now],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reload();
    // The bootstrap resolves into the store; the control just needs releasing.
    setTimeout(() => setRefreshing(false), 900);
  }, [reload]);

  /**
   * Ticking a block on the rail.
   *
   * A synthetic block IS its task — a step-less errand has nothing smaller to
   * tick — so the two cases route to different actions rather than the rail
   * pretending every block is a sub-task.
   */
  const completeSlot = useCallback(
    (slot: Slot) => {
      const wasDone = slot.done;
      Haptics.impactAsync(
        wasDone ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
      ).catch(() => {});

      if (slot.synthetic) {
        toggleTask(slot.taskId);
        if (!wasDone) {
          toast(`“${slot.title.slice(0, 32)}${slot.title.length > 32 ? '…' : ''}” done`, 'success', {
            label: 'Undo',
            run: () => toggleTask(slot.taskId),
          });
        }
        return;
      }

      toggleSubtask(slot.taskId, slot.subId);
      if (!wasDone) {
        toast('Step done · the rest of the day moves up', 'success', {
          label: 'Undo',
          run: () => toggleSubtask(slot.taskId, slot.subId),
        });
      }
    },
    [toggleTask, toggleSubtask, toast],
  );

  // This Week — the two metrics from Figma 19:485, over the real 7-day series.
  const openCount = data.tasks.filter((t) => t.status === 'open').length;
  const weekCompleted = week.reduce((sum, d) => sum + d.tasksCompleted, 0);
  const weekPlanned = Math.max(weekCompleted, week.length * 3);
  const focusMinutes = data.tasks
    .filter((t) => t.completedAt)
    .reduce((sum, t) => sum + t.estimateMin, 0);

  const stateTone =
    pip.name === 'balanced' ? 'success' : pip.name === 'critical' || pip.name === 'depleted' ? 'danger' : 'warning';

  return (
    <View style={{ flex: 1, backgroundColor: scheme.ground }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space[10] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={scheme.primary} />
        }
      >
        <ForestHeader pad={space[8]}>
          <View style={styles.headerTop}>
            <View style={styles.brandRow}>
              <Txt variant="h3" color={onForest.primary}>
                pip
              </Txt>
              <Leaf size={16} color={scheme.secondary} />
            </View>
            <View style={styles.headerActions}>
              {/*
                The Inbox lives here rather than in the tab bar because it is a
                destination you visit deliberately, when you have the attention
                for triage — unlike capture, which has to be one tap from
                anywhere. The badge is the only place the queue depth is shown.
              */}
              <IconButton
                icon={<Inbox size={18} color={onForest.primary} />}
                accessibilityLabel="Capture inbox"
                tone="onDark"
                badge={inboxCount}
                onPress={() => router.push('/inbox')}
              />
              <IconButton
                icon={<Bell size={18} color={onForest.primary} />}
                accessibilityLabel="Notifications"
                tone="onDark"
                badge={unread}
                onPress={() => setNotifOpen(true)}
              />
              {/*
                Profile's way in, now that Rebalance holds its tab slot. It
                belongs in the header with the other two destinations you visit
                deliberately rather than continuously — nobody opens their
                settings twice a day, and a fifth of the tab bar is an expensive
                place to keep something nobody opens.
              */}
              <IconButton
                icon={<User size={18} color={onForest.primary} />}
                accessibilityLabel="Your profile and settings"
                tone="onDark"
                onPress={() => router.push('/profile')}
              />
            </View>
          </View>

          <View style={styles.greetRow}>
            <View style={styles.greetText}>
              <Txt variant="bodySm" color={onForest.secondary}>
                {greeting(now)},
              </Txt>
              <Txt variant="h1" color={onForest.primary}>
                {data.user.name}
              </Txt>
              <Txt variant="bodySm" color={onForest.muted}>
                Small steps, big progress.
              </Txt>
            </View>
            <PipMascot size={92} state={pip.name} />
          </View>
        </ForestHeader>

        <View style={styles.body}>
          {/* ── Pip's current state ─────────────────────────────────────── */}
          <Card
            elevated
            style={styles.stateCard}
            onPress={() => router.push('/pip')}
            accessibilityLabel={`Pip is ${pip.label}. ${pip.blurb}`}
            accessibilityHint="Opens Pip's detail — the only route to it now that the tab bar carries capture"
          >
            <View style={styles.stateHead}>
              <View style={[styles.stateBadge, { backgroundColor: status[stateTone].bg }]}>
                <Leaf size={16} color={status[stateTone].solid} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="caption" muted>
                  Pip&apos;s current state
                </Txt>
                <Txt variant="h3">{pip.label}</Txt>
              </View>
              <ChevronRight size={18} color={scheme.textMuted} />
            </View>

            {/*
              Two gauges, and nothing between them.

              This card used to carry the category breakdown between the bars
              and a line of derived commentary under each ("2 overdue items are
              carrying most of this", "Rest & Sleep is 37 below your mark"). All
              of it was true and all of it belonged one screen deeper. Home is
              the first thing a student sees, often before they have decided
              whether they can face the day, and a card that answers "how am I?"
              with two numbers, a five-way decomposition and two diagnoses has
              stopped answering the question and started briefing them.

              So Home reports. The Pip tab — one tap away, through this very
              card — still carries the breakdown and both notes, for the moment
              somebody wants the working rather than the reading.
            */}
            <Gauge label="Pressure" value={capacity.pressure} kind="pressure" />
            <Gauge label="Vitality" value={capacity.vitality} kind="vitality" />

            {/*
              The gauges say where today is; this says where tomorrow lands if
              the plan below is followed. Without it the card reports a number
              and leaves the student to work out whether their day is worth
              having.
            */}
            <ForecastRow
              forecast={forecast}
              pressure={capacity.pressure}
              vitality={capacity.vitality}
            />
          </Card>

          {/*
            ── How does that actually compare? ────────────────────────────

            The one thing on this screen that is not derived, and the only way
            the two numbers above it can ever be told they are wrong.

            Everything else in this app is arithmetic over a task list, which is
            its strength and exactly the shape of its blind spot: a week can
            contain nine hours of work and cost one person nothing and another
            everything, and no amount of counting minutes separates the two. So
            once a day, next to its own reading, Pip asks — and the gap between
            the answer and the reading is the only information in the system
            that could not have been computed.

            Asked once per day and then gone. A wellbeing prompt that reappears
            after you have answered it has stopped asking and started nagging.
          */}
          {!checkIn.answered ? (
            <CheckInCard
              computed={pip}
              pressure={capacity.pressure}
              vitality={capacity.vitality}
              onAnswer={(felt) => {
                Haptics.selectionAsync().catch(() => {});
                recordFeeling(felt, pip.name, capacity.pressure, capacity.vitality);
                toast('Logged. Pip will weigh that against its own read.', 'success');
              }}
            />
          ) : checkIn.note ? (
            <Interactive
              accessibilityRole="button"
              accessibilityLabel={`Today's check-in is logged. ${checkIn.note}`}
              onPress={() => router.push('/pip')}
              radius="lg"
              style={[styles.calibrated, { backgroundColor: scheme.surface, borderColor: scheme.border }]}
            >
              <SlidersHorizontal size={16} color={scheme.primary} />
              <Txt variant="caption" muted style={{ flex: 1 }}>
                {checkIn.note}
              </Txt>
            </Interactive>
          ) : null}

          {/* ── Streak ──────────────────────────────────────────────────── */}
          <Interactive
            accessibilityRole="button"
            accessibilityLabel={
              streak.days > 0
                ? `${streak.days} consecutive balanced days. View streak details.`
                : 'No active streak. View streak details.'
            }
            onPress={() => setStreakOpen(true)}
            radius="lg"
            style={[styles.streak, { backgroundColor: scheme.surface, borderColor: scheme.border }]}
          >
            <Flame size={18} color={streak.days > 0 ? status.warning.solid : scheme.textDisabled} />
            <Txt variant="bodySm" style={{ flex: 1 }}>
              {streak.days > 0 ? (
                <>
                  <Txt variant="bodySm" style={styles.semibold}>
                    {streak.days} consecutive {streak.days === 1 ? 'day' : 'days'}
                  </Txt>
                  {' in a balanced state — keep it going.'}
                </>
              ) : (
                'No streak running. One balanced day starts a new one.'
              )}
            </Txt>
            <ChevronRight size={18} color={scheme.textMuted} />
          </Interactive>

          {/* ── Today's Focus ───────────────────────────────────────────── */}
          <View style={styles.sectionHead}>
            <Txt variant="h3">Today&apos;s Focus</Txt>
            <Interactive
              accessibilityRole="button"
              accessibilityLabel="View all tasks"
              onPress={() => router.push('/tasks')}
              radius="pill"
              style={styles.viewAll}
            >
              <Txt variant="label" color={scheme.primary}>
                View all
              </Txt>
              <ChevronRight size={16} color={scheme.primary} />
            </Interactive>
          </View>

          {/*
            ── Overdue ───────────────────────────────────────────────────

            Above the rail, and deliberately not folded into it.

            A late task used to appear as an ordinary block somewhere down
            today's timeline wearing a small red "Past deadline" chip, which
            quietly made overdue a property of a *block* — something the
            scheduler noticed in passing. It is not. It is a state of the TASK,
            and it is the one state in the app the student has to resolve
            themselves, because only they know whether Thursday's essay is
            getting done tonight or moving to next week.

            So it is listed here as a choice, with the only two answers that end
            it: do it, or give it a new date. It stays overdue until they pick
            one — reassigning is what makes it an ordinary task again, and
            nothing else does. Pip will not quietly roll a deadline forward to
            tidy the list up, because a deadline that moves on its own is a
            deadline that has stopped meaning anything.
          */}
          {overdue.length > 0 ? (
            <OverdueCard
              tasks={overdue}
              onOpen={(taskId) => router.push(`/task/${taskId}`)}
              onReassign={(task) => setReassigning(task)}
            />
          ) : null}

          {/*
            A rail of STEPS, not a stack of tasks.
            “Three cards due today” is a summary of the backlog; this is the
            answer to the question the student actually has at 10am, which is
            what to start and when — and it is the only view in the app where
            two different tasks can be read against each other on one clock.
          */}
          {today.slots.length > 0 ? (
            <Card>
              <Timeline
                slots={today.slots}
                now={now}
                showParent
                nowMarker
                onToggle={completeSlot}
                onOpen={(slot) => router.push(`/task/${slot.taskId}`)}
                footer={
                  <View style={styles.planFooter}>
                    <Clock size={13} color={scheme.textMuted} />
                    <Txt variant="caption" muted>
                      {formatEstimate(today.plannedMin)} planned today
                    </Txt>
                  </View>
                }
              />
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={<CheckCircle2 size={28} color={status.success.solid} />}
                title={openCount > 0 ? 'Nothing scheduled today' : 'Nothing left for today'}
                body={
                  openCount > 0
                    ? 'Everything open is planned for a later day. Pip is not going to invent work to fill the gap.'
                    : 'Your manifest is clear. Pip is going to be insufferable about this.'
                }
                action={{ label: 'Capture something', onPress: () => router.push('/capture') }}
              />
            </Card>
          )}

          {/* ── This Week (Figma 19:485) ────────────────────────────────── */}
          <View style={styles.sectionHead}>
            <Txt variant="h3">This Week</Txt>
            <Interactive
              accessibilityRole="button"
              accessibilityLabel="Open Reflect"
              onPress={() => router.push('/reflect')}
              radius="pill"
              style={styles.viewAll}
            >
              <Txt variant="label" color={scheme.primary}>
                See trends
              </Txt>
              <ChevronRight size={16} color={scheme.primary} />
            </Interactive>
          </View>

          <View style={styles.tiles}>
            <StatTile
              icon={<CheckCircle2 size={14} color={status.success.solid} />}
              label="Tasks completed"
              value={String(weekCompleted)}
              caption={`of ~${weekPlanned} planned`}
              progress={(weekCompleted / weekPlanned) * 100}
              tone="success"
              onPress={() => router.push('/reflect')}
            />
            <StatTile
              icon={<Clock size={14} color={scheme.primary} />}
              label="Focus time"
              value={formatEstimate(focusMinutes)}
              caption="logged against closed work"
              progress={Math.min(100, (focusMinutes / 600) * 100)}
              onPress={() => router.push('/reflect')}
            />
          </View>

          <View style={styles.legend}>
            <Chip label={`${data.tasks.filter((t) => t.status === 'open').length} open`} size="sm" />
            <Chip
              label={`${data.tasks.filter((t) => t.status === 'done').length} done`}
              size="sm"
              tone="success"
            />
          </View>
        </View>
      </ScrollView>

      <NotificationsDrawer visible={notifOpen} onClose={() => setNotifOpen(false)} />
      <StreakDrawer visible={streakOpen} onClose={() => setStreakOpen(false)} />

      <ReassignSheet
        task={reassigning}
        now={now}
        onClose={() => setReassigning(null)}
        onPick={(to) => reassigning && reassign(reassigning, to)}
      />
    </View>
  );
}

/**
 * The overdue list.
 *
 * Framed as a question with two answers rather than as an alert with none. The
 * temptation on a screen like this is a red banner counting the failures — "3
 * overdue!" — which tells a student something they already know and gives them
 * nowhere to put it. Every row here is a decision they can close in one tap.
 *
 * The copy never says "late". It says when it was due and offers a new date,
 * because the point of the row is the choice at the end of it, not the verdict
 * at the start.
 */
function OverdueCard({
  tasks,
  onOpen,
  onReassign,
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
  onReassign: (task: Task) => void;
}) {
  const scheme = useScheme();
  const now = useNow();

  return (
    <Card style={[styles.overdue, { borderColor: status.warning.solid }]}>
      <View style={styles.overdueHead}>
        <AlarmClock size={16} color={status.warning.fg} />
        <Txt variant="h4" color={status.warning.fg} style={{ flex: 1 }}>
          {tasks.length === 1 ? 'One thing has passed its date' : `${tasks.length} things have passed their dates`}
        </Txt>
      </View>
      <Txt variant="caption" muted>
        These stay here until you finish them or give them a new date. Pip will not move a deadline
        on its own.
      </Txt>

      <View style={{ gap: space[2], marginTop: space[1] }}>
        {tasks.map((task) => (
          <View key={task.id} style={[styles.overdueRow, { borderColor: scheme.border }]}>
            <Interactive
              accessibilityRole="button"
              accessibilityLabel={`${task.title}, was due ${formatDue(task.dueAt, now)}. Open it.`}
              onPress={() => onOpen(task.id)}
              radius="sm"
              noScale
              style={{ flex: 1, gap: space[0.5] }}
            >
              <Txt variant="bodySm" numberOfLines={1}>
                {task.title}
              </Txt>
              <Txt variant="caption" color={status.warning.fg}>
                was due {formatDue(task.dueAt, now)}
                {(task.postponeCount ?? 0) > 0
                  ? ` · moved ${task.postponeCount === 1 ? 'once' : `${task.postponeCount} times`}`
                  : ''}
              </Txt>
            </Interactive>

            <Button
              label="Reassign"
              variant="secondary"
              size="sm"
              icon={<CalendarClock size={14} color={scheme.primary} />}
              onPress={() => onReassign(task)}
              accessibilityHint="Choose a new date. It stops being overdue once it has one."
            />
          </View>
        ))}
      </View>
    </Card>
  );
}

/**
 * Picking the new date.
 *
 * Relative options rather than a calendar. The question being answered is "when
 * will I actually do this?", and the honest answers to that are tonight, in the
 * morning, at the weekend, next week — not the 14th. A date grid would make the
 * student translate an intention into a number, which is a decision-cost this
 * sheet exists to avoid, and on the day their list is already late is the worst
 * possible moment to charge it.
 */
function ReassignSheet({
  task,
  now,
  onClose,
  onPick,
}: {
  task: Task | null;
  now: Date;
  onClose: () => void;
  onPick: (to: Date) => void;
}) {
  const scheme = useScheme();

  const options = useMemo(() => {
    const at = (daysAhead: number, hour: number) => {
      const d = startOfDay(now);
      d.setDate(d.getDate() + daysAhead);
      d.setHours(hour, 0, 0, 0);
      return d;
    };

    // Saturday from wherever the week currently is. Sunday counts as already
    // being the weekend, so it offers the one coming rather than one gone.
    const dow = now.getDay();
    const toSaturday = dow === 6 ? 7 : (6 - dow + 7) % 7 || 7;

    return [
      { label: 'Later today', hint: 'By this evening', date: at(0, 21) },
      { label: 'Tomorrow', hint: 'Morning', date: at(1, 9) },
      { label: 'This weekend', hint: 'Saturday', date: at(toSaturday, 11) },
      { label: 'Next week', hint: 'A clear run at it', date: at(7, 9) },
    ];
  }, [now]);

  return (
    <Sheet visible={task != null} onClose={onClose} title="Give it a new date">
      <View style={{ gap: space[2] }}>
        <Txt variant="bodySm" muted>
          {task
            ? `“${task.title}” was due ${formatDue(task.dueAt, now)}. Pick when it is actually happening — it stops being overdue as soon as it has a date it can still meet.`
            : ''}
        </Txt>

        {options.map((option) => (
          <Interactive
            key={option.label}
            accessibilityRole="button"
            accessibilityLabel={`${option.label}. ${option.hint}.`}
            onPress={() => onPick(option.date)}
            radius="md"
            style={[styles.dateOption, { borderColor: scheme.border }]}
          >
            <View style={{ flex: 1 }}>
              <Txt variant="bodySm">{option.label}</Txt>
              <Txt variant="caption" muted>
                {option.hint}
              </Txt>
            </View>
            <Txt variant="caption" muted>
              {formatDue(option.date.toISOString(), now)}
            </Txt>
            <ChevronRight size={16} color={scheme.textMuted} />
          </Interactive>
        ))}
      </View>
    </Sheet>
  );
}

/**
 * The daily check-in.
 *
 * Pip's own read is shown FIRST and in full — the state, and the two numbers
 * behind it. Asking "how do you feel?" on its own would collect a mood; asking
 * it next to a stated prediction collects a *correction*, which is the only
 * thing this card is for. It also makes the app go first, which matters: a tool
 * that asks you to rate yourself is doing something quite different from one
 * that says what it thinks and invites you to disagree.
 *
 * Five options, in the app's own vocabulary rather than on a 1–10 scale. Nobody
 * knows what a 6 means, and the answer has to land on `PipStateName` to be
 * comparable with the reading at all.
 */
function CheckInCard({
  computed,
  pressure,
  vitality,
  onAnswer,
}: {
  computed: PipState;
  pressure: number;
  vitality: number;
  onAnswer: (felt: PipStateName) => void;
}) {
  const scheme = useScheme();

  return (
    <Card style={styles.checkIn}>
      <View style={styles.checkInHead}>
        <SlidersHorizontal size={16} color={scheme.primary} />
        <Txt variant="h4" style={{ flex: 1 }}>
          Does that match how today feels?
        </Txt>
      </View>

      <Txt variant="bodySm" muted>
        Pip reads you as <Txt variant="bodySm" style={styles.semibold}>{computed.label.toLowerCase()}</Txt> — pressure {pressure},
        reserve {vitality}. That is counted off your task list, which can only ever be half the
        story. Tell it the other half and it will weigh the two together from now on.
      </Txt>

      <View style={styles.feltRow}>
        {FELT_OPTIONS.map((option) => (
          <Interactive
            key={option.state}
            accessibilityRole="button"
            accessibilityLabel={`${option.label}. ${option.blurb}`}
            onPress={() => onAnswer(option.state)}
            radius="md"
            style={[
              styles.felt,
              {
                borderColor: option.state === computed.name ? scheme.primary : scheme.border,
                backgroundColor:
                  option.state === computed.name ? scheme.surfaceAlt : 'transparent',
              },
            ]}
          >
            <Txt variant="caption" center numberOfLines={1}>
              {option.label}
            </Txt>
          </Interactive>
        ))}
      </View>

      <Txt variant="caption" color={scheme.textMuted}>
        The outlined one is Pip&apos;s guess. Agreeing is as useful an answer as disagreeing.
      </Txt>
    </Card>
  );
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  greetRow: { flexDirection: 'row', alignItems: 'center', marginTop: space[5] },
  greetText: { flex: 1, gap: space[0.5] },

  body: { paddingHorizontal: space[4], marginTop: -space[6], gap: space[3] },
  stateCard: { gap: space[3] },
  stateHead: { flexDirection: 'row', alignItems: 'center', gap: space[2.5] },
  stateBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  overdue: { gap: space[1.5], borderWidth: 1 },
  overdueHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  overdueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[2.5],
    borderWidth: 1,
    borderRadius: radius.md,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
  },

  checkIn: { gap: space[2.5] },
  checkInHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  feltRow: { flexDirection: 'row', gap: space[1.5] },
  felt: {
    flex: 1,
    paddingVertical: space[2],
    paddingHorizontal: space[1],
    borderWidth: 1,
    borderRadius: radius.md,
  },
  calibrated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    borderRadius: radius.lg,
    borderWidth: 1,
  },

  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    padding: space[3.5],
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  semibold: { fontWeight: '600' },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[2],
  },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: space[0.5], paddingVertical: space[1] },

  tiles: { flexDirection: 'row', gap: space[3] },
  legend: { flexDirection: 'row', gap: space[1.5], marginTop: space[1], flexWrap: 'wrap' },
  planFooter: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },
});
