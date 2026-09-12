import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Check, EyeOff, UserPlus } from 'lucide-react-native';

import { Avatar, EmptyState, IconButton, Interactive, Screen, Txt } from '@/components/ui';
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
        <View style={{ flex: 1, gap: 2 }}>
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
              onPress={() => choose(mate.id)}
              onLongPress={() =>
                setExpanded((prev) =>
                  prev.includes(mate.id)
                    ? prev.filter((id) => id !== mate.id)
                    : [...prev, mate.id],
                )
              }
            />
          ))}
        </View>

        <Txt variant="caption" muted style={styles.footnote}>
          Press and hold someone to see how their last week has gone. Pip only ever shows the
          shape of it — never their numbers, and never what they&apos;re working on.
        </Txt>

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

function TeammateRow({
  mate,
  first,
  selected,
  open,
  onPress,
  onLongPress,
}: {
  mate: Teammate;
  first: boolean;
  selected: boolean;
  open: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scheme = useScheme();
  const tone = mate.state ? STATE_TONE[mate.state] : null;

  return (
    <View style={!first ? { borderTopWidth: 1, borderTopColor: scheme.border } : undefined}>
      <Interactive
        accessibilityRole="button"
        accessibilityLabel={
          `${mate.name}. ` +
          (tone ? `${tone.label}. ` : 'Status not shared. ') +
          (mate.sharesState ? 'Press and hold for their week.' : '')
        }
        onPress={onPress}
        onLongPress={mate.sharesState ? onLongPress : undefined}
        radius="md"
        noScale
        style={styles.row}
      >
        <Avatar initials={mate.initials} size={36} />

        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="body">{mate.name}</Txt>

          {tone ? (
            <View style={styles.stateRow}>
              <View style={[styles.dot, { backgroundColor: tone.solid }]} />
              <Txt variant="caption" color={tone.fg}>
                {tone.label}
              </Txt>
            </View>
          ) : (
            // Not "unknown" — they made a choice, and the screen should read as
            // respecting it rather than as a gap in the data.
            <View style={styles.stateRow}>
              <EyeOff size={11} color={scheme.textDisabled} />
              <Txt variant="caption" color={scheme.textDisabled}>
                Not sharing
              </Txt>
            </View>
          )}
        </View>

        {selected ? <Check size={18} color={scheme.primary} /> : null}
      </Interactive>

      {open && mate.week.length > 0 ? <WeekStrip week={mate.week} /> : null}
    </View>
  );
}

/**
 * Seven days as two rows of bars.
 *
 * Heights are normalised within the strip and carry no axis, no figures and no
 * task detail — enough to see "this has been climbing all week", not enough to
 * audit someone. That restraint is the whole reason a teammate would turn
 * sharing on at all.
 */
function WeekStrip({ week }: { week: DayRecord[] }) {
  const scheme = useScheme();

  return (
    <View style={[styles.week, { backgroundColor: scheme.surfaceAlt }]}>
      <WeekRow label="Pressure" values={week.map((d) => d.pressure)} tone={status.warning.solid} />
      <WeekRow label="Vitality" values={week.map((d) => d.vitality)} tone={status.success.solid} />
    </View>
  );
}

function WeekRow({ label, values, tone }: { label: string; values: number[]; tone: string }) {
  const scheme = useScheme();

  return (
    <View style={styles.weekRow}>
      <Txt variant="caption" muted style={{ width: 58 }}>
        {label}
      </Txt>
      <View style={styles.bars} accessible accessibilityLabel={`${label} over the last seven days`}>
        {values.map((v, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                // Floored so a quiet day is still a visible mark rather than
                // an ambiguous absence.
                height: Math.max(4, Math.round((Math.min(100, Math.max(0, v)) / 100) * 36)),
                backgroundColor: tone,
                opacity: i === values.length - 1 ? 1 : 0.45,
              },
            ]}
          />
        ))}
      </View>
      <Txt variant="caption" color={scheme.textDisabled}>
        7d
      </Txt>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  week: { paddingHorizontal: space[3], paddingBottom: space[3], gap: space[2] },
  weekRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
  // Capped width so seven days read as a trend rather than as seven bricks.
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: space[1], height: 36 },
  bar: { flex: 1, maxWidth: 28, borderRadius: 3 },
  footnote: { marginTop: space[1], lineHeight: 17 },
  takeBack: {
    marginTop: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: space[3],
    alignItems: 'center',
  },
});
