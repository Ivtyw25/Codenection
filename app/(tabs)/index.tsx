import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Bell,
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
import { Card, Chip, EmptyState, IconButton, Interactive, Txt } from '@/components/ui';
import {
  CHECKIN_OPENER,
  closingLine,
  followUp,
  type CheckInReply,
  type CheckInTurn,
} from '@/data/calibration';
import { formatEstimate } from '@/data/format';
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
import type { PipState, PipStateName } from '@/types';

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

  const { data, toggleTask, toggleSubtask, recordFeeling, reload, toast } = useApp();
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

            And asked only in the EVENING. "How was today?" at 9am is not a
            question, it is a prompt to invent an answer — the one input in this
            app that is not a derivation would be a prediction dressed as a
            report. Before nine it is not shown at all.
          */}
          {!checkIn.answered && checkIn.open ? (
            <CheckInCard
              computed={pip}
              pressure={capacity.pressure}
              vitality={capacity.vitality}
              onAnswer={(felt) => {
                recordFeeling(felt, pip.name, capacity.pressure, capacity.vitality);
              }}
            />
          ) : checkIn.answered && checkIn.note ? (
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

    </View>
  );
}

/**
 * The evening check-in, as a conversation.
 *
 * ── Why Pip goes first ─────────────────────────────────────────────────────
 *
 * The card opens by stating its own read and the two numbers behind it. Asking
 * "how do you feel?" cold collects a mood; asking it next to a stated
 * prediction collects a *correction*, which is the only thing this is for. It
 * also matters who is exposed: a tool that asks you to rate yourself is doing
 * something quite different from one that says what it thinks and invites you
 * to disagree with it.
 *
 * ── Why it asks twice ──────────────────────────────────────────────────────
 *
 * Because the first answer is usually the easy one. "Fine" is what anybody taps
 * at the end of a hard day, since it closes the card fastest — and one word
 * cannot separate a productive day that cost a lot from an empty one that cost
 * more, which are different states the calibration would learn the wrong thing
 * from. The follow-up asks something concrete (did you actually stop? was any
 * of it yours? did you sleep?) and is allowed to overrule the first answer.
 *
 * ── Why it stops at two ────────────────────────────────────────────────────
 *
 * This is a tired person at 9pm. An interview is a worse instrument than a
 * single question, because it gets abandoned — and an abandoned check-in
 * collects nothing at all. Two turns, then it tells them what it recorded and
 * gets out of the way.
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

  /** Nothing said yet / opener answered / finished. */
  const [turn, setTurn] = useState<CheckInTurn>(CHECKIN_OPENER);
  const [said, setSaid] = useState<string[]>([]);
  const [settled, setSettled] = useState<PipStateName | null>(null);
  const [done, setDone] = useState(false);

  const answer = (reply: CheckInReply) => {
    Haptics.selectionAsync().catch(() => {});
    const felt = reply.felt ?? settled ?? computed.name;
    setSaid((s) => [...s, reply.ack]);
    setSettled(felt);

    if (turn.id === CHECKIN_OPENER.id) {
      setTurn(followUp(felt));
      return;
    }

    // Second answer settles it. Recorded once, at the end, so a conversation
    // somebody abandons halfway does not write a half-formed reading.
    onAnswer(felt);
    setDone(true);
  };

  return (
    <Card style={styles.checkIn}>
      <View style={styles.checkInHead}>
        <SlidersHorizontal size={16} color={scheme.primary} />
        <Txt variant="h4" style={{ flex: 1 }}>
          {done ? 'Logged for today' : 'End of day'}
        </Txt>
      </View>

      {/* Pip's read, stated before anything is asked. */}
      {said.length === 0 ? (
        <Txt variant="bodySm" muted>
          Pip has today as{' '}
          <Txt variant="bodySm" style={styles.semibold}>
            {computed.label.toLowerCase()}
          </Txt>{' '}
          — pressure {pressure}, reserve {vitality}. That is counted off your task list, which can
          only ever be half of it.
        </Txt>
      ) : null}

      {/* What has been said so far, so the thread reads as one exchange. */}
      {said.map((line, i) => (
        <View key={i} style={[styles.ack, { borderLeftColor: scheme.primary }]}>
          <Txt variant="caption" color={scheme.textSecondary}>
            {line}
          </Txt>
        </View>
      ))}

      {done && settled ? (
        <Txt variant="caption" color={scheme.textMuted}>
          {closingLine(settled, computed.name)}
        </Txt>
      ) : (
        <>
          <Txt variant="bodySm">{turn.prompt}</Txt>

          <View style={styles.replies}>
            {turn.replies.map((reply) => (
              <Interactive
                key={reply.id}
                accessibilityRole="button"
                accessibilityLabel={reply.label}
                onPress={() => answer(reply)}
                radius="md"
                style={[
                  styles.reply,
                  {
                    // Pip's own guess is outlined on the opening turn only —
                    // marking a "suggested" answer to the follow-up would be
                    // the app leading the witness on the question that exists
                    // precisely to catch it being wrong.
                    borderColor:
                      turn.id === CHECKIN_OPENER.id && reply.felt === computed.name
                        ? scheme.primary
                        : scheme.border,
                  },
                ]}
              >
                <Txt variant="bodySm" style={{ flex: 1 }}>
                  {reply.label}
                </Txt>
                <ChevronRight size={15} color={scheme.textMuted} />
              </Interactive>
            ))}
          </View>
        </>
      )}
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


  checkIn: { gap: space[2.5] },
  checkInHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  replies: { gap: space[1.5] },
  reply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[2.5],
    paddingHorizontal: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
  },
  // Pip's acknowledgements, marked as a quoted aside rather than as more body
  // copy — the thread has to read as an exchange, not as a paragraph that grew.
  ack: { borderLeftWidth: 2, paddingLeft: space[2.5], paddingVertical: space[0.5] },
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
