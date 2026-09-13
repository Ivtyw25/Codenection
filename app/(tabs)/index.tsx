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
  Scale,
} from 'lucide-react-native';

import {
  ForecastRow,
  ForestHeader,
  Gauge,
  LoadBreakdown,
  NotificationsDrawer,
  PipMascot,
  StatTile,
  StreakDrawer,
  Timeline,
  onForest,
} from '@/components/app';
import { Card, Chip, EmptyState, IconButton, Interactive, Txt } from '@/components/ui';
import { formatEstimate } from '@/data/format';
import { useApp } from '@/store/AppStore';
import type { Slot } from '@/store/selectors';
import {
  useCapacity,
  useForecast,
  useInboxCount,
  useLoadBreakdown,
  useNow,
  useRebalancePlan,
  usePipState,
  useStreak,
  useTodayTimeline,
  useUnreadCount,
  useWeekSeries,
} from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';

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

  const { data, toggleTask, toggleSubtask, reload, toast, setQuery } = useApp();
  const capacity = useCapacity();
  const breakdown = useLoadBreakdown();
  const plan = useRebalancePlan();
  const forecast = useForecast();
  const pip = usePipState();
  const streak = useStreak();
  const today = useTodayTimeline();
  const week = useWeekSeries();
  const unread = useUnreadCount();
  const inboxCount = useInboxCount();

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

            <Gauge label="Pressure" value={capacity.pressure} kind="pressure" hint={capacity.pressureNote} />

            {/*
              Directly under the number it explains, not on a screen of its
              own. A student who can see 64 and cannot see what the 64 is made
              of has been told they are struggling and given nothing to do
              about it — which is the exact failure mode this app exists to
              avoid. Two rows here; the rest live on the Pip tab.
            */}
            {breakdown.slices.length > 0 ? (
              <View style={styles.breakdown}>
                <LoadBreakdown
                  total={breakdown.total}
                  slices={breakdown.slices}
                  limit={2}
                  onPressCategory={(categoryId) => {
                    setQuery({ categoryId, range: 'all' });
                    router.push('/tasks');
                  }}
                />
              </View>
            ) : null}

            <Gauge label="Vitality" value={capacity.vitality} kind="vitality" hint={capacity.vitalityNote} />

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
            ── The Rebalancer's only entry point ──────────────────────────

            Shown ONLY when `planRebalance` has both triggered and actually
            found something safe to move. A permanent "Rebalance" button would
            be an accusation sitting on the home screen every day of an ordinary
            week; and offering the flow when the engine has nothing to propose
            would walk a struggling student into an empty room.

            It is phrased as an offer with the relief already priced, not as an
            alert. "Pip found 5 moves" — not "You are overloaded".
          */}
          {plan.triggered && plan.moves.length > 0 ? (
            <Interactive
              accessibilityRole="button"
              accessibilityLabel={`Pip found ${plan.moves.length} ${plan.moves.length === 1 ? 'move' : 'moves'} that would take ${plan.before - plan.after} points off your week. Review them.`}
              onPress={() => router.push('/rebalance')}
              radius="lg"
              style={[
                styles.rebalance,
                { backgroundColor: status.warning.bg, borderColor: status.warning.solid },
              ]}
            >
              <Scale size={18} color={status.warning.fg} />
              <View style={{ flex: 1, gap: space[0.5] }}>
                <Txt variant="h4" color={status.warning.fg}>
                  This week is over its limits
                </Txt>
                <Txt variant="caption" color={status.warning.fg}>
                  {`Pip found ${plan.moves.length} ${plan.moves.length === 1 ? 'move' : 'moves'} worth ${plan.before - plan.after} points. Nothing happens until you say so.`}
                </Txt>
              </View>
              <ChevronRight size={18} color={status.warning.fg} />
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
  // Inset and hairline-separated, so the rows read as an explanation OF the
  // gauge above rather than as a third gauge of their own.
  breakdown: { marginTop: -space[1], marginLeft: space[1] },
  stateHead: { flexDirection: 'row', alignItems: 'center', gap: space[2.5] },
  stateBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rebalance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2.5],
    padding: space[3.5],
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
