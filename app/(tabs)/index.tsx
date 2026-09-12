import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Bell, CheckCircle2, ChevronRight, Clock, Flame, Inbox, Leaf } from 'lucide-react-native';

import {
  ForestHeader,
  Gauge,
  NotificationsDrawer,
  PipMascot,
  StatTile,
  StreakDrawer,
  TaskCard,
  onForest,
} from '@/components/app';
import { Card, Chip, EmptyState, IconButton, Interactive, Txt } from '@/components/ui';
import { formatEstimate } from '@/data/format';
import { useApp } from '@/store/AppStore';
import {
  useCapacity,
  useFocusTasks,
  useInboxCount,
  useNow,
  usePipState,
  useStreak,
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

  const { data, toggleTask, toggleSubtask, reload, toast } = useApp();
  const capacity = useCapacity();
  const pip = usePipState();
  const streak = useStreak();
  const focus = useFocusTasks();
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

  const completeTask = useCallback(
    (id: string, title: string, wasDone: boolean) => {
      Haptics.impactAsync(
        wasDone ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
      ).catch(() => {});
      toggleTask(id);
      if (!wasDone) {
        toast(`“${title.slice(0, 32)}${title.length > 32 ? '…' : ''}” done`, 'success', {
          label: 'Undo',
          run: () => toggleTask(id),
        });
      }
    },
    [toggleTask, toast],
  );

  // This Week — the two metrics from Figma 19:485, over the real 7-day series.
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
            <Gauge label="Vitality" value={capacity.vitality} kind="vitality" hint={capacity.vitalityNote} />
          </Card>

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

          {focus.length > 0 ? (
            focus.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                compact
                now={now}
                onPress={() => router.push(`/task/${task.id}`)}
                onToggle={() => completeTask(task.id, task.title, task.status === 'done')}
                onToggleSubtask={(subId) => {
                  Haptics.selectionAsync().catch(() => {});
                  toggleSubtask(task.id, subId);
                }}
              />
            ))
          ) : (
            <Card>
              <EmptyState
                icon={<CheckCircle2 size={28} color={status.success.solid} />}
                title="Nothing left for today"
                body="Your manifest is clear. Pip is going to be insufferable about this."
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
  stateHead: { flexDirection: 'row', alignItems: 'center', gap: space[2.5] },
  stateBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
});
