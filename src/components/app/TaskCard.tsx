import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Code,
  Dumbbell,
  FileText,
  Mail,
  ShoppingCart,
  Sparkles,
  Users,
} from 'lucide-react-native';

import { Card, Checkbox, Chip, Txt } from '@/components/ui';
import { formatDue, formatEstimate, isOverdue } from '@/data/format';
import { loadPercent, nextAction, progress } from '@/data/derive';
import { radius, space, status, useScheme } from '@/theme';
import type { IconName, Task } from '@/types';

/** The only place a stored `IconName` becomes a component. */
const ICONS: Record<IconName, typeof Code> = {
  CalendarDays,
  Code,
  FileText,
  BookOpen,
  Mail,
  ShoppingCart,
  Dumbbell,
  Users,
  Sparkles,
};

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
  const Icon = ICONS[task.icon] ?? FileText;

  const next = nextAction(task);
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
          onPress={onToggleSubtask ? () => onToggleSubtask(next.id) : undefined}
        />
      ) : null}

      <View style={styles.meta}>
        {task.tag ? <Chip label={task.tag} tone="success" size="sm" /> : null}

        <Chip
          label={formatDue(task.dueAt, now)}
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
function NextActionRow({ title, onPress }: { title: string; onPress?: () => void }) {
  const scheme = useScheme();

  const body = (
    <View style={[styles.next, { backgroundColor: scheme.surfaceAlt }]}>
      <ChevronRight size={14} color={scheme.textMuted} />
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
