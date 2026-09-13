import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ChevronDown, EyeOff, UserPlus } from 'lucide-react-native';

import { PipMascot } from '@/components/app';
import { Avatar, Button, EmptyState, IconButton, Interactive, Screen, Txt } from '@/components/ui';
import { formatEstimate } from '@/data/format';
import { useApp } from '@/store/AppStore';
import { useTask, useTeammates } from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { DayRecord, PipStateName, Teammate } from '@/types';

/** Each state's dot colour. The only thing a teammate's week is allowed to say. */
const STATE_TONE: Record<PipStateName, { solid: string; fg: string; label: string }> = {
  balanced: { solid: status.success.solid, fg: status.success.fg, label: 'Balanced' },
  strained: { solid: status.warning.solid, fg: status.warning.fg, label: 'Strained' },
  wilting: { solid: status.warning.solid, fg: status.warning.fg, label: 'Wilting' },
  depleted: { solid: status.danger.solid, fg: status.danger.fg, label: 'Depleted' },
  critical: { solid: status.danger.solid, fg: status.danger.fg, label: 'Critical' },
};

/**
 * Who takes this step.
 *
 * Reached from two places with different notions of "this step": the review
 * sheet, where the work is still a proposal and nothing has been committed
 * (`proposalId` + `subId`), and task detail, where it is a real sub-task
 * (`taskId` + `subId`). The screen is the same either way; only where the
 * answer gets written differs.
 *
 * The ordering is deliberate — state first, name second. A list of names with
 * status hidden behind a tap would let you hand ninety minutes to the person
 * least able to take it without ever seeing that you had.
 */
export default function DelegateScreen() {
  const { taskId, proposalId, subId } = useLocalSearchParams<{
    taskId?: string;
    proposalId?: string;
    subId: string;
  }>();
  const router = useRouter();
  const scheme = useScheme();

  const { state, delegateSubtask, delegateProposedSubtask, toast } = useApp();
  const teammates = useTeammates();
  const task = useTask(taskId);

  /** Expanded rows. Touch has no hover, so the week is a press-and-hold. */
  const [expanded, setExpanded] = useState<string[]>([]);

  const step = useMemo(() => {
    if (task) {
      const sub = task.subtasks.find((s) => s.id === subId);
      return sub ? { title: sub.title, estimateMin: sub.estimateMin, assigned: sub.delegatedTo } : null;
    }
    const proposal = state.review?.proposed.find((p) => p.id === proposalId);
    const sub = proposal?.subtasks.find((s) => s.id === subId);
    return sub ? { title: sub.title, estimateMin: sub.estimateMin, assigned: sub.delegatedTo } : null;
  }, [task, state.review, proposalId, subId]);

  const choose = useCallback(
    (to: string | null) => {
      if (taskId) delegateSubtask(taskId, subId, to);
      else if (proposalId) delegateProposedSubtask(proposalId, subId, to);

      const name = teammates.find((m) => m.id === to)?.name;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast(name ? `Handed to ${name}` : 'Taken back', name ? 'success' : 'neutral');
      router.back();
    },
    [taskId, proposalId, subId, delegateSubtask, delegateProposedSubtask, teammates, toast, router],
  );

  if (!step) {
    return (
      <Screen>
        <EmptyState
          icon={<UserPlus size={28} color={scheme.textMuted} />}
          title="Nothing to hand over"
          body="This step may have been committed, dropped, or already completed."
          action={{ label: 'Go back', onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.head}>
        <IconButton
          icon={<ArrowLeft size={18} color={scheme.text} />}
          accessibilityLabel="Go back"
          size={40}
          onPress={() => router.back()}
        />
        <View style={{ flex: 1, gap: space[0.5] }}>
          <Txt variant="h3" numberOfLines={2}>
            Who&apos;s taking this?
          </Txt>
          <Txt variant="caption" muted numberOfLines={2}>
            {step.title} · {formatEstimate(step.estimateMin)}
          </Txt>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Txt variant="caption" muted style={styles.eyebrow}>
          YOUR TEAM
        </Txt>

        <View style={[styles.list, { borderColor: scheme.border }]}>
          {teammates.map((mate, i) => (
            <TeammateRow
              key={mate.id}
              mate={mate}
              first={i === 0}
              selected={step.assigned === mate.id}
              open={expanded.includes(mate.id)}
              onAssign={() => choose(mate.id)}
              onToggle={() =>
                setExpanded((prev) =>
                  prev.includes(mate.id)
                    ? prev.filter((id) => id !== mate.id)
                    : [...prev, mate.id],
                )
              }
            />
          ))}
        </View>

        {step.assigned ? (
          <Interactive
            accessibilityRole="button"
            accessibilityLabel="Take this step back"
            onPress={() => choose(null)}
            radius="md"
            style={[styles.takeBack, { borderColor: scheme.border }]}
          >
            <Txt variant="label" color={scheme.textSecondary}>
              Take it back
            </Txt>
          </Interactive>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/**
 * One teammate.
 *
 * Two separate targets, because they are two separate decisions: the row body
 * opens their week (how are they doing?), the Assign button hands the work over
 * (do it anyway). Collapsing both into one tap made looking someone up
 * indistinguishable from giving them ninety minutes of work.
 */
function TeammateRow({
  mate,
  first,
  selected,
  open,
  onAssign,
  onToggle,
}: {
  mate: Teammate;
  first: boolean;
  selected: boolean;
  open: boolean;
  onAssign: () => void;
  onToggle: () => void;
}) {
  const scheme = useScheme();
  const tone = mate.state ? STATE_TONE[mate.state] : null;

  return (
    <View style={!first ? { borderTopWidth: 1, borderTopColor: scheme.border } : undefined}>
      <View style={styles.row}>
        <Interactive
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${mate.name}. ${tone ? tone.label : 'Status not shared'}.`}
          accessibilityHint={mate.sharesState ? "Opens this week's numbers" : undefined}
          onPress={onToggle}
          radius="md"
          noScale
          style={styles.rowBody}
        >
          <Avatar initials={mate.initials} size={36} />

          <View style={{ flex: 1, gap: space[0.5] }}>
            <Txt variant="body">{mate.name}</Txt>

            {tone ? (
              <View style={styles.stateRow}>
                <View style={[styles.dot, { backgroundColor: tone.solid }]} />
                <Txt variant="caption" color={tone.fg}>
                  {tone.label}
                </Txt>
              </View>
            ) : (
              // Not "unknown" — they made a choice, and the screen should read
              // as respecting it rather than as a gap in the data.
              <View style={styles.stateRow}>
                <EyeOff size={11} color={scheme.textMuted} />
                <Txt variant="caption" color={scheme.textMuted}>
                  Not sharing
                </Txt>
              </View>
            )}
          </View>

          {mate.sharesState ? (
            <ChevronDown
              size={16}
              color={scheme.textMuted}
              style={open ? styles.chevronOpen : undefined}
            />
          ) : null}
        </Interactive>

        <Button
          label={selected ? 'Assigned' : 'Assign'}
          size="sm"
          variant={selected ? 'primary' : 'secondary'}
          onPress={onAssign}
        />
      </View>

      {open && mate.sharesState ? <WeekPanel mate={mate} /> : null}
    </View>
  );
}

const DAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * The expanded panel: how this person is actually doing.
 *
 * Their Pip is the headline because it is the reading a student already knows
 * how to interpret; the seven days of numbers underneath are what justifies it.
 * Today is the rightmost column and is drawn at full strength — the rest of the
 * week is context for it, not seven equally important facts.
 */
function WeekPanel({ mate }: { mate: Teammate }) {
  const scheme = useScheme();
  const tone = mate.state ? STATE_TONE[mate.state] : null;

  return (
    <View style={[styles.week, { backgroundColor: scheme.surfaceAlt }]}>
      <View style={styles.pipRow}>
        <PipMascot size={56} state={mate.state ?? 'balanced'} />
        <View style={{ flex: 1, gap: space[0.5] }}>
          {tone ? (
            <Txt variant="h4" color={tone.fg}>
              {tone.label}
            </Txt>
          ) : null}
          <Txt variant="caption" muted>
            {mate.name}&apos;s last seven days
          </Txt>
        </View>
      </View>

      <WeekRow
        label="Pressure"
        week={mate.week}
        pick={(d) => d.pressure}
        tone={status.warning.solid}
      />
      <WeekRow
        label="Vitality"
        week={mate.week}
        pick={(d) => d.vitality}
        tone={status.success.solid}
      />
    </View>
  );
}

function WeekRow({
  label,
  week,
  pick,
  tone,
}: {
  label: string;
  week: DayRecord[];
  pick: (d: DayRecord) => number;
  tone: string;
}) {
  const scheme = useScheme();
  const values = week.map(pick);

  return (
    <View style={{ gap: space[1] }}>
      <Txt variant="caption" muted>
        {label}
      </Txt>
      <View
        style={styles.bars}
        accessible
        accessibilityLabel={`${label} over the last seven days: ${values.join(', ')}`}
      >
        {week.map((day, i) => {
          const v = Math.min(100, Math.max(0, pick(day)));
          const today = i === week.length - 1;
          return (
            <View key={day.date} style={styles.barCol}>
              <Txt variant="caption" color={today ? scheme.text : scheme.textMuted}>
                {v}
              </Txt>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      // Floored so a quiet day is a visible mark rather than an
                      // ambiguous absence.
                      height: Math.max(3, Math.round((v / 100) * 40)),
                      backgroundColor: tone,
                      opacity: today ? 1 : 0.4,
                    },
                  ]}
                />
              </View>
              <Txt variant="caption" color={scheme.textMuted}>
                {DAY_INITIAL[new Date(day.date).getDay()]}
              </Txt>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingTop: space[2],
    paddingBottom: space[3],
  },
  scroll: { paddingHorizontal: space[4], paddingBottom: space[8], gap: space[2] },
  eyebrow: { letterSpacing: 0.8 },
  list: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingRight: space[3] },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
  },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  week: { paddingHorizontal: space[3], paddingBottom: space[3], gap: space[3] },
  pipRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: space[1] },
  barCol: { flex: 1, alignItems: 'center', gap: space[0.5] },
  barTrack: { height: 40, justifyContent: 'flex-end' },
  bar: { width: 14, borderRadius: radius.sm },
  takeBack: {
    marginTop: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: space[3],
    alignItems: 'center',
  },
});
