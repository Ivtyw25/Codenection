import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Interactive, Sheet, Txt } from '@/components/ui';
import { formatDue, startOfDay } from '@/data/format';
import { radius, space, useScheme } from '@/theme';
import type { Task } from '@/types';

export interface ReassignSheetProps {
  /** The task being re-dated, or null while the sheet is shut. */
  task: Task | null;
  now: Date;
  onClose: () => void;
  onPick: (to: Date) => void;
}

/**
 * Giving a task a new date.
 *
 * ── Why relative options and not a calendar ────────────────────────────────
 *
 * The question actually being answered is "when will I really do this?", and
 * the honest answers to that are tonight, in the morning, at the weekend, next
 * week — not the 14th. A date grid makes the student translate an intention
 * into a number, which is a decision-cost this sheet exists to remove, and the
 * day their work is already late is the worst possible moment to charge it.
 *
 * ── Why it lives here rather than on Home ──────────────────────────────────
 *
 * Overdue work no longer appears in Today's Focus at all — it is not a block of
 * time, it is an unanswered question, and the scheduler stopped pretending
 * otherwise. The two places it now gets answered are the Rebalancer, which
 * guarantees a proposal for every late task, and the task's own detail screen,
 * which is where somebody lands when they tap the thing they have been
 * avoiding. This sheet is what that tap opens, so it is shared rather than
 * owned by a screen.
 */
export function ReassignSheet({ task, now, onClose, onPick }: ReassignSheetProps) {
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
            ? `“${task.title}” was due ${formatDue(task.dueAt, now)}. Pick when it is actually happening — it stops being overdue as soon as it has a date it can still meet, and goes back on your plan.`
            : ''}
        </Txt>

        {options.map((option) => (
          <Interactive
            key={option.label}
            accessibilityRole="button"
            accessibilityLabel={`${option.label}. ${option.hint}.`}
            onPress={() => onPick(option.date)}
            radius="md"
            style={[styles.option, { borderColor: scheme.border }]}
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

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
  },
});
