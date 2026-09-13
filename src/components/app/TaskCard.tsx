import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Card, Checkbox, Chip, Txt } from '@/components/ui';
import { formatClock, formatDue, formatEstimate, isOverdue } from '@/data/format';
import { loadPercent, nextAction, progress } from '@/data/derive';
import { useSchedule } from '@/store/selectors';
import { radius, space, status, useScheme } from '@/theme';
import type { Task } from '@/types';
import { ICONS } from './TaskIcon';

export interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onToggle: () => void;
  onToggleSubtask?: (subId: string) => void;
  /** Home's shorter form: no type icon, no sub-task row. */
  compact?: boolean;
  now?: Date;
}

/**
 * The task row. One component for Home's "Today's Focus" and the Manifest.
 *
 * Home and the Manifest each had their own copy of this before, which had
 * already drifted: one showed the context chip, the other the tag; one counted
 * sub-tasks, the other didn't. Exactly the "617 drift entries" pattern the
 * teardown found on the source site, reproduced at component scale.
 */
export function TaskCard({
  task,
  onPress,
  onToggle,
  onToggleSubtask,
  compact,
  now = new Date(),
}: TaskCardProps) {
  const scheme = useScheme();
  const Icon = ICONS[task.icon] ?? ICONS.FileText;
  const schedule = useSchedule();

  const next = nextAction(task);
  // The card's own small share of the plan: not just what is next, but when.
  const nextAt = next ? (schedule.get(next.id)?.startAt ?? null) : null;
  const { done, total } = progress(task);
  const overdue = task.status === 'open' && isOverdue(task.dueAt, now);
  const complete = task.status === 'done';

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={task.title}
      accessibilityHint={`${formatDue(task.dueAt, now)}. ${done} of ${total} sub-tasks done. Opens task detail.`}
      style={[styles.card, complete && styles.cardDone]}
    >
      <View style={styles.head}>
        <Checkbox
          checked={complete}
          indeterminate={!complete && done > 0}
          onToggle={onToggle}
          accessibilityLabel={complete ? `Re-open ${task.title}` : `Complete ${task.title}`}
        />

        {!compact ? (
          <View style={[styles.typeIcon, { backgroundColor: scheme.surfaceAlt }]}>
            <Icon size={15} color={scheme.primary} />
          </View>
        ) : null}

        <Txt
          variant="h4"
          style={[{ flex: 1 }, complete && styles.strike]}
          color={complete ? scheme.textMuted : undefined}
          numberOfLines={2}
        >
          {task.title}
        </Txt>
      </View>

      {next && !complete ? (
        <NextActionRow
          title={next.title}
          at={nextAt}
          onPress={onToggleSubtask ? () => onToggleSubtask(next.id) : undefined}
        />
      ) : null}

      <View style={styles.meta}>
        {task.tag ? <Chip label={task.tag} tone="success" size="sm" /> : null}

        {/*
          The word, not just the colour.

          This chip previously said "Tue, 5:00 PM" in red and nothing else, so
          "overdue" — the single most consequential fact on the card — was
          carried entirely by hue. The design system forbids exactly this, and
          red/grey is among the commonest confusions. The label now says it.
        */}
        <Chip
          label={overdue ? `Overdue · ${formatDue(task.dueAt, now)}` : formatDue(task.dueAt, now)}
          size="sm"
          tone={overdue ? 'danger' : 'neutral'}
        />

        <Chip label={formatEstimate(task.estimateMin)} size="sm" />

        {total > 0 ? (
          <Chip
            label={`${done}/${total} subtasks`}
            size="sm"
            tone={done === total && total > 0 ? 'success' : 'neutral'}
          />
        ) : null}

        {!complete ? (
          <Txt variant="caption" color={status.warning.fg}>
            +{loadPercent(task)}% load
          </Txt>
        ) : null}
      </View>
    </Card>
  );
}

/**
 * The "next action" preview. Tappable where a handler is supplied, because the
 * whole point of surfacing one sub-task is that it is the thing to do next —
 * making the user open the detail sheet to tick it defeats it.
 */
function NextActionRow({
  title,
  at,
  onPress,
}: {
  title: string;
  at: string | null;
  onPress?: () => void;
}) {
  const scheme = useScheme();

  /*
     Grouped even when it is not pressable.
     Without `onPress` this returned a bare View, so the chevron, the time and
     the title announced as three stops for one instruction. The pressable
     branch below already groups itself via `Card`.
  */
  const body = (
    <View
      accessible
      accessibilityLabel={at ? `Next: ${title}, at ${formatClock(at)}` : `Next: ${title}`}
      style={[styles.next, { backgroundColor: scheme.surfaceAlt }]}
    >
      <ChevronRight size={14} color={scheme.textMuted} />
      {at ? (
        <Txt variant="caption" color={scheme.primary}>
          {formatClock(at)}
        </Txt>
      ) : null}
      <Txt variant="bodySm" muted numberOfLines={1} style={{ flex: 1 }}>
        {title}
      </Txt>
    </View>
  );

  if (!onPress) return body;

  return (
    <Card
      padded={false}
      onPress={onPress}
      accessibilityLabel={`Complete next step: ${title}`}
      style={styles.nextWrap}
    >
      {body}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[2.5] },
  cardDone: { opacity: 0.62 },
  strike: { textDecorationLine: 'line-through' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  typeIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextWrap: { borderWidth: 0, backgroundColor: 'transparent', borderRadius: radius.pill },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingVertical: space[1.5],
    paddingHorizontal: space[2.5],
    borderRadius: radius.pill,
  },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[1.5] },
});
